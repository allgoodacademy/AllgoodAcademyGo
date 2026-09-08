# Reading the Room — Storyboard (AS BUILT)

**GoodBlock:** Reading the Room
**Lab Pack:** Real World Ready
**Slug:** `reading-the-room`
**File:** `public/jsh/real-world-ready/reading-the-room/index.html`
**Spec:** `03-storyboard-reading-the-room.md` (build package, deleted after this sprint per the sprint prompt's cleanup step — this document is now the durable record)
**Status:** Built and pushed to `claude/money-skill-goodblock-poc-1atbyv` (PR #11). Static checks passed; manual browser QA not yet performed.

## Identity

| Property | Value |
|---|---|
| Accent color | `#C97D1A` (Real World Ready Lab-Pack-level accent, shared with Money as a Skill and Conflict Has a Winner) |
| Icon | `glasses` (verified against the Lucide icon library) |
| Character | Mira, 12 |
| Total Cases | 7 (Case 1 = "Before We Start" intro, Cases 2–6 = the 5 interactive pages, Case 7 = the rating/feedback handoff) |
| Coverage-map scenario count | 8 (`reading_room` category, R1–R8) |
| Badge text | "8 scenarios completed" |
| Post-completion redirect | Real World Ready hub (`/jsh/real-world-ready/`) |
| `narrativeStyle` | `character` |

## Cases as built

0. **Case 1 — Before We Start.** The intro/power-up splash (`#startup-screen`). Copy and layout are unchanged from the original build; it now carries a "Case 1" label alongside its existing "Before We Start" text so it counts in the header's page indicator (`X / 7`) and in `Telemetry`'s `stepsTotal`. It has no lock/unlock or "Jump to a Case" menu entry of its own — it is the entry gate learners pass through before Case 2 is ever shown.
1. **Case 2 — Three Rungs Up.** Covers R1, R8. Inference-ladder placement: a four-rung ladder (what was said / what that could mean / what I've decided it means / what I've concluded about her) with Mira's gut read card. Placing it below rung 4 teaches on the spot; placing it on rung 4 locks it. Opening the evidence panel on rung 3 or 4 shows it **empty** — implemented as static markup with no data source, by design, matching the spec exactly (not a loading failure). Gated — completion requires rung 4 placement and at least one evidence panel opened, then the ladder visually collapses to rung 1 with the "This is everything Mira actually knows" prompt.
2. **Case 3 — Both Still True.** Covers R2, R6. Robust-action selector: two explanations (A/B) that never resolve. Four candidate responses; viewing a response's outcome panels under both A and B is required before that response becomes committable, and only the one genuinely robust response ("ask one person directly and lightly") is accepted. Wrong commitments show exactly which column they fail under. Gated on the robust response; the two explanation cards remain visible and unresolved at completion, per spec's "Case 3 never resolves" rule.
3. **Case 4 — Five Tuesdays.** Covers R3. Belief revision trace: five sequential daily observations, a three-position dial (stuck-up / not sure / something else going on) recorded after every day regardless of whether it moved. Ungated — reaching day 5 with the dial confirmed at whatever position completes the Case, including never having moved it once. The five-day trace renders as a row of labeled dots at the end, and the closing line is chosen based on when (if ever) the first move happened.
4. **Case 5 — Is This About Me?** Covers R4, R5, deliberately paired as opposites. Two scenes, each called "about her" / "not about her," each followed by a mandatory POV replay regardless of the call. Scene A (the teacher) corrects a wrong "about her" call; Scene B (the joke) corrects a wrong "not about her" call. Both scenes must be called and both replays viewed to complete — ungated on the call itself. Verified in code that a student answering "about her" on both scenes gets Scene A's correction and a student answering "not about her" on both gets Scene B's — neither blanket rule is accepted as correct, both still complete the Case.
5. **Case 6 — "I'm Fine."** Covers R7. Two-turn responsive exchange: turn 1 offers face-value / door-open / insist. Door-open on turn 1 completes immediately with the strongest outcome. Face-value or insist on turn 1 leads to a turn-2 recovery option (circle back and leave a door open / back off, respectively) that completes the Case at a visibly higher stated cost than getting it right on turn 1. Ungated — every path completes; both first-turn missteps get their own distinct feedback rather than a single generic "wrong" state.
6. **Case 7 — Handoff (rating + feedback).** The closing star-rating/feedback screen, now numbered and counted like every other Case in the header indicator and the "Jump to a Case" menu (previously shown unlabeled as "Handoff"). Submitting a rating reveals the "Reading the Room Cleared" badge screen ("8 scenarios completed" — a scenario-coverage count, unrelated to and untouched by the Case-numbering change) and the return-to-hub button.

## Deliberate "looks like a bug" behaviors, preserved as specified

- Case 2's evidence panels on rungs 3–4 render and stay empty — no data is ever populated into them; this is the lesson (there is no evidence above rung 2), not an unfinished feature.
- Case 3's two explanation cards remain on screen, unresolved, at Case completion — no reveal is ever shown for which explanation was "true," because neither storyboard nor the underlying scenario resolves it.
- Case 4 completes with the dial never having moved — verified in code: `nextC4Day` completion path has no branch requiring `c4Trace` to contain more than one distinct value.
- Case 5 requires both scene calls and both POV replays but never grades the calls themselves — `pickCase5`-equivalent (`callC5`) always proceeds to the corrective reveal "regardless" of the call, per spec.
- "Read" is never used as a structural label anywhere in the UI (rungs, dial, threads) — only as Jodi's narration verb, per the terminology lock.

## Deviations from the storyboard spec, with reasons

1. **Case 2's drag-and-drop framing was implemented as tap-to-place rather than literal drag.** The spec describes the gut-read card as "dragged or tapped onto the rung it actually sits on" (its own wording allows either); tap-to-place was chosen for touch-target reliability on mobile and because drag-and-drop reordering has no accessible fallback in this chassis. The pedagogical mechanic — locating the read on the correct rung — is unchanged.
2. **Case 4's "Kofi" character and five observations are reproduced verbatim from the spec**, but the closing-line selection logic (updated early / late / never) is implemented as a simple "first day the dial changed" check rather than the spec's more nuanced framing of exactly which day counts as "early." This is a faithful-enough approximation given the five fixed observation points; a future pass could hand-tune the day-2-vs-day-4 boundary if playtesting shows the wrong closing line firing.
3. **Superseded:** this point previously said the rating/badge page ("Handoff") was deliberately left unnumbered, following Conflict Has a Winner's convention. That was revisited in a follow-up pass (same sprint): the intro ("Before We Start") is now Case 1 and the Handoff page is now Case 7, so the header's page indicator and `Telemetry.stepsTotal` read `7` instead of `6`. Cases 2–6 (the 5 interactive pages) kept their existing numbers unchanged.

## Verified

- `node --check` on every inline `<script>` block
- `<div>` tag balance (109 open / 109 close)
- No duplicate element IDs; every `onclick` handler resolves to a defined function (`openMessageModal` resolves via the shared `message-hq.js`)
- No literal escaped-unicode artifacts in student-facing text
- `node scripts/check-modules.js` passes
- `glasses` icon confirmed to exist in the Lucide icon set
- Read the code for Case 5's dual-direction correction and confirmed both directions are wired to the opposite scene's reveal, not the same one

## Not yet verified

- Real browser rendering and click-through of all 5 Cases (desktop + mobile/narrow viewport)
- Whether repeated interaction (re-calling a scene, re-moving the dial, re-opening a thread) behaves correctly a second time, not just the first
- Whiteboard desktop-panel vs. mobile-inline routing actually displaying correctly, and that the reveal animation is suppressed on desktop
- Jodi mood-image swaps, portrait-tap recall, and multi-attempt icon init timing
- Rating/badge/hub-redirect flow end-to-end against real Firestore
- Firebase auth/identity-gate and progress save/restore against a real signed-in session
