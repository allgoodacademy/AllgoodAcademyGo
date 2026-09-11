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
//   npm run prune:dry-run                              # report only — never deletes
//   node scripts/prune-telemetry.js --dry-run          # same thing, directly
//   node scripts/prune-telemetry.js --dry-run --days=30 --app-id=allgood-academy
//   node scripts/prune-telemetry.js --summary=out.md   # also write a plain-English report
//   node scripts/prune-telemetry.js                    # DESTRUCTIVE — deletes. See below.
//
// ⚠️ THE DESTRUCTIVE PATH IS THE DEFAULT, AND THAT IS A FOOTGUN. Omitting --dry-run
// deletes. It is left reachable only by invoking this file directly and deliberately:
// no npm script and no workflow in this repo can run it destructively. Before anyone
// runs it for real, see the retention ownership section in docs/insider-analytics.md —
// a destructive run needs the named owner's authorisation, and as of 2026-09-11 the
// 90-day window itself is an open question with counsel.
//
// Exits non-zero on any batch failure so this is safe to wire into a cron/CI job
// without silently swallowing errors.

// firebase-admin v13+ exposes ONLY the modular API from these subpath entry points. The
// namespaced style this script was originally written in - admin.credential,
// admin.firestore() - does not exist on the current major version; requiring the
// package root returns just the app API. That is not a style preference: on v14 the old
// form throws "Cannot read properties of undefined". It was never caught because the
// script had never been executed. See docs/insider-analytics.md.
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const fs = require('fs');

function parseArgs(argv) {
  const args = { dryRun: false, days: 90, appId: 'allgood-academy', summary: null };
  for (const raw of argv.slice(2)) {
    if (raw === '--dry-run') args.dryRun = true;
    else if (raw.startsWith('--days=')) args.days = Number(raw.slice('--days='.length));
    else if (raw.startsWith('--app-id=')) args.appId = raw.slice('--app-id='.length);
    else if (raw.startsWith('--summary=')) args.summary = raw.slice('--summary='.length);
  }
  if (!Number.isFinite(args.days) || args.days <= 0) {
    throw new Error(`--days must be a positive number, got: ${args.days}`);
  }
  return args;
}

// The collections the published retention promise covers, and the field that carries
// each one's "last activity" clock. Adding a collection here is what puts it under the
// window; scripts/check-invariants.js will not notice a collection nobody listed.
const COLLECTIONS = [
  { name: 'events', timestampField: 'ts', what: 'Event log — module opens, in-module choices, completions' },
  { name: 'sessions', timestampField: 'lastSeenAt', what: 'One record per module visit — time on task, steps reached' },
  { name: 'course_feedback', timestampField: 'timestamp', what: 'End-of-lab star rating and free-text comment' },
];

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

// Returns the numbers a non-engineer actually needs: how much is past the window, and
// how old the oldest surviving record is. The oldest record is queried separately and
// WITHOUT the cutoff filter, because "nothing is past the window" and "this collection
// is empty" look identical otherwise, and they mean very different things.
async function pruneCollection(db, { appId, collectionName, timestampField, cutoff, dryRun }) {
  const colRef = db.collection('artifacts').doc(appId).collection(collectionName);

  let oldest = null;
  const oldestSnap = await colRef.orderBy(timestampField, 'asc').limit(1).get();
  if (!oldestSnap.empty) {
    const raw = oldestSnap.docs[0].get(timestampField);
    if (raw && typeof raw.toDate === 'function') oldest = raw.toDate();
  }

  const snapshot = await colRef.where(timestampField, '<', cutoff).get();
  const pastWindow = snapshot.size;
  if (snapshot.empty) {
    console.log(`[prune-telemetry] no ${collectionName} docs older than cutoff`);
    return { collectionName, timestampField, pastWindow: 0, processed: 0, oldest };
  }
  const processed = await deleteInBatches(db, snapshot, { dryRun, label: collectionName });
  return { collectionName, timestampField, pastWindow, processed, oldest };
}

