// A per-student "I finished this game" record (2026-11-25). Loaded by telemetry.js when a
// module calls Telemetry.complete(). It writes only for registry GAMES.
//
// Why: games report through telemetry, and a student can't read telemetry back (sessions
// and events are admin-read), so a student's dashboard could never show a game as done or
// award a game badge. This writes the smallest readable record into the student's own
// module_progress/{gameId}, the same place lessons keep theirs:
//   { completed: true, finishedCount: n, lastFinishedAt }
// module_progress is already owner-writable (firestore.rules #2b), teacher-readable for
// their class, read by Insider (the game's COURSES row maps it), and covered by Insider's
// delete-this-user tool. No new collection, no rules change. Lessons and Challenges are
// skipped: they write their own module_progress.
import { doc, setDoc, increment, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

export async function recordGameFinish({ module: moduleId, gameName } = {}) {
    const core = window.AuthCore;
    const user = core && core.auth && core.auth.currentUser;
    if (!user || !moduleId) return;
    let game = null;
    try {
        const reg = await fetch('/data/modules-registry.json').then((r) => r.json());
        game = (reg.modules || []).find((m) => m.type === 'game' && !m.hidden && !m.retired
            && (m.id === moduleId || m.name === gameName)) || null;
    } catch (e) { return; }
    if (!game) return;
    try {
        await setDoc(doc(core.db, 'artifacts', core.appId, 'users', user.uid, 'module_progress', game.id), {
            completed: true,
            finishedCount: increment(1),
            lastFinishedAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.warn('[GameFinish] could not record the finish', e);
    }
}
