# Money as a Skill — Storyboard (AS BUILT)

**GoodBlock:** Money as a Skill
**Lab Pack:** Real World Ready
**Slug:** `real-world-ready-money`
**File:** `public/jsh/digital-decisions-lab/real-world-ready-money/index.html`
**Status:** Corrected in the Real World Ready Lab Pack sprint (that pass) per the coverage map (`01-coverage-map-AUTHORITATIVE.md`) and pushed to `claude/money-skill-goodblock-poc-1atbyv` (PR #11). A follow-up pass folded the intro into the counted Case flow as Case 1 and the feedback page as Case 7 (total Cases 5 → 7; `Telemetry.init` `stepsTotal` 6 → 7). Static checks passed both passes; manual browser QA not yet performed.

## Corrections applied this pass

Per the coverage map's terminology lock (Case = one page in a GoodBlock; Scenario = one graded Challenge item — the two must never share a label):

| # | Was | Now |
|---|---|---|
| 1 | Page labels "Case 1"…"Case 5" | "Case 2"…"Case 6" (interactive pages keep this numbering; the intro is Case 1 and the feedback page is Case 7) |
| 2 | No label on the intro/startup screen | "Before We Start", now badged "Case 1" and folded into the counted flow |
| 2b | No label on the feedback/rating page | Badged "Case 7" (the flow's last numbered Case) |
| 3 | Badge: "5 cases completed" | "8 scenarios completed" (counts the `money` category's 8 Challenge scenarios, not the 5 Cases — these are different, correct numbers measuring different things) |
| 4 | Post-completion redirect: `/jsh/` | `/jsh/real-world-ready/` (the new Lab Pack hub) |
| 5 | No A/B marker on the completion doc | `narrativeStyle: 'second-person'` added to the Firestore write |

**Deviation — module path not moved.** The hub spec offered moving the module to `/jsh/real-world-ready/money-as-a-skill/` as an option "if clean given routing conventions." Given the number of existing hardcoded links to `/jsh/digital-decisions-lab/real-world-ready-money/` (MODULE_REGISTRY, Insider COURSES, the Digital Decisions Lab Pack hub's card + menu, `check-modules.js`'s DDL-specific assertions) and the time budget for this sprint, the module was left at its current path. Every redirect and new registry entry points at the existing path; the Real World Ready hub's Money as a Skill card links there directly. This is a live deviation, not an oversight — a future pass can move the file and update the small number of link sites in one pass if desired.

## Identity

| Property | Value |
|---|---|
| Accent color | `#C97D1A` |
| Icon | `coins` (verified against the Lucide icon library) |
| Jodi continuity | Solo — no recurring characters, no callbacks to other GoodBlocks |
| Total Cases | 7 ("Before We Start" is Case 1, pages 2–6 are the 5 interactive Cases, the feedback page is Case 7). Header counter shows `X / 7`. |
| Coverage-map scenario count | 8 (`money` category, M1–M8) |
| Badge text | "8 scenarios completed" |
| Post-completion redirect | Real World Ready hub (`/jsh/real-world-ready/`) |
| `narrativeStyle` | `second-person` |

## Scenarios as built

1. **The Split Decision (Case 2)** — misconception: 50/50 is fair by definition. Three-way commitment choice (pay evenly / propose proportional split / pass), no gate, all three paths valid and locked on pick. Covers M1, M2.
2. **The Impulse Window (Case 3)** — misconception: if I have the money and want it now, buying now is obvious. Three options where the third ("think it through with Jodi") is a non-committing intermediate beat that reveals the 48-hour-window mechanism, then re-exposes the two real commit options (buy / wait). Covers M3, M4.
3. **The Group Fund (Case 4)** — misconception: being a good friend means saying yes to holding group money. Four independent toggles (conditions) plus a commit button whose label updates live based on toggle state (plain "I'll do it" / "I'll do it with these conditions" / "I'd rather not" when someone-else-holds-it is toggled). Covers M5, M6.
4. **The Upgrade Trap (Case 5)** — misconception: more expensive = better and worth it. Investigate-then-commit: two "Look closer" reveals sharing a 2-check budget, with both commit buttons ($18 / $45) enabled from the start — no gating on investigation. Covers M7.
5. **The Ask (Case 6)** — misconception: asking for a discount is rude or adults-only. Same intermediate-beat pattern as Case 3: a non-committing "what's the worst that could happen" option reveals the ask-math mechanism, then re-exposes pay-full-price / ask-for-less. Covers M8.

Each scenario's entry line, whiteboard copy, per-option Jodi lines (mood-tagged), and completion reframe match the sprint prompt verbatim — content was not altered from the source spec during implementation.

## Verified

- `node --check` on every inline `<script>` block (edited file + edited registry files)
- `<div>` tag balance (102 open / 102 close, unchanged by this pass's edits)
- No duplicate element IDs; every `onclick` handler resolves to a defined function
- No stray unicode/smart-quote artifacts
- `node scripts/check-modules.js` passes (registry/hub/Insider/docs counts agree, including the two new labs and the Challenge)
- `coins` icon confirmed to exist in the Lucide icon set
- Grepped the file for "Scenario" as a page label — none remain; the word appears only in code comments

## Not yet verified

- Real browser rendering and click-through of all 5 scenarios (desktop + mobile/narrow viewport)
- Whiteboard desktop-panel vs. mobile-inline routing actually displaying correctly
- Jodi mood-image swaps, portrait-tap recall, and multi-attempt icon init timing
- Rating/badge/hub-redirect flow end-to-end
- Firebase auth/identity-gate and progress save/restore against real Firestore

This file supersedes the inline sprint prompt as the source of truth for what was actually shipped; the sprint prompt remains the original DRAFT spec.
