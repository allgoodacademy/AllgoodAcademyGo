# Mission Control (the teacher home)

`public/mission-control/` — a teacher's live view of their own Task Force (who is moving, who
has stalled, and, per module, exactly which choice a student made on each step) and the only
place they act on it.

It shows one classroom: the one on the signed-in teacher's own profile, validated against that
classroom's `teacherUid`.

**It is no longer read-only.** Every teacher function used to be split between here and
`/dashboard/`, which also held the only place to assign a module, see a Task Force code, or
export a roster. All of that moved here. `/dashboard/` remains the student/app shell — profile,
badges, launching lessons, joining a classroom, sign-in — and still owns the one teacher action
that legitimately starts there: becoming a Task Force Leader. A user becomes a teacher in the
app shell and then comes here.

## The three tabs

| Tab | What it is |
| --- | --- |
| **Roster** | the Task Force code (copy / print / CSV), Needs-your-attention triage, the per-student grid, and the class-wide game strip |
| **Agent Detail** | one student: step-by-step with per-step timing, the reteach signal, and game results |
| **Assign** | what this class works through — every lab, Challenge and game, from the registry |

## What it writes

| Target | Written by |
| --- | --- |
| `classrooms/{code}.assignedModules` | the Assign tab, class scope (rule #5 — only that classroom's own teacher) |
| `classrooms/{code}.assignedGames` | the Assign tab, class scope — see below |
| `classroom_assignments/{code}_{uid}` | the Assign tab, per-student scope (rule #6c) |

Nothing else. It never writes to a student's records.

### Per-student extras

A teacher can give **one named student** work on top of the class-wide set — the "Jamal also
gets Money as a Skill because he's stuck" case. Reached from that student's Agent Detail page,
or from the triage list's **Assign more** (which is about the one agent who finished
everything, so it opens *their* extras, not the whole class's).

**Additive, never a replacement**, and that is load-bearing. If each student's set were wholly
their own: the roster grid would lose its shared columns (every row a different shape),
`classAverage` would be averaging students who were set different work, and changing what the
class does would mean rewriting N documents instead of one. Extras keep the class set as the
spine. The picker shows class work ticked and **disabled** — removing class work from one
individual would be an *exemption*, which is a different feature with different consequences.

**Why it is not a field on the classroom document.** The obvious design is
`classrooms/{code}.assignedByStudent = { uid: [...] }`, and it is a privacy bug: rule #5 grants
`get` on a classroom document to **any signed-in user**, deliberately, so a student can
validate a code before joining — and the code is read out loud in class. Per-student
assignments there would be readable by every classmate. Hence its own collection with a narrow
read grant (the student it is about, or that classroom's teacher).

The document stores **only the delta**, never the merged set. Storing the merge would fossilise
the class assignment at the moment the extra was given, so changing what the Task Force does
next week would silently leave that student on last week's list. The merge happens at read time
in `assignmentFor()`.

**How the aggregates cope with ragged sets:**

| Reads | Which list | Why |
| --- | --- | --- |
| `buildStudent` | that student's own | an extra is real work for them and invisible to everyone else |
| `stallPoints`, `attentionList` | the **union** | self-filtering — `s.modules` only holds a student's own assignment, so nobody is judged on work that was never theirs |
| `classAverage` | the **class set** | an average is a comparison; averaging in work only some students were given compares them on different assignments |
| roster grid columns | the **class set** | shared columns are what make a roster scannable; a student with extras gets a `+N just for them` marker instead |
| CSV columns | the **union** | a module only one student has still belongs in an export |

The CSV therefore has three non-progress states, and the distinction matters to anyone reading
it as a compliance record: `not_assigned` (never given it), `assigned_no_progress_data`
(assigned, but see the limitation below), and `not_started` (given it, hasn't opened it).

### Why games are a separate field

`assignedModules` is consumed by code that assumes every id in it has a fixed step sequence:
`state.assigned` feeds `buildStudent()`, whose per-module shape is `(stepsTotal, maxStep, pct,
attemptsByStep)`, and a student's overall completion is the **mean of each assigned module's
pct**. The four standalone games have a randomized bank and no fixed sequence — which is why
`derive.js` already kept them out of `s.modules` — so a game in `assignedModules` would sit at
0% forever and drag every student's headline number down. It would not even be inert today:
`state.assigned` filters on `MODULE_DATA`, so a game id there is silently dropped.

Both are fields on the same document, so `assignedGames` costs no extra read or write.

## The Assign tab is registry-driven

Every row comes from `public/data/modules-registry.json` via `buildCatalog()` in `derive.js`.
Nothing in `index.html` or `derive.js` enumerates a module, so **adding a GoodBlock, Challenge
or game to the registry makes it assignable with no code change** — including in a Lab Pack
that does not exist yet (an unrecognised `pack` slug renders title-cased; adding it to
`PACK_NAMES` only improves the label). `retired` entries are excluded.

A game's pack is the pack of the lab in its `defaultDestination`, and the "routes to …" line
under it is every lab claiming one of its `skillTags` codes, resolved through the same shared
module the games themselves use (`public/js/skill-routing.js`).

One current limitation, pre-dating this: `module-data.js` covers the Digital Decisions lab
only (see its generator's `LAB_IDS`), so the other seven labs are assignable but have no
step-by-step data for the roster to render. Extending the generator needs its
`CASE_CHOICES.length === stepsTotal` invariant loosened — those labs have `CASE_TITLES` and
`stepsTotal` but no `CASE_CHOICES` — so it is its own change, not a side effect of this one.

Because of that gap, `assignmentFor()` returns **two** views of the same assignment: the
trackable set (`modules`, filtered through `MODULE_DATA`, which is what `buildStudent` gets)
and the full set (`allModules`). Counts, badges, the CSV and the "can't chart this yet" note
all read the *full* view. Filtering to the trackable set and stopping there is what made an
extra from another Lab Pack vanish silently — it saved, and the teacher saw nothing change,
which is indistinguishable from a failed write.

## What it reads

| Source | Used for |
| --- | --- |
| `users/{uid}` | the teacher's own `role` + `classroomCode` (the gate) |
| `classrooms/{code}` | `teacherName`, `assignedModules`, `assignedGames` |
| `classroom_members` where `classroomCode == code` | the roster's join-table half (rule #6b) |
| `users` where `classroomCode == code, role == 'student'` | the roster's legacy half (rule #4 `list`) |
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

**Rule #4's `list` and `get` cannot share a condition.** On a `list` the rule is matched
against the *collection*, so the trailing `{userId}` wildcard is unbound — null — and a
condition taking it raises a null-value error before returning any verdict (`userId is string`
errors on null too). That denied `list` for every teacher and took the whole page down with a
permission error, including for a brand-new teacher with an empty classroom. The `list` grant
is therefore written against `resource.data` (which *is* populated per returned document on a
list) while `get` keeps the wildcard. Two consequences to know before editing it: the roster
query must filter on **both** `role == 'student'` and the classroom code or it returns a
document the rule denies and the whole query fails; and document access stays O(1) rather than
O(students) because every returned document resolves the same classroom path.

**Per-step timing is an approximation and is labelled as one.** Telemetry records `activeMs`
per visit but never a per-step duration, so a step's time is the gap between consecutive graded
answers — reported only when both ends fall inside one visit and the gap is under
`STEP_GAP_CEILING_MS`, and omitted entirely otherwise. The UI says "between answers, within one
visit", never "time on task".

**A class-wide weakest skill needs enough players.** `WEAK_SKILL_MIN_PLAYERS` (5) different
students must have played a game before the strip states its weakest skill; below that it says
so. The count is of *students*, not sessions, and accuracy is pooled rather than averaged per
student.

## Choice text is generated, never hand-copied

`public/mission-control/module-data.js` is produced by
`node scripts/build-mission-control-data.js` from the modules themselves — `SCENARIO_DATA` in
the Digital Decisions Challenge, and `CASE_TITLES` / `CASE_CHOICES` in each lab.

Re-run it after touching any of those arrays. `node scripts/check-modules.js` fails if the
generated file has drifted, because the failure mode is silent: a reworded option leaves the
dashboard confidently attributing a sentence to a student that nobody was ever shown.

## Tests

    node --test tests/mission-control.test.mjs   # the shaping layer (public/mission-control/derive.js)
    ./scripts/run-rules-tests.sh                 # includes the ROSTER LIST + MISSION CONTROL blocks

The rules suite runs in CI on **every pull request and every push to main, with no path
filter**, plus a weekly cron. That breadth is deliberate and was bought the hard way: the
workflow used to run only on pushes to `main` touching `firestore.rules` or `firebase.json`,
and the roster-list denial above reached production through all three of the gaps that leaves —
a client change issuing a query the rules never allowed, a dependency change moving the rules
engine itself, and drift with no commit behind it at all. `firebase-tools` is exact-pinned in
`devDependencies` for the same reason: the rules engine lives in the emulator JAR that CLI
downloads, so an unpinned CLI meant an unpinned verdict. `scripts/run-rules-tests.sh` asserts
the JAR version rather than assuming it, and fails loudly if it drifts.

Deploy is still main-only, but it is no longer path-filtered: `firebase deploy --only
firestore:rules` is idempotent and takes seconds, so a redundant deploy costs nothing, while a
rules change that silently does *not* deploy is the expensive failure — and a path filter is
exactly how you get one.

The shaping layer lives in `derive.js` rather than inside `index.html` specifically so it can
be tested: the mistakes that matter here are arithmetic, and none of them are visible by
looking at the page.

## Printing the Task Force code

The Roster tab's "Print for the wall" is a real print path, not `window.print()` on a dark
dashboard. The `@media print` block hides the whole app and emits a single page — the class
name, the code at 96pt, and how to join — forced to black on white, because a printer will not
reliably paint the dark theme's background and a light-on-dark design otherwise prints as white
on white.

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
