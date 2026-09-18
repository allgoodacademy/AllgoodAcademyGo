# Pattern Lab — Storyboard v1

Free CogAT-style practice diagnostic. Grades 5–8. All three batteries — Verbal, Quantitative, Nonverbal.

---

## Scope

| | |
|---|---|
| **Bank** | ~165 items target |
| **Batteries** | Verbal, Quantitative, Nonverbal |
| **Subtests** | 9 — Verbal Analogies, Verbal Classification, Sentence Completion, Number Series, Number Analogies, Number Puzzles, Figure Matrices, Figure Classification, Paper Folding |
| **Levels** | 11 (Gr 5), 12 (Gr 6), 13/14 (Gr 7–8) |
| **Per cell** | ~6 items (9 subtests × 3 levels = 27 cells) |
| **Session** | ~27 items, 15 min |
| **Seeded so far** | 24 items — 12 text, 12 nonverbal |

## Session flow

1. **Pick grade** (5–8) → sets starting level.
2. **Baseline** — 9 items, one per subtest, at grade level.
3. **Adaptive** — each subtest steps up on success, down on struggle, independently. 2 more rounds of 9.
4. **Report** — 9 rows grouped by battery, showing where each plateaued.

## Item format

Each item: stem → 4 options (or a typed number for Series/Puzzles) → **mechanism** revealed after answering, right or wrong. Mechanism is 1–2 lines, names the *pattern type*, skippable. No Jodi — same as the other four games.

**Nonverbal renders as inline SVG, no image assets.** Every figure is a function — `F.sq(teal, filled, rotation)`, `F.arr(color, degrees)`, `F.dots(color, count)`, `F.sheet(holes, foldAxis)`. New items are written as data, not drawn by hand, so the bank scales without an illustrator. Three visual formats:
- **Figure Matrices** — 3×3 grid, bottom-right missing, pick from 4
- **Figure Classification** — three figures sharing a rule, pick the fourth that belongs
- **Paper Folding** — blank sheet → folded-and-punched → pick the unfolded result

## Report rules

- No cell reports a level below **5 answered items** — it says "not enough data."
- Language: *"answered Level 12 items correctly"* — never *"performs at Level 12."*
- No predicted CogAT score.
- Footer: practice tool, original items, not affiliated with or endorsed by Riverside Insights.

---

# Sample items

12 text items (two per subtest) plus 12 nonverbal items (four per subtest), spanning levels.

## Verbal Analogies

**V-A-01 · Level 11**
> **hammer → nail** as **screwdriver → ?**
> A. wood  B. screw  C. handle  D. toolbox
>
> **Answer:** B
> **Mechanism:** Tool → the thing it drives. "Wood" is what you drive it *into*, not what you drive — that's the trap.

**V-A-02 · Level 13/14**
> **drought → famine** as **inflation → ?**
> A. currency  B. economy  C. shortage  D. recession
>
> **Answer:** D
> **Mechanism:** Cause → the crisis it produces. "Shortage" is a sibling cause, not a consequence. Watch for options that sit on the wrong side of the arrow.

## Verbal Classification

**V-C-01 · Level 11**
> **granite · marble · slate** — which belongs with them?
> A. brick  B. limestone  C. glass  D. plaster
>
> **Answer:** B
> **Mechanism:** All naturally occurring stone. Brick and plaster are manufactured — the group is defined by *origin*, not by use.

**V-C-02 · Level 12**
> **whisper · murmur · mutter** — which belongs with them?
> A. shout  B. announce  C. mumble  D. sing
>
> **Answer:** C
> **Mechanism:** All mean speaking quietly *and* indistinctly. "Shout" fails on volume; "announce" fails on clarity. Two attributes, not one.

## Sentence Completion

**S-C-01 · Level 11**
> Although the recipe called for exact measurements, Maya cooked by ______, adding ingredients until the taste seemed right.
> A. instinct  B. schedule  C. necessity  D. accident
>
> **Answer:** A
> **Mechanism:** "Although" signals contrast. The blank must oppose *exact measurements* — and the second half defines it: judging by taste.

**S-C-02 · Level 13/14**
> The senator's argument was ______: it relied on a single statistic that later proved to be outdated.
> A. persuasive  B. tenuous  C. lengthy  D. controversial
>
> **Answer:** B
> **Mechanism:** The colon means the second half *defines* the blank. One outdated statistic = weakly supported. Ignore the topic; follow the punctuation.

## Number Series

