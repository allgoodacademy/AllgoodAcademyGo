# Insider analytics: what is tracked, where it lives, and how to get it into a BI tool

Insider (`public/insider/index.html`) is the owner-facing BI view for Allgood Academy. This
note explains the data behind it, so you know what each number means and how to take the
same data further (Looker Studio, BigQuery, Sheets) when you want to.

## 0. Cutover: the identity reset (2026-11-24)

Read this before comparing any number across late November 2026. On this date students
stopped signing in at all (founder decision, 2026-11-23, Decisions & Context Log
"Identity model reset"). What changes in the data:

- **When a session counts — kept comparable on purpose.** Lessons used to sit behind a
  tap-to-power-up screen, so a telemetry session only began after a tap. That screen is
  gone and content renders on load, so `telemetry.js` now opens the `sessions/{id}` doc at
  the visitor's **first interaction** (first tap or keypress, a `step()` past step 1 — the
  GoodBlocks report step 1 on load — a `choice()` or `complete()`), not on page load, and `AuthCore.startSession()` writes
  the `users/{uid}` profile at that same moment. A visit that never touches the page is
  neither a session nor a user, exactly as before. `module_open` events are still queued
  from page load and only written once the session opens.
- **The Challenges' "Session Started" `game_scores` row** is likewise written at the first
  interaction, not on load.
- **No new `ageTier`.** Nothing asks a student's age any more, so new `users`, `sessions`,
  `events`, `course_feedback` and `topic_selections` rows carry no `ageTier`. Every student
  is treated as a child. Older rows keep theirs.
- **User mix freezes.** Insider's "Learner Recruit" and "13+ Account" counts stop growing;
  every new student is a "Guest" (anonymous) — in a classroom if they joined one. "Teacher"
  is unchanged.
