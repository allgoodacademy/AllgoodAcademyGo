# GoodBlock Site-Integration Checklist

This is the "hook it into the live site correctly" companion to the `goodblock-builder-v1`
skill, which covers the creative side (interview → storyboard → chassis implementation) but
stops once a GoodBlock's content is built. Everything below is the separate list of wiring
steps that make a finished GoodBlock actually work in production — identity, progress,
navigation, completion tracking. Every item here was either learned or *broken* shipping
Social Intelligence, the first real GoodBlock. Update this file the same way
`technical-chassis.md` gets updated: when a new GoodBlock's integration reveals a new gotcha,
add it here so the next one doesn't repeat it.

## Identity

- [ ] Loads the shared modules, in this order, before any inline module script:
  `<script type="module" src="/js/auth-core.js"></script>` then
  `<script type="module" src="/js/identity-gate.js"></script>`.
- [ ] The startup screen's click handler calls `await window.AuthGate.ensureIdentified()`.
- [ ] The `skipPowerUp` fast-path (auto-continue for someone active in the last hour) uses:
  ```js
  let unsub;
  unsub = window.AuthCore.onAuthStateChanged(window.AuthCore.auth, () => {
      unsub();
      handleStartup();
  });
  ```
  **Never `const unsub = onAuthStateChanged(...)` with `unsub()` called inside that same
  callback.** Real Firebase defers the callback a tick so this usually doesn't crash, but a
  test mock (or a fast enough browser) can invoke it synchronously, throwing
  `ReferenceError`/`unsub is not a function` before the callback's own body finishes. This
  exact bug shipped once already (fixed first in `identity-gate.js`, then found again and
  fixed in Social Intelligence) — grep any new GoodBlock for `const unsub` before shipping.

## Dashboard registration

- [ ] Add an entry to `MODULE_REGISTRY` in `public/index.html` (`id`, `name`, `category`,
  `url`, `gameNames`, `isComplete`). Without this, the dashboard has no way to compute a
  real completed/in-progress/not-started status for the module.
- [ ] `url` uses a **trailing-slash directory path** (`/jsh/lab-pack/goodblock-name/`), never
  a literal `.../index.html`. Firebase Hosting serves the same file either way, but the
  literal form shows an ugly URL in the address bar — this exact bug shipped once
  (`/jsh/digital-decisions-lab/social-intelligence/index.html`) and had to be fixed across
  four separate hardcoded links pointing at the same page.
- [ ] If launched directly from the main dashboard (not just the Lab Pack hub), confirm the
  launch uses same-tab navigation. `window.launchCourse()`'s fallback path (for any course
  name not in `LAUNCH_TRANSITIONS`) is `window.location.href`, not `window.open` — it was
  originally `window.open(..., '_blank')` and every new-tab launch bug traces back to that
  one line. Don't reintroduce a new-tab fallback.

## Lab Pack hub wiring

- [ ] Add a live card to the Lab Pack hub (`public/jsh/<lab-pack>/index.html`)'s main grid,
  using `window.launchLab(name, url)`.
- [ ] Add the **same** entry to the hub's "Jump to a Lab" menu list — this is a second,
  separate place with its own hardcoded `onclick`, easy to update one and forget the other.
- [ ] Both use the trailing-slash URL form (see above) — same reasoning, same bug shipped
  in both places at once last time.
- [ ] The GoodBlock's own "back to hub" button/link (`returnToLabPack()` or equivalent) also
  uses the trailing-slash form.

## Progress save/restore

A GoodBlock that doesn't do this **restarts a student from Case 1 every time they leave and
come back** — this shipped as a real gap in Social Intelligence's first version, not caught
until a user reported it after cases were already live.

- [ ] On sign-in (`onAuthStateChanged`), call `window.AuthCore.loadModuleProgress('<slug>')`
  and, if it returns data, apply it via a `window.restoreModuleProgress(data)` function that
  rehydrates in-memory state and re-renders (unlock overlays, progress bar/header, any
  "ready" completion prompts).
- [ ] Call `window.AuthCore.saveModuleProgress('<slug>', {...})` at every real progress
  checkpoint (each case/scenario advance) — not just once at the very end. Include whatever
  state is cheap and meaningful to restore (an unlocked-through index, a completion map,
  small callback-relevant flags); it does not need to capture every UI pixel.
- [ ] The "Restart Lab" control (if one exists) also calls `saveModuleProgress` with the
  reset shape — otherwise a restart springs back to the old progress on the next reload.
- [ ] `<slug>` is unique across all modules (it's the Firestore doc ID under
  `module_progress/`) and matches what completion-writing code uses, so a future read/write
  is unambiguous.

## Completion tracking

- [ ] Completion write uses the same `game_scores` doc shape as every other module
  (`gameName`, plus either a numeric score or `completed: true`, `lastUpdated`, `user`).
