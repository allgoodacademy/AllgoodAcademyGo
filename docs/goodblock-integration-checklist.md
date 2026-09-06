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

## Firestore rules

- [ ] If this GoodBlock writes to a new top-level collection (rare — `game_scores`,
  `course_feedback`, and the per-uid `module_progress` subcollection already cover most
  needs), add a rule for it in `firestore.rules` and confirm the deploy actually reached
  production: check the `Deploy Firestore Rules` GitHub Actions run succeeded. That
  pipeline has had a real, unresolved-as-of-writing permission failure (403 on the Rules
  API) — if it fails, the fallback is to manually paste `firestore.rules` into Firebase
  Console → Firestore Database → Rules and publish it directly, since CI failing silently
  here means the rule is simply never live.

## Assets & icons

- [ ] Reuse Jodi's mood SVGs from `public/assets/jodi/*.svg` by URL — don't re-embed them
  inline in a new GoodBlock file.
- [ ] Verify every new Lucide icon name via web search ("lucide icons `[name]`") before
  using it — a wrong or renamed icon fails silently (no error, just missing icon), and this
  has happened more than once.

## Before calling a GoodBlock's integration done

- [ ] Click through as a fresh Learner Recruit (never signed in before) — confirm the
  identity gate appears, resolves, and the module actually starts.
- [ ] Reach partway through, then simulate a return visit (reload after re-establishing the
  session) — confirm progress actually restores instead of restarting from the top.
- [ ] Confirm every launch point (dashboard card, hub card, hub menu entry) opens in the
  same tab and lands on a clean trailing-slash URL.
- [ ] `node --check` every inline `<script>` block after structural edits.