**N-S-01 · Level 11**
> 4, 8, 7, 14, 13, ?
>
> **Answer:** 26
> **Mechanism:** Two alternating operations: ×2, then −1. When single-step differences don't work, check if two rules are taking turns.

**N-S-02 · Level 13/14**
> 2, 6, 12, 20, 30, ?
>
> **Answer:** 42
> **Mechanism:** Differences are 4, 6, 8, 10 — increasing by 2 each time. When the gaps aren't constant, look at the gaps *between the gaps*.

## Number Analogies

**N-A-01 · Level 11**
> **[6 → 18]** and **[5 → 15]**, so **[9 → ?]**
> A. 21  B. 24  C. 27  D. 36
>
> **Answer:** C
> **Mechanism:** ×3 in both pairs. Test multiplication before addition — 6→18 could be +12, but 5→15 isn't +12, so the rule must be ×3.

**N-A-02 · Level 12**
> **[12 → 5]** and **[20 → 9]**, so **[16 → ?]**
> A. 6  B. 7  C. 8  D. 9
>
> **Answer:** B
> **Mechanism:** Halve, then subtract 1. Two-step rules are common at this level — if one operation doesn't fit both pairs, try a pair of them.

## Number Puzzles

**N-P-01 · Level 11**
> ☐ + 7 = 15 − 3
>
> **Answer:** 5
> **Mechanism:** Solve the side without the box first. 15 − 3 = 12, so ☐ + 7 = 12.

**N-P-02 · Level 13/14**
> If ▲ = 4, then **6 × ▲ − ☐ = 19**
>
> **Answer:** 5
> **Mechanism:** Substitute before solving. 6 × 4 = 24, so 24 − ☐ = 19.

## Figure Matrices

**F-M-01 · Level 11** — Rows of filled/outline pairs across four shapes.
**Mechanism:** Across each row: filled, then outline. The shape stays the same — only the fill changes.

**F-M-02 · Level 12** — Arrows; color constant per row, rotation advancing across.
**Mechanism:** Two rules at once: color is constant along each row, rotation advances 90° across it. Track them separately.

**F-M-03 · Level 13/14** — Dot counts rising across rows and down columns.
**Mechanism:** Count increases by 1 across each row, and each row starts one higher than the last. Two dimensions moving together.

**F-M-04 · Level 13/14** — L-shapes rotating, with a wrap at 360°.
**Mechanism:** Rotation advances 90° across each row and each row starts 90° further along. 270° + 90° wraps back to 0°.

## Figure Classification

**F-C-01 · Level 11** — Solid shapes of one color; shape varies.
**Mechanism:** All three are solid-filled and the same color. The shape itself varies — so shape isn't the rule.

**F-C-02 · Level 12** — Even dot counts, varying colors.
**Mechanism:** Every group has an even number of dots. Color changes each time, so color can't be what binds them.

**F-C-03 · Level 13/14** — Square outline AND exactly three dots.
**Mechanism:** Two things must hold: a square outline AND exactly three dots inside. An option can match one and still fail.

**F-C-04 · Level 13/14** — Circles with one quarter removed, at varying rotations.
**Mechanism:** Each is a circle with one quarter removed, at a different rotation. A whole circle fails the defining feature.

## Paper Folding

**P-F-01 · Level 11** — One punch, vertical fold.
**Mechanism:** One punch through folded paper makes two holes — the original and its mirror across the fold line.

**P-F-02 · Level 12** — Two punches, vertical fold.
**Mechanism:** Two punches, one fold: each hole mirrors, giving four. Count the punches, then double.

**P-F-03 · Level 13/14** — Two punches, *horizontal* fold.
**Mechanism:** A horizontal fold mirrors top to bottom — not left to right. Match the mirror direction to the fold line.

**P-F-04 · Level 13/14** — Asymmetric punches at differing distances from the fold.
**Mechanism:** Each hole mirrors independently across the fold. A hole nearer the fold lands nearer it on the other side too.

---

## Notes

**Every item is original.** None reproduce real CogAT questions.

**Distractors are built to be diagnostic, not filler** — each wrong option represents a specific reasoning error (right relationship/wrong direction, one attribute instead of two, addition instead of multiplication). Which wrong answer a student picks is itself signal worth capturing in telemetry.

**Open before scaling to ~165:** do these read at the right difficulty for their labeled levels? That's the judgment call worth making now, on 24, rather than after 165 are written. Nonverbal difficulty in particular is worth a second look — F-M-03 and F-M-04 both stack two rules at once, which may sit closer together than their 13/14 labels suggest.
