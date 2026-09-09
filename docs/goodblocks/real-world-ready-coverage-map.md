# Real World Ready — Coverage Map v1

**Status:** DRAFT — awaiting sign-off
**Authored:** 2026-09-07
**Authority:** This document is the single source both the Real World Ready Challenge and all three GoodBlocks draw from. Per the GoodBlock Builder skill (Phase 1, item 0), when a challenge and its labs are designed together the mapping is *authored* rather than discovered, and whichever is written first is authoritative.

**Founder decision (this session):** The Challenge scenario map is authoritative. GoodBlocks conform to it.

**One necessary exception, stated plainly:** Money as a Skill is already built with 5 fixed Cases. Its 8 Challenge scenarios were therefore authored *backwards* from what that GoodBlock actually teaches, rather than freely. The Conflict and Reading the Room categories were authored freely and their GoodBlocks will conform forwards. This is the honest state of things and should not be quietly smoothed over later.

---

## Why this document exists

Two failures it prevents, both of which have already happened once in this codebase:

1. **Fabricated badge numbers.** Privacy & Security's completion badge reads "9 scenarios." The real count of `privacy_security` scenarios in the Digital Decisions Challenge is **8**. The number was inferred from a neighbouring module (Social Intelligence, 11) because 9 looked plausible. It is a fabricated fact in student-facing copy, invisible to code review, and no structural check would ever catch it. **This bug is still live in the repo and should be fixed.**

2. **Challenge/lab drift.** Without a shared map, the Challenge tests things no GoodBlock teaches, and GoodBlocks teach things the Challenge never asks about. The lab pack stops being a coherent unit.

**The rule this enforces:** any figure a student reads — scenario counts, "five moments," score thresholds — traces to something real in this document, or does not get stated.

---

## Challenge structure

Mirrors the Digital Decisions Challenge exactly, because that chassis is proven.

| Property | Value |
|---|---|
| Total scenarios | **24** |
| Categories | 3 (one per GoodBlock) |
| Scenarios per category | 8, 8, 8 |
| Choices per scenario | 3 |
| Scoring | 3 (most effective) / 1 (less effective) / 0 (least effective) |
| Max score | **72** (24 × 3) |
| Completion threshold | **64** |

**On the threshold:** DDC uses 80 of 90, which is 88.9%. 64 of 72 is 88.9%. Same bar, scaled — not a rounded guess.

**On choosing 24 rather than 30:** DDC's categories are uneven (11/8/7/4), which reads as organic accumulation rather than design. Three categories at 8 each is deliberate and gives every GoodBlock the same weight on the hub. 24 also keeps the Challenge to a sitting a 12-year-old will actually finish.

---

## ⚠️ Open questions — resolve before Phase 2 storyboarding

**✅ Q1 — HUD metric names. RESOLVED.**

Verified against the Digital Decisions Challenge source: its three HUD metrics are computed directly from scenario categories, not tracked independently.

| DDC metric | Derived from |
|---|---|
| Critical Thinking | `privacy_security` |
| Empathy | `social_intelligence` |
| Integrity | `professional_brand` + `digital_citizenship` (merged) |

DDC squeezes four categories into three bars, so its last two are merged. That is a compromise forced by the count, not a design principle. Real World Ready has three categories and three bars, so it gets a clean 1:1 with no merge.

DDC names each metric after the **trait** the category builds, not after the category itself. Real World Ready follows the same rule:

| HUD metric | Category | GoodBlock | What it measures |
|---|---|---|---|
| **Judgment** | `money` | Money as a Skill | Deciding with information rather than instinct or default |
| **Composure** | `conflict` | Conflict Has a Winner | Staying effective when a situation is tense |
| **Perspective** | `reading_room` | Reading the Room | Seeing past your own first read of a situation |

Computation mirrors DDC exactly: `getPct(earned, max)` per category, where max is 3 points × scenarios answered in that category.