// Written for somebody who will never open this file. Plain sentences, no jargon, and
// the question the founder actually has at the top: is anything past what we promised?
function renderSummary({ args, cutoffDate, ranAt, rows }) {
  const fmt = (d) => (d ? d.toISOString().slice(0, 10) : '—');
  const totalPast = rows.reduce((n, r) => n + r.pastWindow, 0);
  const meta = COLLECTIONS.reduce((m, c) => ((m[c.name] = c), m), {});

  const lines = [];
  lines.push('# Retention report');
  lines.push('');
  lines.push(args.dryRun
    ? '**Report only — nothing was deleted.** This job never deletes.'
    : '**⚠️ LIVE RUN — data was deleted.**');
  lines.push('');
  lines.push(totalPast === 0
    ? `## ✅ Nothing is past our published window.`
    : `## ⚠️ ${totalPast.toLocaleString()} record(s) are past our published window and have not been deleted.`);
  lines.push('');
  lines.push(`Our privacy policy says under-13 telemetry is purged after **${args.days} days of inactivity**. `
    + `That means anything whose last activity was before **${fmt(cutoffDate)}** should already be gone.`);
  lines.push('');
  lines.push('| What | Past the window | Oldest record still stored | Clock measured from |');
  lines.push('|---|---|---|---|');
  for (const r of rows) {
    const c = meta[r.collectionName] || { what: r.collectionName };
    lines.push(`| ${c.what} | ${r.pastWindow.toLocaleString()} | ${fmt(r.oldest)} | \`${r.timestampField}\` |`);
  }
  lines.push('');
  lines.push(`- **Window:** ${args.days} days of inactivity`);
  lines.push(`- **Cutoff date:** ${fmt(cutoffDate)} — records last touched before this are past the window`);
  lines.push(`- **Report generated:** ${ranAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  lines.push(`- **Firebase project:** ${args.appId}`);
  lines.push('');
  if (totalPast > 0) {
    lines.push('**What this means.** The promise on the privacy page is not currently being kept for these records. '
      + 'This job deliberately does not delete them — see the retention ownership section in '
      + '`docs/insider-analytics.md` for who decides and who authorises a real deletion run.');
  } else {
    lines.push('**What this means.** Nothing is currently overdue. Note that this job does not delete, '
      + 'so a zero here means the data genuinely aged out or was never created — not that this job removed it.');
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const args = parseArgs(process.argv);
  const ranAt = new Date();

  // Fail loudly and specifically on a missing credential. applicationDefault() otherwise
  // throws something obscure, and a retention job that dies confusingly is how this gap
  // went unnoticed for months in the first place.
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
    throw new Error(
      'No credential found. Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON file. ' +
      'This job must fail rather than silently report zero — a retention report that cannot ' +
      'reach Firestore is not evidence that nothing is overdue.'
    );
  }

  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  const cutoffMs = ranAt.getTime() - args.days * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(cutoffMs);
  const cutoff = Timestamp.fromMillis(cutoffMs);

  console.log(
    `[prune-telemetry] app=${args.appId} days=${args.days} cutoff=${cutoffDate.toISOString()} ` +
    `mode=${args.dryRun ? 'DRY RUN (no deletes)' : 'LIVE'}`
  );

  const rows = [];
  for (const c of COLLECTIONS) {
    rows.push(await pruneCollection(db, {
      appId: args.appId, collectionName: c.name, timestampField: c.timestampField, cutoff, dryRun: args.dryRun,
    }));
  }

  const totalPast = rows.reduce((n, r) => n + r.pastWindow, 0);
  console.log(
    `[prune-telemetry] done. ` +
    rows.map((r) => `${r.collectionName}=${r.processed}`).join(' ') +
    ` pastWindow=${totalPast}` +
    (args.dryRun ? ' (dry run — nothing was actually deleted)' : '')
  );

  if (args.summary) {
    const text = renderSummary({ args, cutoffDate, ranAt, rows });
    fs.appendFileSync(args.summary, text);
    console.log(`[prune-telemetry] summary written to ${args.summary}`);
  }
}

// Only run when invoked directly. Requiring this file (a test, or the invariant
// checker) must never start a Firestore job as a side effect.
if (require.main === module) {
  main().catch((err) => {
    console.error('[prune-telemetry] failed:', err.message || err);
    process.exit(1);
  });
}

module.exports = { parseArgs, renderSummary, COLLECTIONS };