- **No new Recruit Codes.** `recruit_codes` is read-only (rule #9). Nothing reads it since the
  legacy restore was removed on 2026-11-25; before that, a restore copied old progress into the student's current
  anonymous uid, so a restored student appears as a new Guest row with the old work, and
  their teacher's roster can show both the old and the new row.
- **Fewer split sessions.** Nobody signs in or links an account mid-visit any more, so a
  visit no longer splits into two session docs when the uid changed.
- **GA4 is stricter.** `telemetry.js` forwards to GA only for a non-anonymous (teacher)
  session; it used to skip only `ageTier == 'under13'`.

## 1. What every module records

All data lives in Firestore under `artifacts/allgood-academy/…`. Two kinds of records exist:

### Legacy per-user records (written since the start)

| Path | Written by | What it holds |
|---|---|---|
| `users/{uid}` | auth-core.js | displayName (a student's nickname), email (teachers only), role, isGuest, classroomCode, lastLogin. Pre-2026-11 rows may also carry ageTier, recruitCode, avatar |
| `users/{uid}/launches/{id}` | dashboard launch button | courseName, targetUrl, timestamp. Only dashboard launches. Lab Pack hub launches are not written here. |
| `users/{uid}/game_scores/{sessionId}` | both Challenges, Jolene's, every lab | gameName, finalScore / percentage / rank (games), completed flag (labs), lastUpdated. Real World Ready labs also write `narrativeStyle` (`'second-person'` for Money as a Skill, `'character'` for Conflict Has a Winner and Reading the Room) — the tag for the Lab Pack's narrative-style A/B test. Compare per-category Real World Ready Challenge scores (Judgment ← money, Composure ← conflict, Perspective ← reading_room) against it. |
| `users/{uid}/game_scores/{sessionId}/scenario_attempts/{n}` | DDC, Jolene's | scenarioIndex, choiceIndex, score (0 to 3), effectiveness, question |
| `users/{uid}/module_progress/{slug}` | every module | resume state: answered scenarios (games) or highestUnlocked case (labs) |
| `course_feedback/{id}` | DDC only today | rating 1 to 5 plus free text |
| `messages/{id}` | Message HQ on every portal | free-text messages with source portal |
| `classrooms/{code}` | Mission Control | a teacher's class and what it is assigned |
| `recruit_codes/{code}` | legacy (pre-2026-11), read-only | old Learner Recruit passphrases and their progress copy; nothing reads it since the legacy restore was removed (2026-11-25) |

What this could NOT answer: time spent, where in a module people quit, how they arrived,
what device they used, or anything about a lab visit that did not end in completion.

### Telemetry records (new, written by `public/js/telemetry.js`)

| Path | What it holds |
|---|---|
| `sessions/{sessionId}` | One doc per module visit: uid, module, gameName, **stream**, startedAt, lastSeenAt, **activeMs** (only while the tab is visible), **maxStep / stepsTotal**, completed, **device**, **entry** (dashboard, lab-hub, direct, external), role / isGuest copied from the account (pre-2026-11 rows also ageTier). Opened at the first interaction — see section 0 |
| `events/{id}` | Append-only stream: `module_open`, `step`, `choice`, `module_complete`, plus any custom `Telemetry.track()` call. Each has uid, module, **stream**, sessionId, step, meta, ts |

#### Streams: which numbers a product belongs in

Every session and event carries a `stream`. It defaults to `'core'` — the site's own funnel,
which is what every figure on Insider is computed from. A module that passes `stream` at
`Telemetry.init()` opts **out** of that population.

| Stream | Modules | In Insider's numbers? |
|---|---|---|
| `core` | the four games, every GoodBlock, every Challenge | yes — this is the funnel |
| `pattern-lab` | Pattern Lab (`/educational-games/pattern-lab/`) | **no** — held in `D.offFunnel` |
| `take-the-bait` | Take the Bait (`/educational-games/takethebait/`) | **no** — its own Insider page, from its own queries |
| `water-cycle` | Where rain comes from (`/simulations/watercycle/`) | **no** — its own **Simulations** page (`#/simulations`), from its own stream-filtered queries; anonymous session only, no name or free text |
| `seasons` | Reasons for the Seasons (`/simulations/seasons/`) | **no** — its own **Simulations** page (`#/simulations`), from its own stream-filtered queries; anonymous session only, no name or free text |
| `wolves-and-deer` | Wolves & Deer (`/simulations/wolves-and-deer/`) | **no** — its own **Simulations** page (`#/simulations`), from its own stream-filtered queries; anonymous session only, no name or free text |
| `snowball` | The Snowball (`/simulations/snowball/`) | **no** — its own **Simulations** page (`#/simulations`), from its own stream-filtered queries; anonymous session only, no name or free text |
| `espanol` | El Viaje (`/espanol/el-viaje/`), El Mundial (`/espanol/el-mundial/`) and La selva (`/espanol/la-selva/`), all on one stream | **no** — its own **Español** page (`#/espanol`), from its own stream-filtered queries; their `game_scores` rows are split out by gameName. The student's existing session (a class member keeps their uid, so the class's teacher can read it under rules 6, 10b and 11b). Never the start-screen name, anything typed or the class-vote hand counts. Sessions tagged `?src=test` are left out of the Español page |

**Español stories** (`/espanol/*`, 2026-11-27) report on one stream, `espanol`, loaded by
`/js/story-tracking.js` (which loads AuthCore and Telemetry and queues the story's calls until
they are ready). What each records:
- `choice` events: every Puerta `{ scenarioIndex: 1–5, choiceIndex, score: 0|1, category: 'gate' }`,
  once (a Puerta locks after one answer, so it is the first try; El Viaje's Puerta 3 repair
  does not change it). Puertas 1–2 (and every El Viaje Puerta): `choiceIndex` is the option
  picked; El Mundial's verb-chip Puertas 3–5: how many slots were right. Forks:
  `{ scenarioIndex: 'f1'|'f2'|'f3', choiceIndex, category: 'fork' }`, no score (El Viaje f3:
  how many dishes were ordered). La selva (2026-11-28): Puertas 1–4 are each one picture tap,
  `choiceIndex` the picture in report.json order and `choice` its item id only (`p1:roca`);
  its fork is `{ scenarioIndex: 'f1', choiceIndex, choice: 'f1:carreta'|'f1:colibries' }`.
- the session `summary`: `{ gates: { 1: 0|1, … }, path: { f1, … }, mode: 'solo'|'class' }`,
  rewritten after every Puerta and fork, plus `score` at the end. Mission Control reads this.
- `module_complete` once, on reaching la carta, and one `game_scores` doc
  `{ gameName, completed: true, score, finalScore, maxScore: 5 }` (El Viaje adds its own `confianza`;
  La selva has 4 Puertas, so `maxScore: 4`, and completes at the passport after its Aduana).
- `module_progress/{el-viaje|el-mundial|la-selva}`: `{ v, finished, state }`, `state` a JSON string of
  the Puertas and paths so far, for resume (La selva has no resume yet; it also writes its
  Embarque → Aduana `checks` there itself, three picture taps each, instead of /js/espanol-checks.js).
- custom events: `ev_start`, `ev_gate_lock`, `fork_open`, `class_mode` / `class_vote` (`{gate}`
  only), `resume`, `ev_audio_play` and a few more. None carries a name or typed text.

**Simulations** (`/simulations/*`) each report on their own stream and are in none of the core
figures. Insider's Simulations page (`#/simulations`) loads every simulation's sessions and events
with `where('stream', '==', …)` queries of its own (the `SIMS` list in `public/insider/index.html`:
stream, name, page, event prefix, step count) and shows, across all four and per simulation:
sessions, learners, completions, median active time, Present-mode use, how far learners got,
each prediction's answer split and how often the guess matched the model, the try-it step
(first-try and eventual success, attempts, failure reasons, hints), and the explain-it /
new-situation questions answered best on the first try. All four simulations share one event
vocabulary (`<prefix>_prediction`, `_reveal`, `_attempt`, `_hint`, `_mode`, `_explanation`,
`_transfer`), so a new simulation that keeps it needs one `SIMS` row and nothing else.

**Take the Bait** is a Mob Control-style battle (fire your crew through multiplier gates, smash Scam HQ) followed by three Real or Bait? messages and Jodi's recap after every level. It is visible on the games hub and assignable
in Mission Control, but on its own stream so holiday-scale play cannot skew the core funnel.
The registry marks it with `stream` (see the `stream` contract in
`public/data/modules-registry.json`); its Insider `COURSES` row carries `offFunnel: true`,
which lifts it out of `COURSES` before any core figure is computed, and its `game_scores`
rows (gameName `Take the Bait`) are split into `D.offFunnel.scores` at load. The Take the
Bait page reads its sessions and events through two `where('module', '==', 'take-the-bait')`
queries of its own, so it stays complete however busy the shared windows are.

What it records (one session per level played):

| Event | When | Meta |
|---|---|---|
| `step` | a Real or Bait? message is answered | step = answers this level (3) |
| `choice` | each Real or Bait? answer | `level, pick ('real'\|'bait'), isReal, pickedReal, cardsReal, techniques, technique, outcome ('trusted'\|'bait'\|'spotted'\|'over_scroll'), usedCheck (always false)` |
| `real_or_bait` | each Real or Bait? answer | `level, itemId, answeredReal, isReal, correct, technique` |
| `level_start` / `level_end` | level start / results | `level, won, heartsLeft, baseHpLeft, baseHp, realOrBaitScore, speedSetting, fired, multiplied, botsStopped, durationMs` |
| `module_complete` | Level 5 won | — |

Like Pattern Lab it never writes `category` on a choice (techniques are not in the routing
vocabulary; the field is `technique`) and never loads `/js/skill-routing.js`. The session
`summary` uses the four games' shape (`scenariosPlayed`/`correct` = Real or Bait answers / right,
`categories` = bait seen/spotted per technique) plus a `ttb` block, which is what Mission
Control's Agent Detail reads. A student in a class (a Task Force membership) also gets
`users/{uid}/game_scores/{visitId}`; any other session gets telemetry only, with no name
and no free text.

