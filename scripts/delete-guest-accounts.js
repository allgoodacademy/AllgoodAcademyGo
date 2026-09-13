#!/usr/bin/env node
// Cleans up guest/anonymous accounts (no real email on file) that are internal test data
// or long-abandoned test-driving, not real product usage.
//
// Two independent rules decide what gets targeted — an account matching EITHER is deleted:
//
//   1. --since (default 2026-09-03, the day the recruit-code passphrase flow shipped):
//      every anonymous account CREATED ON OR AFTER this date. Anonymous logins before this
//      date predate the passphrase flow entirely and might be real early visitors, so they
//      are only caught by rule 2 below, not this one.
//
//   2. --stale-days (default 90): any anonymous account older than this with ZERO
//      completion data (no module_progress docs at all) — long-abandoned test-driving or a
//      guest who never did anything, regardless of when it was created.
//
// A handful of anonymous accounts carry role "teacher" (a classroom-code flow, separate
// from the recruit-code passphrase) — a real teacher could pilot the platform this way
// without ever giving an email, so these are NOT auto-excluded, but every dry run lists
// them in their own section so you can eyeball them before going live.
//
// For each targeted account this deletes:
//   - artifacts/{appId}/users/{uid}                        (and its recruitCode field)
//   - artifacts/{appId}/users/{uid}/module_progress/*
//   - artifacts/{appId}/users/{uid}/continuity_bank/*
//   - artifacts/{appId}/users/{uid}/comms_receipts/*
//   - artifacts/{appId}/users/{uid}/comms_state/*
//   - artifacts/{appId}/recruit_codes/{code}               (code taken from the user doc)
//   - artifacts/{appId}/events            where uid == uid
//   - artifacts/{appId}/sessions          where uid == uid
//   - artifacts/{appId}/course_feedback   where uid == uid
//   - artifacts/{appId}/topic_selections  where uid == uid
//   - artifacts/{appId}/messages          where uid == uid
//   - the Firebase Auth user itself
//
// Requires the firebase-admin package (not a repo dependency today — install with
// `npm install firebase-admin --no-save` before running) and a service-account
// credential reachable via GOOGLE_APPLICATION_CREDENTIALS, same as prune-telemetry.js.
//
// Usage:
//   node scripts/delete-guest-accounts.js                    # dry run — reports only
//   node scripts/delete-guest-accounts.js --live              # actually deletes
//   node scripts/delete-guest-accounts.js --since=2026-09-03 --stale-days=90
//   node scripts/delete-guest-accounts.js --live --keep-uid=abc123,def456
//
// DRY RUN IS THE DEFAULT. Deleting an Auth account is not reversible the way an aged-out
// telemetry row is — you must pass --live to delete anything.

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const SUBCOLLECTIONS = ['module_progress', 'continuity_bank', 'comms_receipts', 'comms_state'];
const UID_FIELD_COLLECTIONS = ['events', 'sessions', 'course_feedback', 'topic_selections', 'messages'];
const BATCH_SIZE = 400;
const DEFAULT_SINCE = '2026-09-03';
const DEFAULT_STALE_DAYS = 90;

function parseArgs(argv) {
  const args = {
    live: false,
    appId: 'allgood-academy',
    keepUids: new Set(),
    since: DEFAULT_SINCE,
    staleDays: DEFAULT_STALE_DAYS,
  };
  for (const raw of argv.slice(2)) {
    if (raw === '--live') args.live = true;
    else if (raw.startsWith('--app-id=')) args.appId = raw.slice('--app-id='.length);
    else if (raw.startsWith('--since=')) args.since = raw.slice('--since='.length);
    else if (raw.startsWith('--stale-days=')) args.staleDays = Number(raw.slice('--stale-days='.length));
    else if (raw.startsWith('--keep-uid=')) {
      for (const uid of raw.slice('--keep-uid='.length).split(',')) {
        if (uid) args.keepUids.add(uid);
      }
    }
  }
  if (!Number.isFinite(args.staleDays) || args.staleDays <= 0) {
    throw new Error(`--stale-days must be a positive number, got: ${args.staleDays}`);
  }
  return args;
}

