#!/usr/bin/env node
// Deletes every guest/passphrase account (Firebase Anonymous Auth user) and everything
// keyed to it. Written for the Sep 2026 cleanup: the recruit-code passphrase flow shipped
// and no real student had signed in yet, so every anonymous account on file was internal
// testing, not product data.
//
// This is NOT a general-purpose "delete guests" switch — it deletes ALL anonymous accounts
// unconditionally. Do not run this again once real students are using recruit codes; by
// then "anonymous" will mean "real student who hasn't gone 13+" and this script would wipe
// them. It exists for this one historical cleanup and should be treated as unsafe to reuse
// without adding a real is-test marker first (see docs/insider-analytics.md).
//
// For each anonymous Auth user this deletes:
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
//   node scripts/delete-guest-accounts.js                  # dry run — reports only, deletes nothing
//   node scripts/delete-guest-accounts.js --live            # actually deletes
//   node scripts/delete-guest-accounts.js --live --keep-uid=abc123,def456   # skip specific uids
//   node scripts/delete-guest-accounts.js --app-id=allgood-academy
//
// Unlike prune-telemetry.js, DRY RUN IS THE DEFAULT HERE. Deleting an Auth account is not
// reversible the way an aged-out telemetry row is, so this errs the opposite direction:
// you must pass --live to delete anything.

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const SUBCOLLECTIONS = ['module_progress', 'continuity_bank', 'comms_receipts', 'comms_state'];
const UID_FIELD_COLLECTIONS = ['events', 'sessions', 'course_feedback', 'topic_selections', 'messages'];
const BATCH_SIZE = 400;

function parseArgs(argv) {
  const args = { live: false, appId: 'allgood-academy', keepUids: new Set() };
  for (const raw of argv.slice(2)) {
    if (raw === '--live') args.live = true;
    else if (raw.startsWith('--app-id=')) args.appId = raw.slice('--app-id='.length);
    else if (raw.startsWith('--keep-uid=')) {
      for (const uid of raw.slice('--keep-uid='.length).split(',')) {
        if (uid) args.keepUids.add(uid);
      }
    }
  }
  return args;
}

async function listAllAnonymousUsers(auth) {
  const anonymous = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (user.providerData.length === 0) anonymous.push(user);
    }
    pageToken = page.pageToken;
  } while (pageToken);
  return anonymous;
}

async function deleteDocsInBatches(db, refs, { live, label }) {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    if (!live) continue;
    const batch = db.batch();
    for (const ref of chunk) batch.delete(ref);
    await batch.commit();
  }
  if (refs.length > 0) {
    console.log(`[delete-guest-accounts]   ${live ? 'deleted' : 'would delete'} ${refs.length} ${label} doc(s)`);
  }
}

async function deleteAccount(db, { appId, uid, live }) {
  const userRef = db.collection('artifacts').doc(appId).collection('users').doc(uid);
  const userSnap = await userRef.get();
  const recruitCode = userSnap.exists ? userSnap.get('recruitCode') : null;

  for (const sub of SUBCOLLECTIONS) {
    const snap = await userRef.collection(sub).get();
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
    const snap = await colRef.where('uid', '==', uid).get();
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

  initializeApp({ credential: applicationDefault() });
  const auth = getAuth();
  const db = getFirestore();

  console.log(
    `[delete-guest-accounts] app=${args.appId} mode=${args.live ? 'LIVE — WILL DELETE' : 'DRY RUN (no deletes)'}` +
    (args.keepUids.size ? ` keeping=${[...args.keepUids].join(',')}` : '')
  );

  const anonymousUsers = await listAllAnonymousUsers(auth);
  const targets = anonymousUsers.filter((u) => !args.keepUids.has(u.uid));

  console.log(
    `[delete-guest-accounts] found ${anonymousUsers.length} anonymous auth user(s), ` +
    `${targets.length} targeted for deletion (${anonymousUsers.length - targets.length} kept)`
  );

  for (const user of targets) {
    console.log(`[delete-guest-accounts] ${args.live ? 'deleting' : 'would delete'} uid=${user.uid} created=${user.metadata.creationTime}`);
    await deleteAccount(db, { appId: args.appId, uid: user.uid, live: args.live });
  }

  if (args.live && targets.length > 0) {
    for (let i = 0; i < targets.length; i += 1000) {
      const chunk = targets.slice(i, i + 1000).map((u) => u.uid);
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

module.exports = { parseArgs, listAllAnonymousUsers };