Pattern Lab is a free CogAT-style practice diagnostic published for parents arriving from
search. It is not a step toward a GoodBlock and its visitors did not come from the dashboard,
so counting its sessions would inflate "module visits" and deflate the game→GoodBlock
conversion rate — the metric the whole funnel thesis rests on. `public/insider/index.html`
partitions non-`core` streams into `D.offFunnel` in `loadEverything()`, once, before anything
is computed, rather than filtering at each of the twenty-odd places sessions are read. A
filter added per call site is a filter somebody forgets on the twenty-first.

What Pattern Lab records instead, and why, is the per-item calibration data: for every
answered item its subtest, its level, whether it was cleared, and **which distractor was
chosen when it was not**. The L11/L12/L13 labels on the 297 items were assigned by design
judgment and have never been normed against real students. If learners clear a subtest's
"L13" items at the same rate as its "L11" items, that subtest's levelling is wrong and the
bank needs recalibrating — this is the data that answers it. Get it out of Insider with
**Data → Exports → Pattern Lab items**.

Two things Pattern Lab deliberately does NOT do: it never writes a `category` on a choice
event (its nine subtests are not in the routing vocabulary — the field is `subtest`), and it
never loads `/js/skill-routing.js`, so nothing there can resolve to a GoodBlock.
`scripts/check-modules.js` fails the build on either.

