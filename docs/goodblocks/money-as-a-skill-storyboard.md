# Money as a Skill — Storyboard (AS BUILT, v2)

**Status:** AS BUILT — reconciled to the integrated module on 2026-09-08
**Lab Pack:** Real World Ready
**Coverage map:** `real-world-ready-coverage-map.md` — authoritative, conforms to the `money` category (M1–M8)
**Path:** `/jsh/real-world-ready-lab/money-as-a-skill/`

This replaces the working prototype (`06-money-as-a-skill-REFERENCE.html`) as the description of
what ships. The prototype had six pages with the rating embedded in the last scenario and page
labels reading "Scenario N". Neither survives. Case content, Jodi's lines and the five
mechanics are carried over verbatim where they were right; the structure is the Lab Pack's.

---

## Identity

| Property | Value |
|---|---|
| Slug | `money-as-a-skill` |
| Accent | `#C97D1A` amber — Lab Pack level, shared with Conflict Has a Winner and Reading the Room |
| Icon | `coins` — verified in the live Lucide library, in use |
| Badge copy | **"8 scenarios completed"** — the coverage map's `money` count, NOT the five Cases |
| Narrative style | **Second-person** — `narrativeStyle: 'second-person'` on the Firestore completion doc |
| Character | None. Every Case is aimed at "you". This is one half of the Lab Pack's narrative-style A/B (the other two GoodBlocks are character-driven). Do not harmonise. |
| Mentor | Solo Jodi |
| Redirect | `/jsh/real-world-ready-lab/` (the Real World Ready hub) |

## Structure — seven Cases

Every page is a Case, numbered from 1. Header reads `X / 7`. The word "scenario" never appears
as a page label; it is reserved for Challenge items and the completion badge.

| Case | Title | Mechanic | Gate |
|---|---|---|---|
| 1 | Money as a Skill | Overview — five tiles labelled Case 2 … Case 6 | Continue always available |
| 2 | The Split Decision | Three-way commitment | Ungated — all three complete |
| 3 | The Impulse Window | Staged commitment with an intermediate "think it through" beat that is not a commit | Ungated |
| 4 | The Group Fund | Multi-toggle condition-setter; commit label rewrites on every toggle | Ungated |
| 5 | The Upgrade Trap | Investigate-then-commit, two "looks" budgeted, buy always enabled | Ungated |
| 6 | The Ask | Consequence previewer with a worst-case beat that is not a commit | Ungated |
| 7 | Handoff | Rating (star pick never auto-submits; Submit appears on first pick) → badge → hub | — |

Every interactive Case has its own reset control (chassis convention), a step bar, a mobile
mechanism box and a one-line reframe that shows on completion.

## Coverage (from the map)

| Challenge scenario | Taught by |
|---|---|
| M1, M2 — proportional fairness, one-off and recurring | Case 2 |
| M3, M4 — opportunity cost, manufactured urgency | Case 3 |
| M5, M6 — naming the conditions of a yes; a yes with no terms | Case 4 |
| M7 — functional threshold | Case 5 |
| M8 — asking is information, not rudeness | Case 6 |

## Callback

Case 7's opening line is prefixed with what the student actually did at the till in Case 6
("You asked, back there at the till." / "You paid the twenty back there — and you knew the ask
was sitting right next to it."). Load-bearing, not decorative.

## Interaction registry entries (14–18)

14. **Three-way commitment with a proportional-fairness read** (The Split Decision)
15. **Staged commitment with a non-committing information beat** (The Impulse Window)
16. **Multi-toggle condition-setter** (The Group Fund) — sits close to #7, Privacy & Security's multi-toggle proportionality calibration. Recorded honestly.
17. **Budgeted investigate-then-commit** (The Upgrade Trap) — sits close to #11, Digital Citizenship's limited-budget check selection. Recorded honestly.
18. **Consequence previewer** (The Ask)

## Deviations from the reference prototype, and why

- Rating split onto Case 7; `TOTAL_PAGES` 6 → 7 (Case numbering convention, founder decision).
- Page labels "Scenario N" → "Case N"; intro labelled "Case 1"; overview tiles labelled by Case number rather than 1–5 so two numbering schemes never sit on one screen.
- Badge "5 scenarios completed" → "8 scenarios completed" (counts Challenge scenarios).
- Redirect `/jsh/` → `/jsh/real-world-ready-lab/`.
- The Jodi closing line that the prototype played inside The Ask now opens Case 7.
- Header, footer, sidebar, whiteboard, recall and progress-save behaviour come from the Professional Brand chassis, not the prototype's own shell.
