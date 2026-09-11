# Mission Control (teacher dashboard)

`public/mission-control/` — a teacher's live view of their own Task Force: who is moving, who
has stalled, and, per module, exactly which choice a student made on each step.

It is read-only. It writes nothing, and it shows one classroom: the one on the signed-in
teacher's own profile, validated against that classroom's `teacherUid`.

## What it reads

| Source | Used for |
| --- | --- |
| `users/{uid}` | the teacher's own `role` + `classroomCode` (the gate) |
| `classrooms/{code}` | `teacherName`, `assignedModules` |
| `users` where `classroomCode == code, role == 'student'` | the roster (rule #4) |
| `users/{uid}/game_scores/{id}` | completion flag, `finalScore` / `percentage` (rule #6) |
| `…/game_scores/{id}/scenario_attempts/{n}` | the per-step choice drill-down (rule #6) |
| `users/{uid}/module_progress/{slug}` | in-progress position — the only such signal for a lab |
| `sessions` where `uid == studentUid` | `activeMs` (time on task), most accurate `maxStep` |

Three of those overlap on purpose, because each holds something the others do not, and a
module's progress takes the **highest** step any of them can prove. `game_scores` alone would
show a mid-lab student as "not started": a lab writes that document only on completion.

## Two things that are easy to get wrong

**`scenarioIndex` is not one convention.** The Challenge writes it **1-based**; every lab
writes it **0-based** (it is the same `pageIndex` `markReady()` takes). `module-data.js`
records this per module as `indexBase`, and `attemptsByStep()` normalises it. Get it wrong and
every choice in the drill-down shifts by one row — still plausible-looking, and wrong.

**`highestUnlocked` is not a step count.** It is a 0-indexed page number: `0` means Case 1 is
merely open. The step a teacher reads is one higher.

## Choice text is generated, never hand-copied

`public/mission-control/module-data.js` is produced by
`node scripts/build-mission-control-data.js` from the modules themselves — `SCENARIO_DATA` in
the Digital Decisions Challenge, and `CASE_TITLES` / `CASE_CHOICES` in each lab.

Re-run it after touching any of those arrays. `node scripts/check-modules.js` fails if the
generated file has drifted, because the failure mode is silent: a reworded option leaves the
dashboard confidently attributing a sentence to a student that nobody was ever shown.

## Tests

    node --test tests/mission-control.test.mjs   # the shaping layer (public/mission-control/derive.js)
    ./scripts/run-rules-tests.sh                 # includes the MISSION CONTROL rules block

The shaping layer lives in `derive.js` rather than inside `index.html` specifically so it can
be tested: the mistakes that matter here are arithmetic, and none of them are visible by
looking at the page.

## Time on task depends on an undeployed rules grant

`activeMs` exists only on a telemetry `session` document, and rule #10 opens `sessions` to the
admin allowlist only. `firestore.rules` now carries a **10b** grant letting a teacher read the
sessions of students in a classroom they demonstrably own — same pivot as #4/#6, read-only,
covered by tests.

**It has not been deployed.** Until it is, the dashboard degrades rather than breaks: the
first denied read flips `state.sessionsReadable`, time-on-task reads "unavailable", a note
explains why, and every other figure — which comes from the student's own records — is
complete and correct.

The page queries sessions **one uid at a time**, and that is load-bearing. Rules allow at most
10 document access calls per query, cached per distinct path within a request; pinned to a
single uid every returned document resolves the same two paths. A classroom-wide query would
need a fresh user lookup per document and would begin failing once a classroom passed a
handful of students.