Pattern Lab has no row in the "Steps per module" table below because it has no Insider
`COURSES` entry — by design. Its step total is not fixed: the learner picks a 9-, 18- or
27-item session, and `Telemetry.plan()` records the real one once they have.

Each module calls `Telemetry.init()` once and then `step()`, `choice()` and `complete()` at
the moments that matter. Steps per module:

| Module | Step unit | Total |
|---|---|---|
| Digital Decisions Challenge | scenarios answered | 28 |
| Jolene's Lemonade Challenge | pages reached | 19 |
| Social Intelligence | cases reached | 7 |
| Privacy & Security | cases reached | 6 |
| Digital Citizenship | cases reached | 7 |
| Professional Brand | cases reached | 7 |
| Money as a Skill | cases reached | 7 |
| Conflict Has a Winner | cases reached | 7 |
| Reading the Room | cases reached | 7 |
| Real World Ready Challenge | scenarios answered | 24 |
| Ten Voices, One Source | cases reached | 6 |
| The Question Decides the Answer | cases reached | 6 |
| Where You Say It | cases reached | 6 |
| The Cost of Later | cases reached | 6 |
| Room to Think Challenge | scenarios answered | 24 |
| Read the Signal | rounds played | 10 |
| Before You Send | rounds played | 10 |
| The Rumor Mill | rounds played | 10 |
| Money Moves | rounds played | 10 |
| Take the Bait | Real or Bait answers | 3 |
| El Viaje | sections reached | 12 |
| El Mundial | sections reached | 10 |
| La selva | sections reached | 11 |

The table above is hand-written but no longer hand-*checked*: `node scripts/check-modules.js`
verifies every row against Insider's `COURSES` and against the shared registry, and fails on a
row with no module or a module with no row. It is not generated, deliberately — generating it
would mean this file could only be read correctly by running a script, and the numbers in it
are the ones a reviewer most often wants to read straight off the page. Regenerate-on-drift is
the check's job; the table stays plain Markdown.

Modules belong to a Lab Pack. **`public/data/modules-registry.json`** is the single list of
every module — game, GoodBlock and Challenge — and carries `pack` on every entry
(`'digital-decisions'`, `'real-world-ready'`, `'room-to-think'`, and `null` for a game, which
routes across packs rather than belonging to one). The dashboard, all three Lab Pack hubs and
`/js/skill-routing.js` read it; each pack's dashboard card has its counter, duration and
status pill derived from the entries with that pack. Insider's `COURSES` does not carry `pack`
today; group by the `category` label or by the module ids listed above if you need a per-pack
view.