**✅ Q2 — Accent and icon differentiation. PARTIALLY RESOLVED.**

Founder decided the whole Lab Pack shares amber `#C97D1A` rather than one accent per GoodBlock. This departs from the accent registry's existing per-GoodBlock rule and must be recorded there as a new Lab-Pack-level convention.

Differentiator is the **Lucide icon**, one per GoodBlock, same accent throughout. Money as a Skill holds `coins` (verified, in use). Icons for Conflict Has a Winner and Reading the Room are **still unassigned** and must be verified against the live Lucide library before use — guessing an icon name has failed silently twice in this codebase.

**✅ Q3 — Money category is retrofitted. ACKNOWLEDGED, no action.**

The `money` scenarios were authored backwards from Money as a Skill's five already-built Cases, rather than freely. `conflict` and `reading_room` were authored freely and their GoodBlocks conform forwards. Recorded so a future reader does not mistake the money category for a freely authored one, and so the asymmetry is never quietly smoothed over. Nothing to fix — this is the correct handling given that one GoodBlock shipped before the coverage map existed.

**✅ Q4 — Case numbering convention. SUPERSEDED — see below.**

*Original resolution in this session locked the intro to "Before We Start", not labelled as a Case. That has been overridden by a later founder decision covering all seven GoodBlocks and both Challenges. The scheme below is authoritative.*

**Every page is a Case, numbered from 1.**

- **Case 1** — the intro/overview page
- **Cases 2 … N-1** — the interactive scenarios
- **Case N** — rating and handoff
- Header counter shows `X / N`
- The word **"scenario" stays reserved** for Challenge items and never appears as a page label

**Why this is the right scheme and not just a different one:** Privacy & Security's source already calls its pages `CASE 1: OVERVIEW` through `CASE 6: HANDOFF` in code. Only the visible label disagreed. This change makes the labels match what the codebase has always called them, and removes the oddity where the first real scenario was confusingly "Case 2 of 6" with no Case 1 in sight.

**⚠️ Structural consequence for Money as a Skill.** It cannot simply be relabelled. Its rating is embedded inside the final scenario page rather than sitting on its own, so it has no feedback Case to make the last one. Conforming requires:

- Splitting the rating and badge onto their own page
- `TOTAL_PAGES` 6 → **7**
- Cases become: 1 intro, 2–6 the five scenarios, 7 rating and handoff
- Header counter `X / 7`

Privacy & Security and both new GoodBlocks already have the right structure and need labels only.

**⚠️ What this scheme does not fix.** The objection raised in review was that the intro page is a syllabus — a bullet list of what's coming, which students skip. Relabelling it "Case 1" makes it a Case in name while leaving it a syllabus in substance, and arguably worsens it by promoting it to peer status with the real Cases. The renumber is correct and insufficient. Redesigning that page is a separate open ask.

That last rule is the one that matters most. See the terminology note below.

---

## Category 1 — Money (`cat: 'money'`)

**GoodBlock:** Money as a Skill — BUILT
**Badge copy:** "8 scenarios" (NOT 5 — the current build says 5, which is the Case count, not the coverage count. Must be corrected.)
**Misconceptions covered:** #1 (money is a skill, not a personality type), #2 (fair ≠ equal), #4 (asking is not rude)

| ID | Scenario premise | Principle tested | Taught by |
|---|---|---|---|
| M1 | A friend proposes splitting a shared purchase 50/50, but they'll use it far more than you | Proportional fairness — equal isn't automatically fair | Case 2 — The Split Decision |
| M2 | You're asked to go halves on a subscription you'd use twice a month | Same principle, different surface — recurring rather than one-off | Case 2 — The Split Decision |
| M3 | You're a few dollars from a savings goal and spot something you want now | Opportunity cost — the real price includes the delay | Case 3 — The Impulse Window |
| M4 | A sale ends tonight on something you hadn't planned to buy | Manufactured urgency as a pressure on a real decision | Case 3 — The Impulse Window |
| M5 | The group asks you to hold and track everyone's money | Naming the conditions that make a yes workable | Case 4 — The Group Fund |
| M6 | A friend owes you money and it's been three weeks, no terms were ever set | The cost of a yes with no terms attached | Case 4 — The Group Fund |
| M7 | Two versions of the same item — one basic, one triple the price | Functional threshold — where extra spend stops adding value | Case 5 — The Upgrade Trap |
| M8 | An item is visibly damaged but still marked full price | Asking is information, not rudeness | Case 6 — The Ask |

