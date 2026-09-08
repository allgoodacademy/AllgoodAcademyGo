#!/usr/bin/env node
// One-off cleanup for a module that has zero real students on it yet, so its Firestore
// footprint starts clean rather than carrying test/dev artifacts forward once real
// students do start using it. NOT a general-purpose module-reset tool for a module
// that already has real usage — this deletes unconditionally, with no per-student
// opt-out, which is only safe when the module truly has no real learners on it.
//
// Deletes every doc across the collections a module can write to, scoped to the given
// module slug(s)/gameName(s):
//   artifacts/{appId}/users/*/game_scores            (gameName == one of the given names)
//   artifacts/{appId}/users/*/game_scores/*/scenario_attempts  (children of the above,
//                                                       only relevant for scored games)
//   artifacts/{appId}/users/*/module_progress/{slug} (doc id == one of the given slugs —
//                                                       collectionGroup queries can't filter
//                                                       on a trailing doc-id segment, so this
//                                                       fetches the whole collection group and
//                                                       filters client-side; fine at this scale)
//   artifacts/{appId}/sessions                        (module == one of the given slugs)
//   artifacts/{appId}/events                          (module == one of the given slugs)
//   artifacts/{appId}/course_feedback                 (gameName == one of the given names)
//
// Requires the firebase-admin package (not a repo dependency today — install with
// `npm install firebase-admin --no-save` before running) and a service-account
// credential reachable via GOOGLE_APPLICATION_CREDENTIALS, same as scripts/prune-telemetry.js.
//
// Usage:
//   node scripts/reset-module-data.js --dry-run \
//     --slug=social-intelligence --game-name="Social Intelligence" \
//     --slug=digital-citizenship --game-name="Digital Citizenship"
//   node scripts/reset-module-data.js \
//     --slug=social-intelligence --game-name="Social Intelligence" \
//     --slug=digital-citizenship --game-name="Digital Citizenship"
//
// Pass --slug and --game-name in matching pairs, one pair per module. --dry-run reports
// what would be deleted without deleting anything. Exits non-zero on any batch failure.

const admin = require('firebase-admin');

function parseArgs(argv) {
  const args = { dryRun: false, appId: 'allgood-academy', slugs: [], gameNames: [] };
  for (const raw of argv.slice(2)) {
    if (raw === '--dry-run') args.dryRun = true;
    else if (raw.startsWith('--app-id=')) args.appId = raw.slice('--app-id='.length);
    else if (raw.startsWith('--slug=')) args.slugs.push(raw.slice('--slug='.length));
    else if (raw.startsWith('--game-name=')) args.gameNames.push(raw.slice('--game-name='.length));
    else throw new Error(`Unrecognized argument: ${raw}`);
  }
  if (!args.slugs.length || !args.gameNames.length) {
    throw new Error('Pass at least one --slug=<id> and one --game-name=<Name> (in matching pairs)');
  }
  if (args.slugs.length !== args.gameNames.length) {
    throw new Error(`Got ${args.slugs.length} --slug values but ${args.gameNames.length} --game-name values — pass them in matching pairs`);
  }
  return args;
}

const BATCH_SIZE = 400;

async function deleteRefs(db, refs, { dryRun, label }) {
  if (dryRun) {
    console.log(`[reset-module-data] would delete ${refs.length} ${label} doc(s)`);
    return refs.length;
  }
  let deleted = 0;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const ref of chunk) batch.delete(ref);
    await batch.commit();
    deleted += chunk.length;
  }
  console.log(`[reset-module-data] deleted ${deleted} ${label} doc(s)`);
  return deleted;
}

async function resetGameScores(db, appId, gameNames, dryRun) {
  const snap = await db.collectionGroup('game_scores').where('gameName', 'in', gameNames).get();
  const refs = [];
  let attemptRefs = [];
  for (const doc of snap.docs) {
    refs.push(doc.ref);
    // scenario_attempts only exists on scored games (DDC/Jolene's), but check every
    // matched doc anyway rather than assuming these two labs never have one.
    const attemptsSnap = await doc.ref.collection('scenario_attempts').get();
    attemptRefs = attemptRefs.concat(attemptsSnap.docs.map((d) => d.ref));
  }
  const attemptsDeleted = await deleteRefs(db, attemptRefs, { dryRun, label: 'scenario_attempts' });
  const scoresDeleted = await deleteRefs(db, refs, { dryRun, label: 'game_scores' });
  return { scoresDeleted, attemptsDeleted };
}

async function resetModuleProgress(db, slugs, dryRun) {
  // No gameName/slug field to filter on server-side on a collectionGroup query for a
  // trailing doc-id match — fetch the whole collection group and filter client-side.
  // Fine at this project's current scale; revisit if module_progress ever grows large.
  const snap = await db.collectionGroup('module_progress').get();
  const refs = snap.docs.filter((d) => slugs.includes(d.id)).map((d) => d.ref);
  return deleteRefs(db, refs, { dryRun, label: 'module_progress' });
}

async function resetTelemetry(db, appId, slugs, dryRun) {
  const eventsSnap = await db.collection('artifacts').doc(appId).collection('events').where('module', 'in', slugs).get();
  const eventsDeleted = await deleteRefs(db, eventsSnap.docs.map((d) => d.ref), { dryRun, label: 'events' });

  const sessionsSnap = await db.collection('artifacts').doc(appId).collection('sessions').where('module', 'in', slugs).get();
  const sessionsDeleted = await deleteRefs(db, sessionsSnap.docs.map((d) => d.ref), { dryRun, label: 'sessions' });

  return { eventsDeleted, sessionsDeleted };
}

async function resetCourseFeedback(db, appId, gameNames, dryRun) {
  const snap = await db.collection('artifacts').doc(appId).collection('course_feedback').where('gameName', 'in', gameNames).get();
  return deleteRefs(db, snap.docs.map((d) => d.ref), { dryRun, label: 'course_feedback' });
}

async function main() {
  const args = parseArgs(process.argv);

  console.log(
    `[reset-module-data] app=${args.appId} modules=${args.slugs.join(', ')} ` +
    `mode=${args.dryRun ? 'DRY RUN (no deletes)' : 'LIVE'}`
  );

  admin.initializeApp({ credential: admin.credential.applicationDefault() });
  const db = admin.firestore();

  const { scoresDeleted, attemptsDeleted } = await resetGameScores(db, args.appId, args.gameNames, args.dryRun);
  const progressDeleted = await resetModuleProgress(db, args.slugs, args.dryRun);
  const { eventsDeleted, sessionsDeleted } = await resetTelemetry(db, args.appId, args.slugs, args.dryRun);
  const feedbackDeleted = await resetCourseFeedback(db, args.appId, args.gameNames, args.dryRun);

  console.log(
    `[reset-module-data] done. game_scores=${scoresDeleted} scenario_attempts=${attemptsDeleted} ` +
    `module_progress=${progressDeleted} events=${eventsDeleted} sessions=${sessionsDeleted} ` +
    `course_feedback=${feedbackDeleted}` +
    (args.dryRun ? ' (dry run — nothing was actually deleted)' : '')
  );
}

main().catch((err) => {
  console.error('[reset-module-data] failed:', err);
  process.exit(1);
});