**The four standalone games are in the pipe now too.** Read the Signal, Before You Send, The
Rumor Mill and Money Moves each used to write a bespoke document to a root-level
`game_sessions` collection. As of 2026-09-13 they call `Telemetry.init()` / `.step()` /
`.choice()` / `.complete()` like every other module, so their sessions and events land in
`artifacts/{appId}/sessions` and `artifacts/{appId}/events` alongside the GoodBlocks. Two
things are worth knowing when querying them:

- a `choice` event from a game carries the scenario's **skill tag** in `meta.category` — the
  routing vocabulary in the registry's `skillTags`, not free text;
- a game's session document carries a **`summary`** map (scenariosPlayed, correct, the
  per-category breakdown, `clickedDeeperLink`). That is deliberate rather than incidental: a
  teacher can read their own students' sessions (rules #10b) and cannot read events at all
  (#11), so Mission Control's per-game strip reads the summary, not the event stream.

A 20-minute visit costs roughly 25 to 30 Firestore writes (one session rewrite per 45s plus
the events), which is well inside the free tier at current traffic.

## 2. How long any of this is kept

Everything above is deleted **90 days after the last activity on the record.** This is not a
target, it is what the published privacy policy already promises under *"Data Retention &
Minimization (Under 13)"* — so the job of the prune job is to make the database match the
promise, not to set a new one.

| Collection | Clock starts from | Window |
|---|---|---|
| `events/{id}` | `ts` — when the event was written | 90 days |
| `sessions/{sessionId}` | `lastSeenAt` — refreshed while the visit is ongoing | 90 days |
| `course_feedback/{id}` | `timestamp` — when the student pressed submit | 90 days |

A record still receiving activity is not deleted; the clock restarts each time it is touched.
Nothing here expires on its own — deletion happens when `scripts/prune-telemetry.js` is run,
so somebody has to run it (`--dry-run` first reports what would go without deleting anything).

**`course_feedback` is the one that needs care.** It is the only collection holding free text a
student typed, and the students typing it are often under 13. Two things make a parental
deletion request answerable:

- Rows from before 2026-11-24 carry **`ageTier`**; newer rows don't, because every student is
  treated as a child. Either way the row carries the student's **`uid`**, which is how a
  request is answered.
- **Nobody but an allowlisted admin can read or delete this collection** — not teachers, not
  the public (`firestore.rules` #8). That has not changed and should not.

So: a parent writes in, an admin filters `course_feedback` by that child's `uid`, finds the
comment, and deletes it. Past 90 days the prune job has
already removed it.

### Who owns this — and who is allowed to delete

**OWNER: William (founder decision, 2026-11-27).**

**The policy** (public/privacy.html §8): we keep a student's progress while it's in use. Once a
year, by hand, we delete student records with no activity in the past 2 years (730 days), and we
delete a specific student's data anytime a parent, teacher or school asks. Nothing deletes on a
schedule.

**Every week:** `.github/workflows/retention-report.yml` runs a dry run of
`scripts/prune-telemetry.js` (Mondays 07:00 UTC) and writes how much activity data is past the
2-year window to the run's summary page. It deletes nothing, and a failed run is not an
all-clear.

**Once a year:** run **Actions → "Yearly student-data cleanup (deletes data)"**
(`.github/workflows/retention-cleanup.yml`). Type `PREVIEW` first to see what would go, then run
it again with `DELETE`. It removes activity logs past the window (`prune-telemetry.js
--confirm-delete`), then student accounts inactive past the window, teachers never included
(`delete-guest-accounts.js --live --inactive-days=730`). Both scripts refuse a window shorter
than the policy's, and `prune-telemetry.js` no longer deletes unless `--confirm-delete` is
passed (the old footgun is fixed).


## 3. What Insider shows

- **Overview**: accounts, active learners, module visits, completions, activity by day, user
  mix, courses at a glance, latest messages, live event feed.
- **Users**: filter by type (Learner Recruit and 13+ Account are legacy types and no longer
  grow; Teacher, Guest, in a classroom,
  active 7d, completed something), sort by last active / most visits / most completions /
  most time on task / name, search by name, email, uid or recruit code. Click a row for the
  full profile: per-course status and progress, best score, time, recent sessions, score
  history, their messages and feedback, and the deletion tool.
- **Courses**: per-module completion rate, learners, visits, average best score, median time
  (and median time to finish), rating with distribution, visits per week, a progress funnel
  (share of learners reaching each step, so the biggest drop shows where people quit),
  entry point and device mix, hardest scenarios by average score, learner roster, written
  feedback.
- **Classrooms**: every classroom with a per-student status grid across all modules.
- **Inbox** and **Feedback**: filterable, searchable, linked to the sender's profile.
- **Tools**: CSV export of every table, data-source health, and the deletion-request tool.

The date-range picker (7d / 30d / 90d / All) applies to time-stamped activity (visits,
sessions, ratings, trend charts). Completion rate and funnels are all-time, so a learner's
status is never wrong just because they finished before the window.

## 4. Getting this into a BI tool

Three options, in order of effort:

1. **CSV export (available now).** Tools page in Insider. Drop the files into Google Sheets
   or Looker Studio's file upload connector. Fine for a monthly review.

2. **Firestore to BigQuery, then Looker Studio (recommended for live dashboards).**
   Install the official "Stream Firestore to BigQuery" Firebase Extension once per
   collection you care about (`sessions`, `events`, `course_feedback`, and the
   `game_scores` collection group). Each write is mirrored into a BigQuery table within
   seconds; Looker Studio connects to BigQuery natively and is free. The `sessions` table
   alone answers time-on-task, drop-off and completion trend questions with plain SQL.
   Backfill of existing docs is a one-time script the extension provides.

3. **Google Analytics 4.** Two properties, kept on strictly separate surfaces:

   | Property | Loads on | Gate |
   |---|---|---|
   | `G-EN4M7T3BLQ` (product) | `/dashboard/` only | `ag_account === '1'` (a signed-in teacher; students never are) |
   | `G-P6DZJ685W6` (public marketing) | `/`, `/for-teachers/`, `/about/` | none needed — signed-out pages |
   | `G-P6DZJ685W6` (public marketing) | `/mission-control/` (since 2026-11-25) | `ag_account === '1'` AND load() confirmed `role: 'teacher'`; fails closed |

   The product property fires `launch_module` from the dashboard. `telemetry.js` forwards
   every event to `gtag` when it is present on the page, so adding the GA snippet to a
   module page would send `module_open`, `step`, `choice` and `module_complete` to GA4 as
   well, where they can be used in Explorations or Looker Studio's GA4 connector.

   The marketing property is scoped to the three signed-out pages so that top-of-funnel
   traffic can be measured without any authenticated-student surface being instrumented.
   Those pages load no auth, no identity gate and no `telemetry.js`, so a hit there can
   carry no learner identity. Do not add `G-P6DZJ685W6` to `/dashboard/`, `/jsh/` or
   `/educational-games/`. Mission Control (teachers only) loads it behind the gate above and
   sends only `class_created`, `pro_panel_open`, `get_pro_click`, `guide_download`,
   `content_assigned` and `product_updates_toggle` — never a uid, email, class code or any
   student data. Mark `class_created` and `get_pro_click` as key events in GA once they appear.

   **COPPA note before enabling GA on modules:** every student is anonymous and may be under
   13. GA4 sets cookies and collects device identifiers, which is a different privacy posture
   from the uid-only telemetry above. `telemetry.js` already forwards to GA only for a
   non-anonymous (teacher) session; keep it that way, or turn on GA4's child-directed
   treatment. The
   Lab Pack hub calls `gtag` today but never loads it, so those launch events are dropped.

## 5. Things worth adding next

- The end-of-module rating prompt exists only in Digital Decisions. Jolene's and both labs
  have the shared `AuthCore.submitCourseFeedback()` available; adding the prompt makes the
  Feedback page and the per-course rating tiles fill in for every module.
- `Telemetry.choice()` is wired for the two scenario games. The labs have interactions
  (reaction picks, sorting tasks) that could be tracked the same way to see which case
  activities learners struggle with.
- A `Telemetry.track('hint_used')` or similar custom event costs one line wherever it is
  useful; it will show up in the event stream and the CSV export automatically.

## 6. Deploy checklist

- `firestore.rules` gained rules for `sessions`, `events`, collection-group reads and
  recruit-code deletion (and, on 2026-11-24, made `recruit_codes` read-only and required a
  teacher sign-in — Google or email, never anonymous — to create a class). They deploy automatically on merge to `main` (see
  `.github/workflows/firebase-firestore-rules.yml`). They went live on 2026-09-06 (run #2
  of that workflow, re-run after a service-account permission fix). If a later rules deploy
  fails, Insider shows an amber "some data sources didn't load" strip naming the affected
  sources; check the workflow run before assuming a code problem.
- A source can also be denied because the rules simply don't grant what Insider asks for.
  Insider LISTS whole collections, and in Firestore a `list` grant only takes effect on a
  match statement that addresses a DOCUMENT (`/users/{userId}`); a statement addressing the
  collection (`/users`) matches no request and silently grants nothing. `tests/firestore-rules.test.mjs`
  now asserts every one of the ten sources plus `recruit_codes` for the admin allowlist —
  run `npm run test:rules` (needs Java) after touching `firestore.rules`. A denied `users`
  is the loudest failure: `userIndex` still fills from the other sources, but every entry is
  flagged `orphan` and the Overview and Users pages filter orphans out, so both render empty
  while the session and event counters keep showing numbers.
- Firebase Hosting serves HTML with a one-hour `Cache-Control: max-age=3600` by default, so
  a freshly deployed Insider (or dashboard) can stay stale in a browser for up to an hour.
  A hard refresh (or a private window) shows the deployed version.
- Insider's sessions and events queries order by `startedAt` / `ts`, which use Firestore's
  automatic single-field indexes. No composite index is needed. If Firestore ever asks for
  one, the browser console prints a one-click link.
- `COURSES` in `public/insider/index.html` and the "Steps per module" table above are two of
  the hand-maintained module lists; `node scripts/check-modules.js` verifies they agree
  with each other and with the dashboard, the Lab Pack hub and each module's
  `Telemetry.init` call. See "Publishing a module" in `docs/goodblock-integration-checklist.md`.


## Where a visit came from (2026-11-25)

The site nav's inline script records, once per browser session (`sessionStorage.ag_src`),
`?src=`, `utm_source`, `utm_medium`, `utm_campaign` and the referring site's **host** (never
its path or query). Each value is lowercase `[a-z0-9._-]`, max 40 characters, else `other`.
`telemetry.js` (`detectSource`) writes it to the session doc as
`source: { src, utmSource, utmMedium, utmCampaign, refHost }`; `firestore.rules` (`sourceOk`)
enforces the shape and keeps it fixed after create. No cookies, nothing personal.

Insider → **Sources** groups sessions (core and off-funnel) by `src`, else `utmSource`, else
`site: <refHost>`, else `direct`; sessions from before this date show as `not recorded`.

**How to tag a link**

| Where the link goes out | Add to the URL |
|---|---|
| Outreach email | `?src=email&utm_campaign=outreach-2026-11` |
| Facebook post | `?src=facebook` |
| TPT facilitator guide | `?src=tpt` (already on the simulation links) |
| LinkedIn | `?src=linkedin` |