**Coverage check:** all 5 built Cases are represented. No scenario is orphaned. No Case is unused.

---

## Category 2 — Conflict (`cat: 'conflict'`)

**GoodBlock:** Conflict Has a Winner — NOT YET BUILT
**Badge copy:** "8 scenarios"
**Misconception covered:** #6 — conflict has a winner; compromise reads as losing

| ID | Scenario premise | Principle tested |
|---|---|---|
| C1 | Group project — two people want different topics and both dig in | An integrative option usually exists and nobody has looked for it |
| C2 | A friend has cancelled on you three times; the fourth time you snap | Naming a pattern is a different move than winning an argument |
| C3 | You want a rule changed at home and the conversation becomes a standoff | Positions vs interests — what each side actually needs underneath |
| C4 | Two friends fall out and both want you to agree they're right | Declining the frame is a legitimate third move |
| C5 | Someone apologises badly — technically an apology, clearly not sorry | Accepting an imperfect repair vs escalating to get a better one |
| C6 | A group chat argument is spiralling and you happen to be right | Being right and being effective are separate things with separate costs |
| C7 | A teammate dismisses your idea in front of everyone | Separating the idea from the person, in the moment, with an audience |
| C8 | Mid-argument you realise you're wrong | Conceding as a deliberate move rather than a loss |

**Note for Phase 2:** Case count is an output of storyboarding, not an input. These 8 scenarios cluster into fewer distinct judgment calls — likely 5, but that gets decided by the pedagogy, not assumed here.

---

## Category 3 — Reading the Room (`cat: 'reading_room'`)

**GoodBlock:** Reading the Room — NOT YET BUILT
**Badge copy:** "8 scenarios"
**Misconception covered:** Original to this Lab Pack — treating a first read of a situation as a finished verdict rather than an opening signal worth checking. Adjacent to research brief #5 (gut as verdict vs signal), narrowed to social situations specifically.

| ID | Scenario premise | Principle tested |
|---|---|---|
| R1 | A friend's texts are unusually short today | Missing information before reacting to a signal |
| R2 | You find out a plan happened without you | Checking a read before acting on it |
| R3 | Someone new to the group comes across as standoffish | First impression vs accumulated evidence |
| R4 | A teacher seems irritated and you assume it's about you | Self-reference error — not everything is about you |
| R5 | Your joke lands badly and the room shifts | Reading a room in real time and adjusting mid-moment |
| R6 | Conversation stops when you walk over | Genuinely ambiguous signals — sitting with not knowing |
| R7 | Someone says "I'm fine" and clearly isn't | Reading past the words without overriding the person |
| R8 | A curt one-word reply arrives and you assume the worst | The cost of acting on an uncorrected first read |

**Standalone check:** Per the skill's hard rule, no student-facing copy in this GoodBlock may reference Conflict Has a Winner, Money as a Skill, or any Digital Decisions module — Lab Pack modules can be taken in any order. R5 and C7 are thematically adjacent; neither may reference the other in student-facing text. Design rationale like this note stays in the storyboard and never gets copied into dialogue.

---

## Terminology lock — read this before writing any dialogue

Two units in this Lab Pack are easy to confuse and must never share a word:

| Unit | Means | Where it appears |
|---|---|---|
| **Case** | One page inside a GoodBlock | Page labels, header counter, case menu |
| **Scenario** | One graded item in the Challenge | Coverage map, completion badges, Challenge only |

