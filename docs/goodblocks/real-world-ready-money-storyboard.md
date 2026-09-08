# Money as a Skill — Storyboard (AS BUILT)

**GoodBlock:** Money as a Skill
**Lab Pack:** Real World Ready
**Slug:** `real-world-ready-money`
**File:** `public/jsh/digital-decisions-lab/real-world-ready-money/index.html`
**Status:** Built and pushed to `claude/money-skill-goodblock-poc-1atbyv` (PR #11). Static checks passed; manual browser QA not yet performed.

## Identity

| Property | Value |
|---|---|
| Accent color | `#C97D1A` |
| Icon | `coins` (verified against the Lucide icon library) |
| Jodi continuity | Solo — no recurring characters, no callbacks to other GoodBlocks |
| Total scenarios | 5 |
| Badge text | "5 scenarios completed" |
| Post-completion redirect | Main JSH hub |

## Scenarios as built

1. **The Split Decision** — misconception: 50/50 is fair by definition. Three-way commitment choice (pay evenly / propose proportional split / pass), no gate, all three paths valid and locked on pick.
2. **The Impulse Window** — misconception: if I have the money and want it now, buying now is obvious. Three options where the third ("think it through with Jodi") is a non-committing intermediate beat that reveals the 48-hour-window mechanism, then re-exposes the two real commit options (buy / wait).
3. **The Group Fund** — misconception: being a good friend means saying yes to holding group money. Four independent toggles (conditions) plus a commit button whose label updates live based on toggle state (plain "I'll do it" / "I'll do it with these conditions" / "I'd rather not" when someone-else-holds-it is toggled).
4. **The Upgrade Trap** — misconception: more expensive = better and worth it. Investigate-then-commit: two "Look closer" reveals sharing a 2-check budget, with both commit buttons ($18 / $45) enabled from the start — no gating on investigation.
5. **The Ask** — misconception: asking for a discount is rude or adults-only. Same intermediate-beat pattern as Case 2: a non-committing "what's the worst that could happen" option reveals the ask-math mechanism, then re-exposes pay-full-price / ask-for-less.

Each scenario's entry line, whiteboard copy, per-option Jodi lines (mood-tagged), and completion reframe match the sprint prompt verbatim — content was not altered from the source spec during implementation.

## Verified

- `node --check` on every inline `<script>` block (new file + edited registry files)
- `<div>` tag balance (102 open / 102 close)
- No duplicate element IDs; every `onclick` handler resolves to a defined function
- No stray unicode/smart-quote artifacts
- `node scripts/check-modules.js` passes (registry/hub/Insider/docs counts agree)
- `coins` icon confirmed to exist in the Lucide icon set

## Not yet verified

- Real browser rendering and click-through of all 5 scenarios (desktop + mobile/narrow viewport)
- Whiteboard desktop-panel vs. mobile-inline routing actually displaying correctly
- Jodi mood-image swaps, portrait-tap recall, and multi-attempt icon init timing
- Rating/badge/hub-redirect flow end-to-end
- Firebase auth/identity-gate and progress save/restore against real Firestore

This file supersedes the inline sprint prompt as the source of truth for what was actually shipped; the sprint prompt remains the original DRAFT spec.
