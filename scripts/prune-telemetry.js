#!/usr/bin/env node
// Deletes telemetry that has aged past the retention window described in
// public/privacy.html ("Data Retention & Minimization (Under 13)"):
//   artifacts/{appId}/events          — append-only event stream (module_open, step, ...)
//   artifacts/{appId}/sessions        — one doc per module visit
//   artifacts/{appId}/course_feedback — end-of-lab star rating + free-text comment
//
// Cutoff is based on each collection's own "last activity" field, not creation time:
//   - events:          ts         (when the event was written; events are never updated)
//   - sessions:        lastSeenAt (updated on every flush while a visit is ongoing)
//   - course_feedback: timestamp  (written once at submit; a comment is never edited)
// A session/event newer than the cutoff is left alone even if the *account* is old.
//
// course_feedback is on the same 90-day window as the rest, and it is the collection
// that matters most here: it is the only place a child's own free text is stored. The
// published policy already promises that anonymous interaction data is purged after 90
// days of inactivity, so leaving these rows to accumulate indefinitely was the product
// failing to match the promise. Each row carries ageTier (see auth-core.js), so an
// under-13 comment can be located for a parental deletion request before the window
// expires, without joining back to any other collection.
//
// Requires the firebase-admin package (not a repo dependency today — install with
// `npm install firebase-admin --no-save` before running) and a service-account
// credential reachable via GOOGLE_APPLICATION_CREDENTIALS, matching how any other
// one-off Admin SDK script in this project would authenticate.
//
// Usage:
//   node scripts/prune-telemetry.js --dry-run          # report what would be deleted
//   node scripts/prune-telemetry.js                    # actually delete
//   node scripts/prune-telemetry.js --dry-run --days=30 --app-id=allgood-academy
//
// Exits non-zero on any batch failure so this is safe to wire into a cron/CI job
// without silently swallowing errors.

const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { dryRun: false, days: 90, appId: 'allgood-academy' };
  for (const raw of argv.slice(2)) {
    if (raw === '--dry-run') args.dryRun = true;
    else if (raw.startsWith('--days=')) args.days = Number(raw.slice('--days='.length));
    else if (raw.startsWith('--app-id=')) args.appId = raw.slice('--app-id='.length);
  }
  if (!Number.isFinite(args.days) || args.days <= 0) {
    throw new Error(`--days must be a positive number, got: ${args.days}`);
  }
  return args;
}

// Firestore's max writes per batch; delete in chunks well under that so one prune
// run can span an arbitrarily large collection without a single oversized batch.
const BATCH_SIZE = 400;

async function deleteInBatches(db, snapshot, { dryRun, label }) {
  let deleted = 0;
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    if (dryRun) {
      deleted += chunk.length;
      continue;
    }
    const batch = db.batch();
    for (const doc of chunk) batch.delete(doc.ref);
    await batch.commit();
    deleted += chunk.length;
  }
  console.log(`[prune-telemetry] ${dryRun ? 'would delete' : 'deleted'} ${deleted} ${label} doc(s)`);
  return deleted;
}

async function pruneCollection(db, { appId, collectionName, timestampField, cutoff, dryRun }) {
  const colRef = db.collection('artifacts').doc(appId).collection(collectionName);
  const snapshot = await colRef.where(timestampField, '<', cutoff).get();
  if (snapshot.empty) {
    console.log(`[prune-telemetry] no ${collectionName} docs older than cutoff`);
    return 0;
  }
  return deleteInBatches(db, snapshot, { dryRun, label: collectionName });
}

async function main() {
  const args = parseArgs(process.argv);
  const cutoffMs = Date.now() - args.days * 24 * 60 * 60 * 1000;
  const cutoff = admin.firestore.Timestamp.fromMillis(cutoffMs);

  console.log(
    `[prune-telemetry] app=${args.appId} days=${args.days} cutoff=${new Date(cutoffMs).toISOString()} ` +
    `mode=${args.dryRun ? 'DRY RUN (no deletes)' : 'LIVE'}`
  );

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();

  const eventsDeleted = await pruneCollection(db, {
    appId: args.appId, collectionName: 'events', timestampField: 'ts', cutoff, dryRun: args.dryRun,
  });
  const sessionsDeleted = await pruneCollection(db, {
    appId: args.appId, collectionName: 'sessions', timestampField: 'lastSeenAt', cutoff, dryRun: args.dryRun,
  });
  const feedbackDeleted = await pruneCollection(db, {
    appId: args.appId, collectionName: 'course_feedback', timestampField: 'timestamp', cutoff, dryRun: args.dryRun,
  });

  console.log(
    `[prune-telemetry] done. events=${eventsDeleted} sessions=${sessionsDeleted} ` +
    `course_feedback=${feedbackDeleted}` +
    (args.dryRun ? ' (dry run — nothing was actually deleted)' : '')
  );
}

main().catch((err) => {
  console.error('[prune-telemetry] failed:', err);
  process.exit(1);
});
