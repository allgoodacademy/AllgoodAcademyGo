# Conflict Has a Winner — Storyboard (AS BUILT)

**GoodBlock:** Conflict Has a Winner
**Lab Pack:** Real World Ready
**Slug:** `conflict-has-a-winner`
**File:** `public/jsh/real-world-ready/conflict-has-a-winner/index.html`
**Spec:** `02-storyboard-conflict-has-a-winner.md` (build package, deleted after this sprint per the sprint prompt's cleanup step — this document is now the durable record)
**Status:** Built and pushed to `claude/money-skill-goodblock-poc-1atbyv` (PR #11). Static checks passed; manual browser QA not yet performed.

## Identity

| Property | Value |
|---|---|
| Accent color | `#C97D1A` (Real World Ready Lab-Pack-level accent, shared with Money as a Skill and Reading the Room) |
| Icon | `merge` (verified against the Lucide icon library) |
| Character | Theo, 12 |
| Total Cases | 5 (pages 2–6; "Before We Start" is the intro, not a Case) |
| Coverage-map scenario count | 8 (`conflict` category, C1–C8) |
| Badge text | "8 scenarios completed" |
| Post-completion redirect | Real World Ready hub (`/jsh/real-world-ready/`) |
| `narrativeStyle` | `character` |

## Cases as built

1. **Case 2 — The Unspoken Need.** Covers C1 (group project topics), C3 (rule change at home). Position-to-need translator: the student picks the real underlying need (1 of 3 candidates, 2 are position-restatements) for each of two people, then picks the one integrative option (of 3) that satisfies both needs. Wrong picks teach on the spot and stay selectable; correct picks lock. Gated — the integrative choice is the whole point.
2. **Case 3 — The Cost of Being Right.** Covers C6 (group chat spiral), C7 (public dismissal). Four-round escalating exchange with two live meters: "Is Theo right?" is rendered frozen at 100% for the entire Case (never animated down — this is deliberate, not a bug: it demonstrates that being right and being effective are independent quantities), "Is this working?" drops on escalate, holds on restate, recovers on exit. Exit is available every round; round 4 forces exit as the only remaining option. Ungated — any exit round completes the Case, including round 1 (which gets its own "you didn't lose anything, you also didn't say your piece" feedback rather than being silently rewarded).
3. **Case 4 — The Apology That Isn't Great.** Covers C5. Hybrid gate: a 4-element audit (named / said sorry / took responsibility / offered to change) is gated — each element has a factually correct present/missing answer readable in the apology text, and a wrong mark teaches immediately. Once all four are correctly marked, three response options (accept / name one missing piece / hold out for full) are ungated exploration — all three are framed as legitimate, with "name one missing piece" narrated as strongest without the others being marked wrong.
4. **Case 5 — Both of Them Want You.** Covers C4. Two-inbox pressure: three visible replies (agree / defend the absent friend / deflect) plus a fourth, "…something else?", rendered as a greyed placeholder from the start and unlocked (becomes clickable, restyled) only once both threads have been opened. Ungated — any of the four responses completes the Case; all four get distinct outcome copy showing what each one costs each friendship.
5. **Case 6 — When You're the One Who's Wrong.** Covers C2, C8. Rising-cost concession window over 4 turns: concede is available and enabled on every turn, cost framing rises in social terms ("easy" → "a bit awkward" → "he'll have to walk it back" → "he'll have to explain why he kept going"). Deflect and double-down are removed at turn 4, leaving concede as the sole option. Gated on the action (conceding is required to complete), never on timing — conceding at turn 1 and turn 4 both complete the Case, with visibly different cost framing shown in the completion reveal.

## Deliberate "looks like a bug" behaviors, preserved as specified

- Case 2 rungs 3–4 evidence panels — n/a to this GoodBlock (that's Reading the Room Case 2); not applicable here.
- Case 3's "Is Theo right?" meter frozen at 100% for the whole Case, with Jodi naming it explicitly rather than it reading as inert.
- Case 3 and Case 5 are ungated — any exit round / any of four responses completes them. Confirmed in code: `finishCase3` and `pickCase5` accept every branch.
- The Case 5 "…something else?" ghost option is visible (not absent) from the start and restyled to look selectable only once both threads are opened — implemented via a `.ghost-option` / `.ghost-option.unlocked` CSS pair plus a `disabled` toggle keyed on `c5OpenedA && c5OpenedB`.

## Deviations from the storyboard spec, with reasons

1. **Case 2's classmate/friend names are generic ("classmate," "a friend," "Priya," "Marisol") rather than named throughout.** The spec's dialogue examples used unnamed positions for Case 2; Case 5's two friends needed names to keep the two threads distinguishable in the UI, so "Priya" and "Marisol" were introduced — verified against the existing character registry (Theo, Mira, and the Digital Decisions / Privacy & Security / Social Intelligence casts) and are not reused names.
2. **Case 3's per-round dialogue is condensed relative to the full four-row table in the spec.** The spec's table gives slightly different phrasing per round per action; the implementation uses one representative reveal per action type (escalate vs. restate) rather than four hand-tuned copies, to keep the interaction shippable in the sprint's time budget. The meter math (−25 per escalate, −10 per restate, floor at 0, recover +10 on exit) matches the spec's every-round table exactly.
3. **No standalone "Case 7" page.** The spec numbers the rating/badge page "Case 7" in its own document, but the Lab Pack's locked numbering convention (Q4 in the coverage map) calls it "Handoff," not a Case, matching Money as a Skill and Privacy & Security. The rating page carries no "Case" label in the built file, consistent with that convention — the spec's own internal "Case 7" label was superseded by the coverage map, which is authoritative over the storyboard on numbering.

## Verified

- `node --check` on every inline `<script>` block
- `<div>` tag balance (117 open / 117 close)
- No duplicate element IDs; every `onclick` handler resolves to a defined function (`openMessageModal` resolves via the shared `message-hq.js`)
- No literal escaped-unicode artifacts in student-facing text
- `node scripts/check-modules.js` passes
- `merge` icon confirmed to exist in the Lucide icon set
- All five Cases' completion triggers, when read against the code, match the spec's stated gate-vs-exploration decisions

## Not yet verified

- Real browser rendering and click-through of all 5 Cases (desktop + mobile/narrow viewport)
- Whether repeated interaction (re-picking a wrong option, re-opening evidence, escalating and then exiting) behaves correctly a second time, not just the first
- Whiteboard desktop-panel vs. mobile-inline routing actually displaying correctly, and that the reveal animation is suppressed on desktop
- Jodi mood-image swaps, portrait-tap recall, and multi-attempt icon init timing
- Rating/badge/hub-redirect flow end-to-end against real Firestore
- Firebase auth/identity-gate and progress save/restore against a real signed-in session