- [ ] `gameName` here matches an entry in `MODULE_REGISTRY`'s `gameNames` array, and
  `isComplete` checks whatever field this GoodBlock actually writes (a flag vs. a score
  threshold) — these three things silently drift out of sync if written in different
  sessions without cross-checking.

## Message HQ ("Direct Line")

This used to be ~100 lines of copy-pasted button/modal/JS in every single module —
which is exactly how Privacy & Security shipped with **no** Message HQ at all: nobody
copied it forward. It's now standardized in `/js/message-hq.js`.

- [ ] Add one script tag, after `identity-gate.js`:
  ```html
  <script src="/js/message-hq.js" data-message-source="Jodi's Schoolhouse: <Module Name>"></script>
  ```
  That's it — no modal markup, no `openMessageModal`/`closeMessageModal`/`submitHQMessage`
  to write. The script injects the modal into the DOM at runtime and defines all three
  as `window` functions.
- [ ] Add a navbar button that calls `window.openMessageModal()` (copy the icon/button
  markup from an existing module, e.g. Social Intelligence's navbar — the button itself
  isn't shared since navbar layout/theming differs per module). **This step was written
  down here already and still got skipped shipping Professional Brand** — the script tag
  was added, the button never was, so the feature was silently unreachable. Run
  `node scripts/check-modules.js` before calling any module done: it now fails if a module
  loads `message-hq.js` without a matching `window.openMessageModal()` call anywhere on
  the page. A checklist item nobody re-checks doesn't catch this; a script that runs before
  ship does.
- [ ] **Don't** re-implement the modal, the send handler, or the identity check —
  `data-message-source` is the only per-module config. If a fix is needed (styling, copy,
  a new field to capture), fix it once in `message-hq.js`, not in each module.
- [ ] If a page needs a side effect on successful send (the main dashboard unlocks an
  "Intel Badge" this way), listen for the `messagehq:sent` event on `document` rather than
  editing the shared send logic:
  ```js
  document.addEventListener('messagehq:sent', () => { /* page-specific side effect */ });
  ```
- [ ] The shared `openMessageModal` already gates on `window.AuthGate.ensureIdentified()`
  when identity-gate.js is loaded (it is on every module) — a signed-out visitor is asked
  to sign in before the modal opens, not after typing a message and hitting send.

## Firestore rules

- [ ] If this GoodBlock writes to a new top-level collection (rare — `game_scores`,
  `course_feedback`, and the per-uid `module_progress` subcollection already cover most
  needs), add a rule for it in `firestore.rules` and confirm the deploy actually reached
  production: check the `Deploy Firestore Rules` GitHub Actions run succeeded. That
  pipeline's first run failed with a 403 on the Rules API (service account lacked
  permission); the permission was fixed and the re-run on 2026-09-06 released the rules
  (including the telemetry `sessions` / `events` rules) successfully. If it ever fails
  again, the fallback is to manually paste `firestore.rules` into Firebase Console →
  Firestore Database → Rules and publish it directly, since CI failing silently here means
  the rule is simply never live.

## Chrome sizing & mobile viewport