The as-built Money as a Skill labelled its pages "Scenario 1" through "Scenario 5". Combined with a corrected badge reading "8 scenarios," a student would see the final page labelled **Scenario 5** directly above a badge saying **8 scenarios completed**. Two numbers, same word, on one screen, contradicting each other.

Renaming the page labels to **Case** resolves it. "All five cases" and "8 scenarios" then coexist correctly, because they measure different things and say so.

This is the same class of collision the GoodBlock Builder skill documents from an earlier build, where narrative dialogue about a "case file" collided with the structural label "Case 1." Lock terminology before dialogue, every time.

---

## As-built audit — Money as a Skill (Claude Code integration)

Audited against the skill's Phase 3 checklist.

**Correct, no action needed:**
- All four shared modules loaded, none re-implemented: `auth-core.js`, `identity-gate.js`, `telemetry.js`, `message-hq.js`
- Jodi's mood SVGs referenced by URL from `assets/jodi`, not re-embedded inline
- Firestore completion writes `completed: true` with `gameName: "Money as a Skill"`, matching the module registry's `isComplete` predicate

**Fixes required:**

| # | Issue | Current | Correct |
|---|---|---|---|
| 1 | Page labels use the reserved word | "Scenario 1" … "Scenario 5" | "Case 2" … "Case 6" |
| 1b | Rating embedded in the final scenario page | Split onto its own page as **Case 7**; `TOTAL_PAGES` 6 → 7 |  |
| 2 | Intro page label | *(none)* | **"Case 1"** |
| 3 | Completion badge count | "5 scenarios completed" | "8 scenarios completed" |
| 4 | Post-completion redirect | `/jsh/` | `/jsh/real-world-ready-lab/` |
| 5 | A/B test marker absent | — | add `narrativeStyle: 'second-person'` to the completion doc |

**Note on fix 3:** the badge changes from 5 to 8 because it counts Challenge scenarios, not Cases. Jodi's dialogue reference to "all five" is about Cases and stays correct once fix 1 lands.

---

## Also fix in the same pass — unrelated to this Lab Pack

**Privacy & Security completion badge reads "9 scenarios." The correct number is 8.**

Verified by counting `cat: 'privacy_security'` in the Digital Decisions Challenge source: exactly 8. The Challenge's category distribution is social_intelligence 11, privacy_security 8, digital_citizenship 7, professional_brand 4, totalling the declared 30.

The GoodBlock Builder skill documents this as a known past error — the number was inferred from Social Intelligence's 11 because 9 looked plausible. It is still live in the repo.

---

## Registry updates required

**Accent registry** — add:
- Real World Ready Lab Pack claims amber `#C97D1A` at Lab Pack level, not per GoodBlock
- Record the new Lab-Pack-level accent convention alongside the two existing standing rules

**Interaction registry** — add Money as a Skill's five mechanics as entries 14–18, with an honest note that two sit close to existing entries:
- The Group Fund (multi-toggle condition-setter) ≈ #7 Privacy & Security multi-toggle proportionality calibration
- The Upgrade Trap (2-check investigate-then-commit) ≈ #11 Digital Citizenship limited-budget check selection

Recording the resemblance is the point — the registry only works as a differentiation check if it reflects what was actually built, including the near-misses.

---

## Sign-off

- [x] 24 scenarios, 8 per category
- [x] Threshold 64 of 72
- [x] Money category retrofit acknowledged (Q3)
- [x] Q1 resolved — HUD metrics Judgment / Composure / Perspective, category-derived 1:1
- [x] Q4 resolved — Case numbering locked to Privacy & Security convention
- [ ] Q2 partially resolved — **icons for Conflict Has a Winner and Reading the Room still unassigned**

**One flag remains open.** Phase 2 storyboarding can begin, but the two icons must be chosen and verified against the live Lucide library before either GoodBlock is implemented.