// Retries a Firestore/Auth call on transient RESOURCE_EXHAUSTED (quota) errors with backoff.
// The Firestore per-minute read quota is easy to trip when scanning many accounts back to
// back; this is not a sign anything is wrong with the data.
async function withRetry(fn, { attempts = 5, baseDelayMs = 1000 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      const isQuotaError = err && (err.code === 8 || /RESOURCE_EXHAUSTED/.test(err.message || ''));
      if (!isQuotaError || attempt >= attempts) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.log(`[delete-guest-accounts]   quota hit, retrying in ${delay}ms (attempt ${attempt}/${attempts})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function listAllAnonymousUsers(auth) {
  const anonymous = [];
  let pageToken;
  do {
    const page = await withRetry(() => auth.listUsers(1000, pageToken));
    for (const user of page.users) {
      if (user.providerData.length === 0) anonymous.push(user);
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return anonymous;
}

// Decides, for one anonymous Auth user, whether either targeting rule applies. Returns
// null if neither matches (account is left alone).
async function classifyUser(db, appId, user, { sinceDate, staleCutoff }) {
  const createdAt = new Date(user.metadata.creationTime);
  const reasons = [];

  if (createdAt >= sinceDate) reasons.push('created-since-cutoff');

  if (createdAt < staleCutoff) {
    const userRef = db.collection('artifacts').doc(appId).collection('users').doc(user.uid);
    const progressSnap = await withRetry(() => userRef.collection('module_progress').limit(1).get());
    if (progressSnap.empty) reasons.push('stale-no-completion');
  }

  if (reasons.length === 0) return null;

  const userSnap = await withRetry(() =>
    db.collection('artifacts').doc(appId).collection('users').doc(user.uid).get()
  );
  const role = userSnap.exists ? userSnap.get('role') : null;
  const recruitCode = userSnap.exists ? userSnap.get('recruitCode') : null;

  return { uid: user.uid, createdAt, reasons, role, recruitCode };
}

async function deleteDocsInBatches(db, refs, { live, label }) {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    if (!live) continue;
    await withRetry(async () => {
      const batch = db.batch();
      for (const ref of chunk) batch.delete(ref);
      await batch.commit();
    });
  }
  if (refs.length > 0) {
    console.log(`[delete-guest-accounts]   ${live ? 'deleted' : 'would delete'} ${refs.length} ${label} doc(s)`);
  }
}

async function deleteAccount(db, { appId, uid, recruitCode, live }) {
  const userRef = db.collection('artifacts').doc(appId).collection('users').doc(uid);
  const userSnap = await withRetry(() => userRef.get());

  for (const sub of SUBCOLLECTIONS) {
    const snap = await withRetry(() => userRef.collection(sub).get());
    await deleteDocsInBatches(db, snap.docs.map((d) => d.ref), { live, label: `users/${uid}/${sub}` });
  }

  if (userSnap.exists) {
    await deleteDocsInBatches(db, [userRef], { live, label: 'users' });
  }

  if (recruitCode) {
    const codeRef = db.collection('artifacts').doc(appId).collection('recruit_codes').doc(recruitCode);
    await deleteDocsInBatches(db, [codeRef], { live, label: 'recruit_codes' });
  }

  for (const collectionName of UID_FIELD_COLLECTIONS) {
    const colRef = db.collection('artifacts').doc(appId).collection(collectionName);
    const snap = await withRetry(() => colRef.where('uid', '==', uid).get());
    await deleteDocsInBatches(db, snap.docs.map((d) => d.ref), { live, label: collectionName });
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
    throw new Error(
      'No credential found. Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON file.'
    );
  }

  const sinceDate = new Date(`${args.since}T00:00:00Z`);
  if (Number.isNaN(sinceDate.getTime())) throw new Error(`--since is not a valid date: ${args.since}`);
  const staleCutoff = new Date(Date.now() - args.staleDays * 24 * 60 * 60 * 1000);

  initializeApp({ credential: applicationDefault() });
  const auth = getAuth();
  const db = getFirestore();

  console.log(
    `[delete-guest-accounts] app=${args.appId} mode=${args.live ? 'LIVE — WILL DELETE' : 'DRY RUN (no deletes)'} ` +
    `since=${args.since} staleDays=${args.staleDays}` +
    (args.keepUids.size ? ` keeping=${[...args.keepUids].join(',')}` : '')
  );

  const anonymousUsers = await listAllAnonymousUsers(auth);
  console.log(`[delete-guest-accounts] scanning ${anonymousUsers.length} anonymous account(s)...`);

  const targets = [];
  for (const user of anonymousUsers) {
    if (args.keepUids.has(user.uid)) continue;
    const classification = await classifyUser(db, args.appId, user, { sinceDate, staleCutoff });
    if (classification) targets.push(classification);
  }

  const teacherTargets = targets.filter((t) => t.role === 'teacher');
  console.log(
    `[delete-guest-accounts] found ${targets.length} account(s) to delete ` +
    `(${targets.length - teacherTargets.length} plain guest, ${teacherTargets.length} role=teacher)`
  );

  if (teacherTargets.length > 0) {
    console.log(`[delete-guest-accounts] ⚠️  TEACHER-ROLE accounts in the target list — review carefully:`);
    for (const t of teacherTargets) {
      console.log(`[delete-guest-accounts]   ⚠️  uid=${t.uid} createdAt=${t.createdAt.toISOString()} reasons=${t.reasons.join(',')}`);
    }
  }

  for (const t of targets) {
    console.log(
      `[delete-guest-accounts] ${args.live ? 'deleting' : 'would delete'} uid=${t.uid} ` +
      `role=${t.role || 'unknown'} createdAt=${t.createdAt.toISOString()} reasons=${t.reasons.join(',')}`
    );
    await deleteAccount(db, { appId: args.appId, uid: t.uid, recruitCode: t.recruitCode, live: args.live });
    await new Promise((resolve) => setTimeout(resolve, 150)); // light pacing to avoid tripping quota
  }

  if (args.live && targets.length > 0) {
    const uids = targets.map((t) => t.uid);
    for (let i = 0; i < uids.length; i += 1000) {
      const chunk = uids.slice(i, i + 1000);
      const result = await auth.deleteUsers(chunk);
      console.log(`[delete-guest-accounts] auth deleteUsers: success=${result.successCount} failure=${result.failureCount}`);
      for (const err of result.errors) {
        console.error(`[delete-guest-accounts]   failed uid=${chunk[err.index]}: ${err.error.message}`);
      }
    }
  }

  console.log(
    `[delete-guest-accounts] done. ${args.live ? 'deleted' : 'would delete'} ${targets.length} account(s).` +
    (args.live ? '' : ' Re-run with --live to actually delete.')
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[delete-guest-accounts] failed:', err.message || err);
    process.exit(1);
  });
}

module.exports = { parseArgs, classifyUser };