The header/footer chassis every module shares used to be two 60px strips, and on phones the
footer (which holds nothing but a copyright line in the Jodi's Schoolhouse labs) sat
mid-screen with a dead band under it. Root cause: `<body>` carries Tailwind's
`min-h-screen overflow-y-auto`, and on iOS `100vh` is the toolbar-collapsed height, so the
document could scroll by the toolbar height and push the header off the top. The fix
shipped across all five live modules at once. A new GoodBlock should copy the chassis from
one of the three labs (Social Intelligence, Privacy & Security, Digital Citizenship), not
from an older reference, and check:

- [ ] `.navbar-content` is `flex: 0 0 48px; position: relative` and `.footer-content` is
  `flex: 0 0 36px` (labs, copyright-only footer) or `52px` (challenges, whose footer carries
  the Back / Next buttons). Don't go back to 60px. The Lab Pack hub and the main dashboard
  keep their own 60px headers on purpose - they scroll normally and aren't on this chassis.
- [ ] `#flex-progress-bar` lives **inside the `<header>`** as its first child, pinned to the
  bottom edge (`position: absolute; bottom: 0`), not in the footer. That's what lets the
  footer be hidden on phones without losing the bar. The JS that sets `#flex-progress-fill`'s
  width is unchanged.
- [ ] Phone block, labs (`@media (max-width: 767px)`): size to the initial containing block
  and make the document unscrollable (`html { height: 100%; overflow: hidden }`, `body {
  height: 100%; min-height: 0 !important; overflow: hidden !important }`, `.app-shell {
  height: 100% }`), hide the footer (`footer.footer-content { display: none !important }`),
  and keep the header at `.navbar-content { flex: 0 0 auto; min-height: 52px; padding-top:
  env(safe-area-inset-top) }`. **Do not use `position: fixed` on html/body in the labs**: it
  was tried and Safari stopped delivering taps to the Message HQ button. The copyright line
  is therefore not rendered on phones in the labs; the challenges already hid theirs below
  `sm`, so this is parity.
- [ ] Phone block, challenges (`@media (max-width: 768px)`): same pinned document (DDC and
  Jolene's had it first), `header.navbar-content { flex: 0 0 auto; min-height: 48px;
  padding-top: max(env(safe-area-inset-top), 4px); padding-bottom: 4px }`. DDC hides its
  footer (its mobile HUD pill supplies Next); Jolene's keeps it because Back / Next live
  there. Apply the safe-area inset **once**, on the header rule - not also as a
  `pt-[env(...)]` class on the inner div, and never with a fixed `flex-basis` that would
  make the padded header overflow instead of grow.
- [ ] Never put a control (Next, Back, submit) in the footer of a lab - on phones it's gone.
  In-page continue prompts are the pattern.
- [ ] After any chassis edit, confirm on a real phone that the header stays put when the
  browser toolbar collapses/expands, and that the page cannot be rubber-band scrolled to
  reveal background under the shell.

## Assets & icons

- [ ] Reuse Jodi's mood SVGs from `public/assets/jodi/*.svg` by URL — don't re-embed them
  inline in a new GoodBlock file.
- [ ] Verify every new Lucide icon name via web search ("lucide icons `[name]`") before
  using it — a wrong or renamed icon fails silently (no error, just missing icon), and this
  has happened more than once.
- [ ] `data-lucide` is only safe for markup **present at page load**. Anything injected into
  the DOM *after* load (a dynamically-rendered checkmark, a badge added on the fly) should be
  hand-drawn inline SVG instead — Privacy & Security shipped checkboxes that rendered as
  empty boxes on a real device this way, with static checks finding nothing wrong. Relatedly,
  `createIcons()` replaces an `<i data-lucide>` with a rendered `<svg>`, so mutating
  `data-lucide` on that element later doesn't reliably re-render it — rewrite the container's
  `innerHTML` instead if an icon must change after load. Keep the retry ladder
  (100/400/1000/2000ms `createIcons()` calls after `DOMContentLoaded`) regardless — it's cheap
  insurance against an unrelated CDN load-timing race.

## Publishing a module: every list that has to change together

Shipping one GoodBlock touches several hand-maintained lists. They drift independently,
so update them in one pass and run `node scripts/check-modules.js` (also run by the
`Module registry check` GitHub Actions workflow on every push and pull request) before
calling it done:

- [ ] `MODULE_REGISTRY` in `public/index.html` — dashboard completion status. Labs use
  `category: 'lab'`; the Lab Pack card's status pill and "N live • M coming soon" counter
  are derived from those entries plus `LAB_PACK_PLANNED` (the full list of labs the pack
  will hold), so do not hand-edit the pill or counter text. When a lab that was only
  planned ships, its name is already in `LAB_PACK_PLANNED`; when a brand-new lab is
  planned, add it there.
- [ ] `COURSES` in `public/insider/index.html` — Insider analytics (`stepsTotal`,
  `stepLabel`, `isComplete`, `progressStep`). `stepsTotal` must equal the module's own
  `Telemetry.init({ stepsTotal })` call.
- [ ] Lab Pack hub card + "Jump to a Lab" menu entry in
  `public/jsh/digital-decisions-lab/index.html` — student-facing; remove the matching
  "Coming Soon" placeholder.
- [ ] "Steps per module" table in `docs/insider-analytics.md`.
- [ ] The hardcoded `3` above `MODULES` in the dashboard stat block counts dashboard
  *cards* (Jolene's, Digital Decisions, Lab Pack), not registry entries. A new lab inside
  the pack does not change it; a new card does.

Why not one manifest: the three code consumers need different fields (completion
predicates, step counts, card icons and copy), Insider and the dashboard already disagree
on Jolene's completion rule on purpose, and the hub cards are static HTML with per-lab
accent colours. Merging them into one runtime-loaded file would mean rendering the hub
from JS and reconciling those predicates, which is more risk than the duplication costs.
The check script is the compromise: the lists stay where they are, but cannot silently
disagree.

## Before calling a GoodBlock's integration done

- [ ] Click through as a fresh Learner Recruit (never signed in before) — confirm the
  identity gate appears, resolves, and the module actually starts.
- [ ] Reach partway through, then simulate a return visit (reload after re-establishing the
  session) — confirm progress actually restores instead of restarting from the top.
- [ ] Confirm every launch point (dashboard card, hub card, hub menu entry) opens in the
  same tab and lands on a clean trailing-slash URL.
- [ ] `node --check` every inline `<script>` block after structural edits.
