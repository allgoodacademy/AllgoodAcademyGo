# Insider analytics: what is tracked, where it lives, and how to get it into a BI tool

Insider (`public/insider/index.html`) is the owner-facing BI view for Allgood Academy. This
note explains the data behind it, so you know what each number means and how to take the
same data further (Looker Studio, BigQuery, Sheets) when you want to.

## 1. What every module records

All data lives in Firestore under `artifacts/allgood-academy/…`. Two kinds of records exist:

### Legacy per-user records (written since the start)

| Path | Written by | What it holds |
|---|---|---|
| `users/{uid}` | auth-core.js | displayName, email (13+ only), role, ageTier, recruitCode, classroomCode, lastLogin |
| `users/{uid}/launches/{id}` | dashboard launch button | courseName, targetUrl, timestamp. Only dashboard launches. Lab Pack hub launches are not written here. |
| `users/{uid}/game_scores/{sessionId}` | DDC, Jolene's, both labs | gameName, finalScore / percentage / rank (games), completed flag (labs), lastUpdated |
| `users/{uid}/game_scores/{sessionId}/scenario_attempts/{n}` | DDC, Jolene's | scenarioIndex, choiceIndex, score (0 to 3), effectiveness, question |
| `users/{uid}/module_progress/{slug}` | every module | resume state: answered scenarios (games) or highestUnlocked case (labs) |
| `course_feedback/{id}` | DDC only today | rating 1 to 5 plus free text |
| `messages/{id}` | Message HQ on every portal | free-text messages with source portal |
| `classrooms/{code}`, `recruit_codes/{code}` | dashboard / auth-core | roster and recruit passphrases |

What this could NOT answer: time spent, where in a module people quit, how they arrived,
what device they used, or anything about a lab visit that did not end in completion.

### Telemetry records (new, written by `public/js/telemetry.js`)

| Path | What it holds |
|---|---|
| `sessions/{sessionId}` | One doc per module visit: uid, module, gameName, startedAt, lastSeenAt, **activeMs** (only while the tab is visible), **maxStep / stepsTotal**, completed, **device**, **entry** (dashboard, lab-hub, direct, external), role / ageTier / isGuest copied from the account |
| `events/{id}` | Append-only stream: `module_open`, `step`, `choice`, `module_complete`, plus any custom `Telemetry.track()` call. Each has uid, module, sessionId, step, meta, ts |

Each module calls `Telemetry.init()` once and then `step()`, `choice()` and `complete()` at
the moments that matter. Steps per module:

| Module | Step unit | Total |
|---|---|---|
| Digital Decisions Challenge | scenarios answered | 30 |
| Jolene's Lemonade Challenge | pages reached | 19 |
| Social Intelligence | cases reached | 7 |
| Privacy & Security | cases reached | 6 |
| Digital Citizenship | cases reached | 7 |

A 20-minute visit costs roughly 25 to 30 Firestore writes (one session rewrite per 45s plus
the events), which is well inside the free tier at current traffic.

## 2. What Insider shows

- **Overview**: accounts, active learners, module visits, completions, activity by day, user
  mix, courses at a glance, latest messages, live event feed.
- **Users**: filter by type (Learner Recruit, 13+ Account, Teacher, Guest, in a classroom,
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

## 3. Getting this into a BI tool

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

3. **Google Analytics 4.** The measurement ID `G-EN4M7T3BLQ` is already configured on the
   dashboard, which fires `launch_module`. `telemetry.js` forwards every event to `gtag`
   when it is present on the page, so adding the GA snippet to a module page would send
   `module_open`, `step`, `choice` and `module_complete` to GA4 as well, where they can be
   used in Explorations or Looker Studio's GA4 connector.

   **COPPA note before enabling GA on modules:** Learner Recruits are under 13. GA4 sets
   cookies and collects device identifiers, which is a different privacy posture from the
   uid-only telemetry above. If you turn it on, either gate it to 13+ / teacher accounts
   (telemetry.js already knows `ageTier`) or turn on GA4's child-directed treatment. The
   Lab Pack hub calls `gtag` today but never loads it, so those launch events are dropped.

## 4. Things worth adding next

- The end-of-module rating prompt exists only in Digital Decisions. Jolene's and both labs
  have the shared `AuthCore.submitCourseFeedback()` available; adding the prompt makes the
  Feedback page and the per-course rating tiles fill in for every module.
- `Telemetry.choice()` is wired for the two scenario games. The labs have interactions
  (reaction picks, sorting tasks) that could be tracked the same way to see which case
  activities learners struggle with.
- A `Telemetry.track('hint_used')` or similar custom event costs one line wherever it is
  useful; it will show up in the event stream and the CSV export automatically.

## 5. Deploy checklist

- `firestore.rules` gained rules for `sessions`, `events`, collection-group reads and
  recruit-code deletion. They deploy automatically on merge to `main` (see
  `.github/workflows/firebase-firestore-rules.yml`). They went live on 2026-09-06 (run #2
  of that workflow, re-run after a service-account permission fix). If a later rules deploy
  fails, Insider shows an amber "some data sources didn't load" strip naming the affected
  sources; check the workflow run before assuming a code problem.
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
