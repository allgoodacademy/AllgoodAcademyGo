# Room to Think — Lab Pack Coverage Map & Storyboard

**Status:** Awaiting sign-off — Instructional Designer / Curriculum & Learning Science. Reviewed by Veteran Teacher (IB MYP).
**Authored:** 2026-09-12, against the live repo.
**Build state:** 🟢 **AS BUILT (partial)** — reconciled 2026-09-12 against the staging build on
`claude/new-session-f6ve19`. The hub, **Ten Voices, One Source** and the **full 24-scenario
Challenge** are built and on staging. **The Question Decides the Answer**, **Where You Say It**
and **The Cost of Later** are storyboarded in full below and are **not built** — they show as
coming-soon on the hub and do not navigate. Everything in §9, §10 and §11 is therefore
specification, not description. See "AS BUILT reconciliation" at the end of this document for
what changed between the storyboard and the build, and why.
**Authority:** This document is the single source both the Room to Think Challenge and all four GoodBlocks draw from. Per the GoodBlock Builder skill (Phase 1, item 0), when a Challenge and its labs are designed together the mapping is *authored* rather than discovered, and whichever is written first is authoritative. **The Challenge scenario map below is authoritative. GoodBlocks conform to it.**

---

## Conventions this document conforms to

Every one of these was read out of the live repo rather than assumed. Where a convention in the GoodBlock Builder skill disagrees with the repo, **the repo wins** and the disagreement is named.

| Convention | Source | Applied here |
|---|---|---|
| **Case 1 is the intro, Cases 2…N-1 interactive, Case N is rating + handoff** | Founder decision, `real-world-ready-coverage-map.md` Q4. All seven live GoodBlocks conform | Every GoodBlock here is **6 Cases**: 1 intro, 2–5 interactive, 6 handoff |
| **One Lab-Pack-level accent, differentiated by Lucide icon** | Founder decision, `real-world-ready-coverage-map.md` Q2. Real World Ready shares `#C97D1A` across all three of its GoodBlocks. **This supersedes the per-GoodBlock rule in the skill's accent registry** | One accent, four icons — §4 |
| **Challenge threshold at 88.9%** | DDC is 80/90, RWR is 64/72. Both 88.9% | **24 scenarios, 6 per category, 64 of 72** — §2 |
| **Hubs live at `/jsh/<pack-slug>-lab/`; Challenges live at `/educational-games/<pack-slug>/`** | Both live Lab Packs | Paths in §4 |
| **Interaction registry is at entry 28** | 14–18 Money as a Skill, 19–23 Conflict Has a Winner, 24–28 Reading the Room | New entries numbered **29–43** — §12 |
| **A new Lab Pack card needs more than a `pack` field** | `public/dashboard/index.html`. *Section membership* derives from `pack`, but the card itself needs a `LAB_PACKS` entry, a `*_PACK_PLANNED` array and markup carrying `pillId` / `counterId` / `durationId` | Wiring list in §7 |
| **Character names must be clear across the whole product** | `Priya`, `Dev` and `Nadia` already appear in Privacy & Security | Every name in §4 returns zero hits across `public/` and `docs/` |

**⚠️ One stale reference to fix at the next skill repackage.** The accent registry in `references/storyboard-checklist.md` still says Professional Brand "needs an accent and cannot take indigo" and that plum and bronze are unclaimed. **Professional Brand shipped on `#7C3D8E`.** Plum is not available and the registry should say so.

---

## 1. Why this Lab Pack is one thing

Four misconceptions, one mechanism underneath all of them: **the student mistakes intensity for effectiveness.** More voices, more certainty, more audience, more pressure. In every case the thing that feels like it is making them stronger is the thing removing their options.

That through-line lives on the hub and in the Challenge. **It never appears inside a GoodBlock** — Lab Pack modules can be taken in any order, so no student-facing copy references another module, by character, structure or comparison.

**MYP framing** (teacher-facing only, hub strip only): key concept **Perspective** · related concepts Credibility, Choice, Causality, Bias · global context **Identities and relationships** · MYP 2–4.
**Statement of inquiry:** *Urgency, audience and repetition narrow the choices available to us; recognising these forces helps us make more deliberate decisions about what we believe and how we act.*

**No student-facing copy anywhere uses the words IB, MYP or ATL.**

---

## 2. Challenge structure

Mirrors Real World Ready exactly, because that chassis is proven and its arithmetic is already justified.

| Property | Value |
|---|---|
| Path | `/educational-games/room-to-think/` |
| Total scenarios | **24** |
| Categories | 4 (one per GoodBlock) |
| Scenarios per category | 6 × 4 |
| Choices per scenario | 3 |
| Scoring | 3 (most effective) / 1 (less effective) / 0 (least effective) |
| Max score | **72** |
| Completion threshold | **64** |
| `narrativeStyle` | `'character'` |

**On the threshold:** 64 of 72 is 88.9%, identical to DDC's 80/90 and RWR's 64/72. Same bar, not a new one.

**On 24 rather than 20 or 30:** four categories at 6 each gives every GoodBlock equal weight on the hub, and 24 is the length a twelve-year-old finishes. DDC's 11/8/7/4 spread reads as accumulation rather than design; this does not repeat it.

### HUD metrics — named after the trait, 1:1 with category

Four categories and four bars, so no merge is forced (DDC has to merge because it squeezes four into three).

| HUD metric | Category key | GoodBlock | What it measures |
|---|---|---|---|
| **Discernment** | `source_counting` | Ten Voices, One Source | Telling how much evidence there actually is, under repetition |
| **Curiosity** | `question_framing` | The Question Decides the Answer | Asking in a way that could return an answer you didn't expect |
| **Discretion** | `audience_choice` | Where You Say It | Choosing where a hard thing gets said |
| **Initiative** | `starting_early` | The Cost of Later | Starting while the useful options are still reachable |

Computation mirrors DDC and RWR: `getPct(earned, max)` per category, max = 3 × scenarios answered in that category. **Per-category subscores are persisted, not discarded.** DDC computes breakdowns and throws them away; that is a live open finding and must not be repeated here.

### The design rule that makes this a *transfer* assessment

Every scenario places a **known mechanism in an unfamiliar context**. Distractors are written so that **surface-matching to the GoodBlock's original scenario scores worse than reasoning from the mechanism.** A student who remembers "go private" and applies it everywhere lands in the 40s. A student who asks "is there an audience here, and what is it doing" clears 64.

---

## 3. Coverage map

**Badge copy is "6 scenarios" on every GoodBlock.** It counts Challenge scenarios, not Cases. Each GoodBlock has 6 Cases and 6 scenarios, which is a coincidence of this pack — **do not let a future edit treat them as the same number.** Jodi's dialogue references four moments (Cases 2–5); the badge references six scenarios. Both are correct and they measure different things.

### Category 1 — `source_counting`

**GoodBlock:** Ten Voices, One Source
**Misconception:** *"If lots of people are saying it, that's a lot of evidence."*

| ID | Scenario premise | Principle tested | Taught by |
|---|---|---|---|
| S1 | Four articles on a supplement; three link to one study | Independence is counted at the origin, not the headline | Case 3 |
| S2 | Six people in a group chat say a match is cancelled, none say where they heard it | Repetition without a source is one rumour, forwarded | Case 3 |
| S3 | Forty five-star reviews posted in one week in similar words | Volume produced by one actor is one actor | Case 3 |
| S4 | Three posts about a pool closure, all "as reported by the local paper" | Going to the named origin is the only move that changes the count | Case 5 |
| S5 | The whole table agrees about a teacher none of them has had | Confident agreement among people with no access is zero evidence | Case 5 |
| S6 | Two accounts of a road accident that genuinely saw different things | The honest count is sometimes higher than it looks — over-merging is its own error | Case 4 |

### Category 2 — `question_framing`

**GoodBlock:** The Question Decides the Answer
**Misconception:** *"Research means finding sources that back up my point."*

| ID | Scenario premise | Principle tested | Taught by |
|---|---|---|---|
| Q1 | "Why the Nexa 7 is the best budget phone" returns eight agreeing results | A question with the answer in it returns the answer | Case 3 |
| Q2 | Eleven sources on homework, all from one framing | A source list records how you looked | Case 5 |
| Q3 | Searching a medication's name plus "dangerous" | Searching for a category returns that category | Case 4 |
| Q4 | Asking three people who took a subject and stayed | Sampling bias in people, not just in search results | Case 5 |
| Q5 | Searching a company name plus "scam" and finding nothing | Absence of a result is not a result | Case 3 |
| Q6 | A survey question written to get the answer the writer wants | The same mechanism in a question you *write* rather than type | Case 4 |

### Category 3 — `audience_choice`

**GoodBlock:** Where You Say It
**Misconception:** *"Saying it in front of everyone makes it land harder."*

| ID | Scenario premise | Principle tested | Taught by |
|---|---|---|---|
| A1 | Correcting a parent's wrong story at a table of relatives | Audience makes a person defend rather than reconsider | Case 2 |
| A2 | A teammate taking bad shots with eleven people listening | The private version of the same sentence is not the soft version | Case 3 |
| A3 | A rota error raised at the till with a queue behind you | The room includes people who aren't part of the conversation | Case 2 |
| A4 | A friend asks the group about a bad haircut; four have already praised it | Honesty and venue are separate decisions | Case 3 |
| A5 | A project partner has copied two paragraphs; the teacher is in the room | Escalation is a tool, and order matters | Case 5 |
| A6 | Good news about one person's work, told privately to spare another's feelings | **Quiet is not the same as secret** — the over-correction | Case 4 |

### Category 4 — `starting_early`

**GoodBlock:** The Cost of Later
**Misconception:** *"I work better under pressure."*

| ID | Scenario premise | Principle tested | Taught by |
|---|---|---|---|
| L1 | Two weeks to learn a piece; the teacher only hears you on Thursdays | Other people's availability is the real constraint | Case 3 |
| L2 | Passport renewal advertised at three weeks, flight in six | A stated duration is not a guarantee | Case 3 |
| L3 | A reference needed from a teacher with forty students | Late requests get answered, just thinly | Case 3 |
| L4 | Cooking for someone with a dairy allergy, deciding the menu the same morning | Checking has a last useful moment | Case 5 |
| L5 | A bike needing a brake cable, shop turnaround two days, shut Sundays | Buffer is what makes a second finding fixable | Case 3 |
| L6 | Finishing early and then spending the spare week re-reading the same page | **Front-loading is not the lesson either** — spacing beats hurrying | Case 3 |

**Standalone check.** A2 and A4 are thematically adjacent to material in other Lab Packs. Neither may reference it. Design rationale like this note stays in the storyboard and never reaches dialogue.

---

## 4. Identity, paths and registry

| Property | Value |
|---|---|
| Pack slug | `room-to-think` |
| Hub | `/jsh/room-to-think-lab/` |
| Challenge | `/educational-games/room-to-think/` |
| GoodBlocks | `/jsh/room-to-think-lab/<slug>/` |
| Lab Pack accent | **`#9B3B5A` wine** · light `#FBEAF0` · dark `#7A2B45` |
| Tailwind bundle | `tailwind/room-to-think.config.js` → `public/assets/css/tailwind.room-to-think.min.css`, scanning `public/jsh/room-to-think-lab/**/*.html`, following the `rwr-amber.config.js` pattern |
| `narrativeStyle` | `'character'` |
| `durationMinutes` | 15 per GoodBlock, 20 for the Challenge |

**⚠️ Resolved — accent adjacency.** `#9B3B5A` sits about 50° from Professional Brand's `#7C3D8E` on the wheel and both are dark and mid-saturation. They are on different hubs and will rarely be adjacent, but **run one side-by-side at card size on the dashboard before merge**, because the dashboard is the one surface that shows both. If they read as a pair, take the wine darker rather than PB lighter — PB is shipped.

**Icons, one per GoodBlock, verified against the live Lucide library:**

| GoodBlock | Slug | Icon | Verified |
|---|---|---|---|
| Ten Voices, One Source | `ten-voices-one-source` | `git-merge` | ✅ lucide.dev/icons/git-merge |
| The Question Decides the Answer | `the-question-decides-the-answer` | `scan-search` | ⚠️ **re-verify before use** |
| Where You Say It | `where-you-say-it` | `megaphone` | ⚠️ **re-verify before use** |
| The Cost of Later | `the-cost-of-later` | `calendar-clock` | ✅ lucide.dev/icons/calendar-clock |
| Hub | — | `compass` | ✅ Feather-derived, in Lucide |
| Challenge | — | `shuffle` | ✅ Feather-derived, in Lucide |

The same icon appears on the startup screen and the completion badge. Not two decisions.

**Registry entry shape** (four labs + one challenge, added to `MODULE_REGISTRY` in `public/dashboard/index.html`, with `topic` and `blurb` placed **after** `gameNames` so `scripts/check-modules.js` still parses):

```
{ id: 'ten-voices-one-source', name: 'Ten Voices, One Source', category: 'lab', pack: 'room-to-think',
  url: '/jsh/room-to-think-lab/ten-voices-one-source/', gameNames: ['Ten Voices, One Source'],
  topic: 'Checking a claim', blurb: 'Nine people said it. Two of them found out.',
  isComplete: (d) => d.completed === true, durationMinutes: 15 },
```

Challenge entry carries `badgeThreshold: 64, maxScore: 72` and the `isComplete` predicate `d.completed === true && typeof d.finalScore === 'number' && d.finalScore >= 64`.

**Characters, all cleared against `public/` and `docs/`:** Yara, Ruben (GB1) · Tomás (GB2) · Inés, Idris, Selin, Bram, Ms. Okafor (GB3) · Adaeze (GB4).

---

## 5. Terminology lock — read before writing any dialogue

| Unit | Means | Where it appears |
|---|---|---|
| **Case** | One page inside a GoodBlock | Page labels, header counter, case menu |
| **Scenario** | One graded item in the Challenge | Coverage map, completion badges, Challenge only |

⚠️ **Resolved:** The Cost of Later originally scheduled "work **blocks**." That collides with **GoodBlock**. Renamed to **sessions** throughout. **Do not undo.**

⚠️ **Resolved:** "Source" is narrative vocabulary in GB1 and GB2 and is not a structural label anywhere. Checked. "Room" in GB3 likewise. "Run" in GB2 likewise.

---

## 6. Jodi — voice notes taken from the shipped modules

There is still no bundled character bible. **The zip does not contain one** — `find . -iname "*bible*"` returns nothing and the only hits for "character bible" are three code comments. `/mnt/project/jodi-character-bible.md` remains the canonical file and the 🔴 backlog item *CI 6 — Bundle Jodi character bible into goodblock-builder skill* is still open at 💡 Idea.

What this document *does* have is all seven shipped scripts. Every line below was written against them. What the evidence actually shows:

- **She has never once said "Hey y'all."** Not in any of the seven. Openers are all different: *"Well hey there."* · *"Well hey now — pull up a chair."* · *"Hey there."* · *"Alright."* · *"This is Mira."* Anything drafted from a description of her voice rather than from the scripts will reach for it anyway — don't.
- **Her signature move is refusing to pre-judge, out loud.** *"Don't ask me whether it's shady. Ask whether…"* · *"I'm not going to tell you which one it is."* · *"I am not here to tell you her gut is wrong."* This is the voice equivalent of "never grades, only reframes," and it appears in five of seven.
- **"Now —" is her turn signal.** *"Now, don't confuse 'private' with 'soft'."* · *"Now — everybody looks at this and sees two doors."*
- **Attested vocabulary:** *folks*, *sugar*, *bless their hearts*, *I promise you*, *most folks never*, *go on now*. Used sparingly, roughly one per Case.
- **Case 1 sets the whole arc** — names the character, names the shape, names the lie. *"Five moments, five days, and every one of them turns on the same little lie: I found it, so I can use it."*
- **Case N sends the student off.** *"Go on now. Go be somebody's good day."* · *"Go make some good calls out there."* · *"Keep doing that."*
- **Mood distribution runs far more `neutral` than the skill's target suggests.** Conflict Has a Winner is neutral on six of seven intros. Moods below follow the shipped pattern, not the reference doc's percentages; count at build and raise it with the Instructional Designer if it drifts.

**These lines are still drafts.** They are now drafted against the product rather than against a description of it, which is a real improvement and not the same as a bible pass.

### ⚠️ Resolved — the Case 1 problem

The RWR coverage map records an open objection: *the intro page is a syllabus — a bullet list of what's coming, which students skip,* and relabelling it Case 1 "makes it a Case in name while leaving it a syllabus in substance."

**Every Case 1 in this pack is a cold open, not a syllabus.** The student is put inside the first moment and Jodi speaks over it. No list of what is coming. This does not close the open ask for the other seven GoodBlocks — it is one pack's answer to it, offered as a pattern.

---

## 7. Hub and dashboard wiring

`docs/goodblock-integration-checklist.md` is **authoritative** over everything in this section. Named here so nothing is missed, not to override it.

**Hub** at `/jsh/room-to-think-lab/`, modelled on `/jsh/real-world-ready-lab/`.
- Header: **Room to Think**. Student-facing line: *"Four situations where doing more made it worse. And what to do instead."*
- Four GoodBlock cards + the Challenge card. Status from `module_progress` reads. Honest coming-soon states.
- **Challenge card is not gated.** Consistent with the 2026-09-11 dashboard decision: no lock on either existing Challenge, none here.
- `launchLab()` must **not** call `ensureIdentified()`. Guest-first via `AuthGate.startGuestSession()`. Both hubs were fixed for exactly this in PR #13; do not reintroduce it.
- Home icon → `/dashboard/`. Both hubs previously had `<a href="/" title="Dashboard">`; fixed in PR #19.
- Teacher strip, collapsed by default: the MYP framing from §1 plus the non-affiliation disclaimer. **The only surface in the product carrying IB vocabulary.**

**Dashboard** — a new pack needs more than a `pack` field:
1. `MODULE_REGISTRY` — five new entries.
2. `RTT_PACK_PLANNED = ['Ten Voices, One Source', 'The Question Decides the Answer', 'Where You Say It', 'The Cost of Later']`.
3. `LAB_PACKS['room-to-think'] = { planned: RTT_PACK_PLANNED, pillId: 'rtt-status-pill', counterId: 'rtt-counter', durationId: 'rtt-duration' }`.
4. Markup for the Lab Pack card carrying those three ids, plus the Challenge card with ids `room-to-think-challenge-status-badge` / `-best-score`.
5. Section grouping then derives itself from `pack` with **no renderer edit** — that part of PR #18 does hold.
6. `npm run check:invariants` and `scripts/check-modules.js` must pass unmodified.

---

# 8. GoodBlock — Ten Voices, One Source

**6 Cases** · `TOTAL_PAGES = 6` · icon `git-merge` · badge **"6 scenarios completed"**
**Covers:** S1–S6. **Protagonist:** Yara. **Mechanism:** ten accounts repeating one origin is one piece of evidence, ten times.

> **Design note, never on screen:** the reskin risk is registry #10, Digital Citizenship's backward provenance trace. That mechanic *walks a chain*. This one *collapses a set* and the output is a number. If the build starts looking like hop-by-hop, it has drifted.

### Case 1 — Overview (cold open)

Screen: Yara's phone, mid-scroll, one post visible accusing a Year 9 student of taking money from the trip fund. Nothing interactive except Continue.

> **Jodi (neutral):** "Well hey there. That's Yara, and that post has been in front of her for about nine seconds. Four moments today, and every one of them runs on the same little lie: if enough people are saying it, that's a lot of evidence. Let's go find out how much evidence there actually is."

Continue ↓ is available immediately. **No bullet list of what's coming.**

### Case 2 — How many does it take

**Mechanic: self-set belief threshold.** New to the registry (#29).

**Entry state.** Empty feed panel, one "Start the morning" control.

> **Jodi (neutral):** "She's got fifteen minutes before the bus. Watch it with her — and press that button the second you'd believe it. Not when you're certain. When you'd *believe* it."

**Every interaction and its result.**

| Action | Result |
|---|---|
| Start the morning | Posts arrive one per 1.8s, up to nine. Different named accounts, same claim, different wording |
| "I'd believe it now" | Feed freezes. Prints *"You'd have believed it after **N** posts."* Stores `beliefThreshold`, reused verbatim in Case 5 |
| Never pressed, reaches nine | Feed stops itself. Prints *"Nine posts and you didn't bite. Hold onto that."* Stores 10 with a flag; Case 5 copy branches |
| Re-tap after freezing | *"Already logged. You said N."* No state change — **must not be a dead click** |
| Reset ("Watch it again") | Replays in the **same order** so N stays comparable. Prints *"Same nine posts, same order."* |

**Gate vs exploration.** Exploration. There is no wrong N and it is never judged.
**Completion trigger.** Feed stopped, by either route.
**Completion confirmation.** Whiteboard opens — *"Your number"* / *"Nothing wrong with that number. In a minute you'll find out what it was counting."* Jodi `thinking`. Continue ↓ reveals.

### Case 3 — Nine voices, how much evidence

**Mechanic: source merge with a live independence counter.** New (#30).

**Entry state.** The same nine posts as a board of cards. Each carries the account name, the claim, and an **attribution line** in small text — *"heard it from @ruben_k"*, *"screenshot, poster's name cropped"*, *"my sister's in that class"*, *"just reposting what everyone's saying"*. Counter above: **INDEPENDENT SOURCES: 9**.

> **Jodi (neutral):** "Nine people said it. Now — read the little line under each one, the bit nobody ever reads, and tell me how many of them actually went and *found out* anything."

**The data.** Nine cards resolve to **two** origins: eight trace to @ruben_k's original post, one is a student who was in the room and saw nothing happen. That ninth card is the quietest on the board and it says the opposite. That is the design of the Case.

**Every interaction and its result.**

| Action | Result |
|---|---|
| Tap two cards sharing an origin | They stack into one, counter drops, line prints: *"Ruben told both of them. That's one person, twice."* |
| Merge a pair that doesn't share an origin | Cards spring back, counter unchanged, line names why: *"Different origins. One saw it herself, one got it from Ruben. Keep them apart."* Jodi `thinking` |
| Tap one card, tap it again | Deselects, with a visible state change |
| Tap a stack | Expands to show members; second tap collapses. **Re-inspection is part of the task and must work** |
| Reset ("Unstack them all") | Board returns to nine, counter to 9. **The repost counter in the corner keeps climbing through the reset** — do not rewind it |

**Gate vs exploration.** Skill-practice, gated on 2 — but every wrong merge teaches in the moment and nothing is scored.
**Completion trigger.** Counter reads 2 with the correct grouping.
**Completion confirmation.** The eight-stack dims, the single card lifts and brightens.

> **Whiteboard — "Nine voices, two sources":** "Eight of those are Ruben wearing eight different names. The ninth is the only person who went and looked, and she's the one saying it didn't happen."
> **Jodi (concerned → thinking):** "That's the bit that gets me, sugar. The one who checked is the quietest one on there."

`concerned` here is at the situation, never at the student.

### Case 4 — The board that looks the same

Same mechanic, different data. **Deliberate re-use inside the GoodBlock, because practice is the point** — it is not a second registry entry.

**Entry state.** Seven cards about a bus route being cut. Counter: **7**.

> **Jodi (neutral):** "Same job, different mess. Careful though — last time the answer was 'fewer than it looked.' That doesn't make it the answer every time."

**The data.** Seven resolve to **four**: a council notice, a driver told directly at work, a parent who rang and asked, and three reposts of the notice.

| Action | Result |
|---|---|
| Over-merging below 4 | Pair springs apart: *"The driver didn't read the notice. He got told at work. That's a second person finding out, not a second person repeating."* |
| Under-merging the three reposts | *"All three of these are the same notice with a different caption on top."* |
| Deselect / re-inspect / reset | As Case 3 |

**Gate vs exploration.** Skill-practice, gated on 4.
**Completion confirmation.** Whiteboard — *"Four is the honest number"* / *"Suspicious isn't the skill. Counting is the skill. Sometimes the count comes back high, and then you've got something."* Jodi `happy`.

> **Design note:** this Case exists because deciding everything is an echo is a *different* mistake and needs its own feedback. Covers S6.

### Case 5 — The move that changes the number

**Mechanic: the counter that will not move.** New (#31).

**Entry state.** Back on Yara's situation, counter pinned at **2**. Five action cards.

> **Jodi (thinking):** "You said you'd have believed it after **N**. Now — here's five things Yara could do next. Pick one and watch that number."
> *(Branch if never pressed in Case 2: "You watched nine and didn't bite. Good instinct. Now let's find out what would have actually settled it.")*

| Card | Effect | Result line |
|---|---|---|
| Scroll further and see who else is saying it | Three more posts, all Ruben-derived. **Counter stays at 2** | *"Three more voices, same one source. Number didn't move."* |
| Check whether the accounts are real people | All real. **Stays at 2** | *"They're real people. Real people repeat things."* |
| See how many times it's been shared | Share count, large. **Stays at 2** | *"That's how fast it travelled. Not whether it's true."* |
| Ask Ruben where he heard it | **Drops to 1** | *"He saw a screenshot. Doesn't know who took it. Your two were really one."* |
| Ask the student it's about | **Moves to 3** | *"She showed you the receipt from the trip office. Nobody in that thread had that."* |

All five are available. Used cards stay visible in a used state and **re-tapping reprints the result** rather than doing nothing.

**Gate vs exploration.** Exploration with a commitment shape. Pressing the three that don't move it is the *most* instructive path and is never marked wrong.
**Completion trigger.** Card 4 or card 5 pressed.
**Completion confirmation.** The counter panel animates through the whole history: 9 → 2 → wherever the student took it.

> **Whiteboard — "Three of those were free":** "More scrolling, more accounts, more shares. None of it moved the number, because none of it was new."
> **Jodi (happy):** "Only going to somebody who actually knows changes the number. Costs about thirty seconds, most days."

### Case 6 — Rating and handoff

> **Jodi (happy):** "So that's four moments. Nine voices and two sources, seven voices and four, and one question that was worth all the scrolling put together. Repeating is cheap and finding out costs something — that's why most of what you see is the cheap kind. Go on now. Go count something."

Star rating 1–5, selecting only selects, optional text field ≥16px, Submit appears on any star, Enter submits, Shift+Enter breaks. Visible **"Skip — show me the badge."**

**`logModuleCompletion()` fires from `advanceFromPage()` on reaching Case 6 — never from the rating handler.** Five of the seven live GoodBlocks still have it behind `finalizeCaseRating()`; that is a 🔴 on the backlog and must not be reproduced here.

Badge: `git-merge`, wine accent, **"6 scenarios completed."** Primary exit: the Room to Think hub. Secondary, smaller: the Challenge.

---

# 9. GoodBlock — The Question Decides the Answer

**6 Cases** · icon `scan-search` · badge **"6 scenarios completed"** · **Covers:** Q1–Q6. **Protagonist:** Tomás.
**Mechanism:** the conclusion was formed before the search; a question phrased to confirm returns confirmation, and it feels like it worked because the sources are real.

### Case 1 — Overview (cold open)

Screen: a document titled *Should our school keep the uniform?*, due Friday, cursor blinking on an empty page.

> **Jodi (neutral):** "Hey there. That's Tomás, that's due Friday, and he already knows what he thinks. So do you, probably — that's not the problem. Four moments today, and all four of them are about one thing: the internet is very good at agreeing with you."

### Case 2 — What you already think

**Mechanic: prior-position commit, quoted back.** New (#32).

> **Jodi (neutral):** "Say it out loud before we start. I'm not going to argue with you — I'm going to show you what a search engine does with it."

| Action | Result |
|---|---|
| **Keep it** / **Drop it** | Commits, stores `priorPosition` |
| Confidence row appears: *Pretty sure / Fairly sure / Could go either way* | Stores `priorConfidence` |
| Change either before continuing | Allowed. *"Noted — you've changed it to X."* Must respond |

**Gate vs exploration.** Neither. A commitment with no correct answer, explicitly not judged.
**Completion trigger.** Both recorded.
**Completion confirmation.** The document header fills with the student's own words: *"Going in: you think they should [keep it / drop it], and you're [confidence]."*
> **Jodi (thinking):** "Right. Hold onto that, because we're coming back for it."

### Case 3 — Guess what it's going to say

**Mechanic: predict-the-result across three runs.** New (#33).

**Entry state.** A search bar with a question already in it — *not* the student's. Run 1: *"Why are school uniforms good for students?"* Empty results panel, prediction control.

> **Jodi (neutral):** "Before you press it — what's it going to come back with? Go on, guess. There's no trick in this one."

| Action | Result |
|---|---|
| Predict: *mostly in favour / mostly against / a real mix* | Stored |
| Search (Run 1) | Four result cards, all in favour. Verdict strip: *"Your prediction: X. What came back: mostly in favour."* Marked hit or miss **as a fact, never as a score** |
| Run 2: *"Why do school uniforms harm students?"* | Predict, search. All four against |
| Run 3: *"What effect do school uniforms have on students?"* | Predict, search. A genuine mix, including one source saying the evidence is weak either way |
| Re-open any earlier result card | Allowed at any time. People re-read to compare, and that *is* the task |
| Reset | Clears predictions and results, keeps the questions |

**Gate vs exploration.** Exploration. Predictions are never graded and a miss produces no correction.
**Completion trigger.** All three runs searched.
**Completion confirmation.** A scorecard prints the three predictions side by side.

> **Whiteboard — "You got better at guessing":** "By the third one you could see it coming."
> **Jodi (thinking):** "Now — if you can call the answer before you've read a single word of it, what exactly did the searching add?"

> **Design note:** the teaching is in the student's *improving accuracy*, which is why the predictions must appear as a set at the end and never as a running score. Adding a live score converts a realisation into a quiz. Do not add one.

### Case 4 — Take the thumb off the scale

**Mechanic: word-level strike editing with live result recomposition.** New (#34).

**Entry state.** One loaded question rendered as individually tappable words:
**"Why should our school finally get rid of the pointless uniform rule?"**
Below it, a live results panel currently showing four one-sided cards, and a balance readout: *In favour / Against / Mixed*.

> **Jodi (neutral):** "Tap the words that are doing the arguing for you. Not the ones you disagree with — the ones that already decided the answer before anybody looked."

| Action | Result |
|---|---|
| Tap a load-bearing word (*Why · should · finally · get rid of · pointless*) | Strikes through, question re-renders, **results panel recomposes live**, balance readout moves |
| Strike all five | Leaves *"our school the uniform rule."* Panel flags **too broken to search**: *"Now it isn't a question. Put something back."* |
| Over-strike a neutral word (*school*, *uniform*) | *"That one wasn't arguing. That's just what you're asking about."* The word un-strikes itself with a visible animation so it doesn't read as a bug |
| Tap a struck word | Restores it, panel recomposes back. **Both directions must work** |
| Rebuild row (appears once the five are struck) | Three endings, each showing what it returns. *"How do students feel about the uniform rule?"* is **deliberately still narrow** — returns only opinion, and the panel says so |
| Reset ("Put the question back") | Original wording, original one-sided panel |

**Gate vs exploration.** Skill-practice, gated — but the gate is *"the panel is no longer single-sided,"* not *"you struck exactly our five words."* Any combination that neutralises it passes.
**Completion trigger.** Readout reads **Mixed** and a rebuild option is chosen.
**Completion confirmation.** The neutral question rises into the document header, replacing the loaded one.

> **Whiteboard — "Five words":** "Not one source changed. Five words changed, and the same internet handed back a different answer."
> **Jodi (happy):** "That gap? That was you. Every bit of it."

Covers Q6 — the same mechanism in a question you *write* rather than type.

### Case 5 — The list that gives you away

**Mechanic: framing-mix bibliography from a provenance-tagged pool.** New (#35).

**Entry state.** Eleven source cards collected across Runs 1–3 and the rebuild, each carrying a provenance tag — `from: "why are they good?"` and so on. Five empty slots labelled **Sources you're submitting**. A framing readout beneath.

> **Jodi (neutral):** "Five on the sheet. Those tags show where each one came from — and I promise you, your teacher can work that out even without them."

| Action | Result |
|---|---|
| Place a card | Slot fills, readout updates: *"5 of 5 from one question"* / *"3 from one, 2 from another"* / *"Spread across all three."* |
| All five from one framing | Plain statement, not a rebuke: *"Every one of those was found by asking the same way. That's not five pieces of evidence — that's one search, five times."* **Does not pass** |
| All five from the opposing framing | *"You've swung the other way and done exactly the same thing."* **Does not pass.** Over-correction is a different mistake and is not quietly rewarded |
| Remove a card | Returns to pool, readout updates. Must respond |
| Slot one of the two weak sources (an unsourced blog post, a 14-person survey from one class) | Names the weakness, then: *"You can use it. Just know what it is."* **They do not block completion. This is deliberate — do not turn it into a gate** |
| Reset ("Clear the sheet") | Empties all five |

**Gate vs exploration.** Skill-practice, gated on framing mix.
**Completion trigger.** Five slots filled, at least two framings represented, at least one from the neutral question.
**Completion confirmation.** The sheet stamps and the readout locks.

> **Whiteboard — "A source list is a record of how you looked":** "Anybody reading this can see what you asked."
> **Jodi (happy):** "You've made it show a person who went looking. Not a person who went shopping."

### Case 6 — Rating and handoff

> **Jodi (happy):** "Four moments. One guess you got too good at, five words, a sheet of sources and one question you'd already answered before you started. Here's the keeper: if you can guess what your search will say before you run it, you're collecting, not researching."

Header shows `priorPosition` beside one question — *"Still your position?"* — with **no answer required and nothing scored.** Just the question, left open.

Rating, completion-write rule and exits as §8 Case 6. Badge: `scan-search`, **"6 scenarios completed."**

---

# 10. GoodBlock — Where You Say It

**6 Cases** · icon `megaphone` · badge **"6 scenarios completed"** · **Covers:** A1–A6.
**Protagonist:** Inés. Group of four: Inés, Idris, Selin, Bram. Task due in three days.
**Mechanism:** an audience makes the other person perform rather than listen. In private a person can concede without losing face; in public, conceding costs status, so they defend. The audience didn't add pressure to fix it — it removed the option of fixing it.

> **Design note:** the reskin risk is registry #2, Social Intelligence's public/private slider, and #4, its binary consequence choice. **Do not build a slider.** Audience here is a set of *named people* with individual reasons for mattering — that specificity is the entire pedagogical difference. If it becomes a continuous dial, this Case has been flattened back into something already shipped.

### Case 1 — Overview (cold open)

Screen: a group chat, three days on the clock, one unanswered message from Inés — *"slides?"* — sent yesterday, no reply.

> **Jodi (neutral):** "Alright. That's Inés, that's three days, and that message has been sitting there since yesterday afternoon. Four moments today. Every one of them she already knows what she wants to say — what she's choosing is where to say it, and it turns out that's the whole thing."

### Case 2 — The same words, three rooms

**Mechanic: audience roster re-run.** New (#36).

**Entry state.** A fixed message, displayed and **never editable in this Case**: *"Idris, the slides were due yesterday and we've got nothing. We can't present without them."* Three room cards showing who is in each as named avatars — **Just Idris** (1) · **The group chat** (Idris, Selin, Bram) · **The class channel** (28, Selin and Bram among them).

> **Jodi (neutral):** "Same message, word for word. All you're picking is the room. Send it three times if you like — I want you to *see* this one, not be told it."

| Action | Result |
|---|---|
| Send to **Just Idris** | Excuse first, then *"ok I'll have them tonight."* One concession, no audience |
| Send to **the group chat** | Idris answers Selin, not Inés. Ends with no commitment |
| Send to **the class channel** | Idris replies with a joke at Inés's expense; three reactions. No commitment. Someone outside the group asks what they're doing. Jodi `concerned` — at the situation |
| Re-send to a used room | Replays. *"Same room, same result — that's the point."* |
| **Roster removal** (unlocks on the class channel after first use) | Remove one person and send again. Removing **Selin** changes the reply materially — he stops performing and gives a half-commitment. Removing Bram changes nothing. Removing three random classmates changes nothing. Each prints why: *"Selin's the one he cares what she thinks. Take her out and he's just talking to you."* |
| Reset ("Put everyone back") | Full roster restored. Threads already seen stay readable |

**Gate vs exploration.** Exploration, strictly. Sending to the class channel is **less effective, not wrong**, and is never gated or scored. Decided consciously — this is the exact distinction the skill's checklist warns about.
**Completion trigger.** All three rooms used at least once **and** at least one roster removal performed.
**Completion confirmation.** The three threads render side by side, aligned on the same original message.

> **Whiteboard — "You never changed the message":** "Idris heard the same fourteen words every time."
> **Jodi (thinking):** "What changed is who could see him answer. Now — the more folks watching, the less he could afford to agree with you."

Covers A1, A3.

### Case 3 — Three turns with Idris

**Mechanic: branching micro-dialogue, no meter.** New (#37).

**Entry state.** A one-to-one thread, empty. Three-day counter in the header.

> **Jodi (neutral):** "Right — just the two of you. Three messages. Let's see how far you get."

Three turns, three replies each. **Idris's response *is* the feedback. No meter, no score, no progress bar.**

| Turn | Options | What happens |
|---|---|---|
| 1 | *"Where are the slides?"* / *"You said yesterday and we've got nothing — what happened?"* / *"It's fine, don't stress, whenever you can."* | Accusation → he defends, gives a reason, no commitment. **Question → he gives the real reason: he can't open the file format.** This branch unlocks everything downstream. Too-soft → thanks, nothing changes. Jodi `thinking`: *"Kind. Now nobody's got slides *and* nobody's asked for any."* |
| 2 | What to do with whatever he said | Strongest: an offer plus a time — *"I've got the file, I'll send you a PDF tonight — can you do the rest by tomorrow?"* |
| 3 | Making it stick | Close with nothing / close with a time / close with a time **and** who tells the others |

| Action | Result |
|---|---|
| "Take that back and try another" | Rewinds **one turn only**, reprints the replaced reply greyed out so the comparison is visible. **Does not rewind the three-day counter** |
| Reset ("Start over") | Clears all three turns. Counter still does not rewind |

**Gate vs exploration.** Skill-practice with a soft gate: completes on any three-turn path, but a path ending with no commitment prints a named consequence and offers the rewind rather than blocking.
**Completion trigger.** Three turns played.
**Completion confirmation.** The thread collapses into a summary card — *what he agreed to, by when, who knows.* Any blank shows as blank, **visibly, not as an error**.

> **Whiteboard — "Private isn't soft":** "You asked him a question instead of telling him a fact, and he told you something you didn't know."
> **Jodi (happy):** "Now, don't confuse private with soft. That was the least soft thing you could have done — a room full of folks would have cost you that answer."

Covers A2, A4.

### Case 4 — Who actually needs to know

**Mechanic: information routing by need-to-know, four destinations, asymmetric.** New (#38).

**Entry state.** Four information cards, four bins: **Idris only · The group · The teacher · Nobody**.

> **Jodi (thinking):** "She sorted it quietly. Now — here's where folks get it wrong going the *other* way. Quiet isn't the same as secret."

| Card | Correct bin | Why |
|---|---|---|
| *"Idris couldn't open the file format."* | **Idris only** | Nobody else needs his difficulty |
| *"The slides are coming tomorrow, not today."* | **The group** | Selin and Bram are planning around a deadline that just moved. Withholding this is the over-correction |
| *"Inés redid the file conversion herself."* | **The group** | Work moved; the record should show it. As a fact, not a complaint |
| *"Inés thinks Idris is unreliable."* | **Nobody** | A verdict, not information, and three days isn't enough to know it |

| Action | Result |
|---|---|
| Place a card | Result line prints immediately, for right and wrong alike |
| Card 2 → *Nobody* | *"They're building around a deadline that just changed. That's not protecting him, that's leaving two people working blind."* |
| Card 4 → *The group* | *"That's a verdict, not news. Three days isn't long enough to know that about somebody."* |
| Move a placed card | Allowed, re-prints. **Not one-shot** |
| Any card → **The teacher** | *"Not yet. Nothing here has failed yet."* Jodi `neutral`. **Correct for none of the four — deliberate.** The teacher becomes correct in Case 5 and the contrast is the teaching. **Do not add a fifth card to "balance the bins."** |
| Reset | Clears all four |

**Gate vs exploration.** Skill-practice, gated on all four simultaneously correct.
**Completion confirmation.** The group chat lights up with the two messages Inés actually sent, composed from cards 2 and 3.

> **Whiteboard — "Private about the person, open about the work":** "Handling it quietly keeps the criticism between two people. It doesn't mean the other two find out on Friday."
> **Jodi (happy):** "That's the line, and most folks never find it."

Covers A6.

### Case 5 — The email you'd both sign

**Mechanic: near-identical-artefact choice.** New (#39).

**Entry state.** Thursday. Idris hasn't delivered. A live class-channel panel keeps ticking over with unrelated messages — **visible pressure that does not pause and does not rewind on reset.** Two drafts side by side, differing in exactly two respects.

> **Jodi (concerned):** "He didn't come through, and it's Thursday. Now — going to the teacher isn't telling on him. But there's two ways to do it and they are not the same."

- **Draft A** — *"Ms. Okafor — our group presentation isn't going to be ready. Idris was doing the slides and hasn't finished them."* To: Ms. Okafor.
- **Draft B** — *"Ms. Okafor — our group presentation isn't going to be ready. We're short a full deck and we'd rather tell you now than Friday morning. Idris and I are working out what we can still do."* To: Ms. Okafor. **Cc: Idris, Selin, Bram.**

| Action | Result |
|---|---|
| Compare | Highlights the two differences explicitly — *who is named as the problem*, and *who can see it*. Re-tappable |
| Send A | Teacher replies asking Idris directly to explain. Second panel: Idris has gone quiet in the group. Jodi `thinking`: *"True, every word of it. You also handed her one name, and she used it."* |
| Send B | Teacher offers a Monday slot and asks for what they have. Idris replies in the cc'd thread with a partial deck. Jodi `happy` |
| After sending | The other draft stays readable with a "what would have happened" control that prints the other outcome. **Comparison is the point** |
| Reset ("Unsend") | Back to two drafts. Class channel keeps ticking |

**Gate vs exploration.** Exploration with real consequence. **A is not blocked** — it is a legitimate thing a real student sends, and it is not scored. It just costs something visible.
**Completion trigger.** One draft sent.
**Completion confirmation.** The sent email renders with the cc line visible, or conspicuously empty.

> **Whiteboard — "Same facts, different room. Again.":** "Both of those were true."
> **Jodi (thinking):** "One of them put Idris in a room with an adult and no way to answer. The other put him in the room with you."

Covers A5.

### Case 6 — Rating and handoff

> **Jodi (happy):** "Four moments. Three rooms and the same fourteen words, three messages, four things somebody needed to know, and one email. Here's the keeper: before you say the hard thing, ask who's going to be watching the other person hear it. If the answer's 'lots of folks,' you've just made it about them instead of about the thing. Go on now."

Rating, completion-write rule and exits as §8 Case 6. Badge: `megaphone`, **"6 scenarios completed."**

---

# 11. GoodBlock — The Cost of Later

**6 Cases** · icon `calendar-clock` · badge **"6 scenarios completed"** · **Covers:** L1–L6. **Protagonist:** Adaeze.
**Mechanism:** pressure doesn't sharpen the work, it narrows it. The cost of starting late isn't time — it's options. Feedback, revision and changing direction each have a last date they're reachable, and they go quietly.

> **Terminology:** the schedulable unit is a **session**, never a "block." See §5.

### Case 1 — Overview (cold open)

Screen: a finished project page, handed in, with a mark and two lines of comment on it. Nothing interactive but Continue.

> **Jodi (neutral):** "That's Adaeze's, handed in on time, and there's nothing wrong with it. Four moments today, and they all come back to one thing near everybody believes: *I work better under pressure.* I'm not going to argue with you about it. I'm going to show you what it actually costs, and then you can decide."

### Case 2 — Two versions, no labels

**Mechanic: blind artefact comparison with evidence tagging.** New (#40).

**Entry state.** Two project pages side by side, **A** and **B**, unlabelled, same topic and length. Above them, a one-tap commit: **"I work better under pressure" — True for me / Not true for me.** Stores `pressureBelief`, quoted in Case 6, never judged.

> **Jodi (neutral):** "One of these had somebody else look at it before it went in. One didn't. I'm not telling you which. Now — find me the places where you can tell."

**Six meaningful regions:** a source cited but never used · a heading that doesn't match its own paragraph · a conclusion answering a slightly different question than the introduction asked · a diagram with a real caption explaining what to look at · a paragraph naming a counter-argument and answering it · a sentence visibly rewritten shorter.

| Action | Result |
|---|---|
| Tap a region | Expands with a short note on what it shows |
| Tag it *"had help"* / *"didn't"* | Tag sticks, region shows the call, tagged count updates. **No correctness feedback yet** |
| Re-tap a tagged region | Re-opens, tag changeable. Must work |
| "I'm ready to call it" (appears at three tags) | Pick which page had feedback. Reveal follows |
| Reset ("Clear my tags") | Clears tags, keeps which regions have been opened |

**Gate vs exploration.** Skill-practice-adjacent but **not gated on being right.** A wrong call reveals the answer and walks the six tells anyway. The reveal is the teaching, not the score.
**Completion trigger.** Three or more regions tagged and a final call made.
**Completion confirmation.** The pages label themselves; the six tells light in sequence with one line each.

> **Whiteboard — "You could see it":** "Nobody wrote 'rushed' anywhere on that page."
> **Jodi (thinking):** "You found it in what *wasn't* there. The caption nobody asked for. The counter-argument nobody raised. That's what the extra days buy — not more words. Somebody else's eyes."

### Case 3 — Put the sessions on the calendar

**Mechanic: dependency-aware scheduling where late placement makes options unreachable.** New (#41).

**Entry state.** A three-week calendar, today at the left, deadline at the right. A tray of **seven session cards**, some carrying dependency badges:

| Session | Dependency |
|---|---|
| Pick the topic | — |
| Gather sources (×2) | — |
| First rough draft (×2) | — |
| Get supervisor feedback | Needs a draft submitted 2 days earlier; **supervisor only meets Tuesdays** |
| Rewrite after feedback | Needs feedback received |
| Get a second reader | Needs a rewritten draft; 1-day turnaround |
| Final check and submit | — |

> **Jodi (neutral):** "Three weeks, seven things. Some of them need somebody else, and somebody else is not available whenever you happen to feel like it."

| Action | Result |
|---|---|
| Place a session | Any session whose dependency can no longer be met **greys out in the tray with its badge struck through.** It does not vanish — the student has to *see* what's been lost |
| Tap a greyed session | Prints exactly why: *"The supervisor's last Tuesday is the 14th. Your draft won't exist until the 16th."* |
| Move a placed session | Dependencies recompute live; greyed sessions can come back. **Both directions must work** |
| Place everything as late as possible | Three sessions grey out and **the calendar still "fits."** Jodi `thinking`: *"Well, it all fits. Now look at what went grey anyway."* |
| Front-load everything into week one | Not rewarded either: *"That works. You've also left ten days doing nothing, and you'll fill them rewriting the same page. Spacing isn't the same as hurrying."* |
| Reset | Tray fully restored |

**Gate vs exploration.** Skill-practice, gated — but the gate is *"all seven placed, none greyed,"* which has many valid solutions, not one.
**Completion trigger.** Seven placed, zero dependency violations.
**Completion confirmation.** The calendar draws the dependency lines between the placed sessions — the first time the student sees the shape as a structure rather than a list.

> **Whiteboard — "You didn't run out of time":** "The late version had the same number of hours in it."
> **Jodi (happy):** "What it didn't have was a Tuesday with a supervisor on it. That's the cost, sugar. Not hours. Options."

Covers L1, L2, L3, L5, L6.

### Case 4 — Ask your own notebook

**Mechanic: query-the-journal.** New (#42).

**Entry state.** Four dated journal entries and one question Adaeze has to answer for her report: **"Why did you drop the survey and use interviews instead?"**

| # | Entry |
|---|---|
| 1 | *Day 3 — "Worked on the project for two hours. Made good progress."* |
| 2 | *Day 4 — "Really struggling with this. Feeling behind."* |
| 3 | *Day 5 — "Dropped the survey. Only 6 replies in four days and I'd need about 40 for it to mean anything. Switching to 3 interviews — slower per person but I'll actually get them."* |
| 4 | *Day 9 — "Interviews done. Two useful, one not."* |

> **Jodi (neutral):** "She's got to explain a decision she made eleven days ago. Let's see if her notebook can help her out."

| Action | Result |
|---|---|
| Tap an entry to query it | 1, 2 and 4 return an **empty result panel** with *"Nothing in here about why."* Entry 3 fills the answer box completely |
| Re-query an entry | Repeats with the same result. **Not one-shot** |
| Second question loads: *"What would you do differently next time?"* | **Entry 2 now returns something** — a real feeling, and feelings are data about process. Entry 3 returns something. 1 and 4 still return nothing |
| Compose step: rewrite entry 1 so it answers *something* | Three options. The strong one names a decision and why; the weak ones add adjectives to the same non-content, and the panel says why that changes nothing |
| Reset | Empties the answer box, keeps the entries |

**Gate vs exploration.** Skill-practice, gated on both questions answered from a correct entry plus a rewrite chosen.
**Completion confirmation.** The four entries re-order by usefulness, with the rewritten entry 1 now in the useful half.

> **Whiteboard — "A journal that records effort is a diary":** "'Two hours, good progress' can't answer a single question you'll be asked later."
> **Jodi (happy):** "Now — notice I didn't throw out 'feeling behind.' That one earned its place the second the question changed. Write the decisions, not the hours."

> **Design note:** the second question exists because the first pass of this Case treated *"I'm feeling behind"* as worthless. In a process journal, affective entries **are** evidence. The Case now turns on the same entry being useless for one question and load-bearing for another. Do not simplify this back to a two-bin sort.

### Case 5 — The first ten minutes

**Mechanic: first-artefact selection.** New (#43).

**Entry state.** A fresh project, day one, nothing done. Six action cards. A panel at the right labelled **What somebody else could react to tomorrow** — currently empty.

> **Jodi (neutral):** "Ten minutes. That's all you've got today and honestly that's fine. Pick one — but keep an eye on that panel, because that's the only bit that matters tomorrow."

| Card | Panel | Result |
|---|---|---|
| Make a plan for the whole project | stays empty | *"A plan's about you. Nothing there for anybody else to look at yet."* |
| Set up the document and format the headings | stays empty | *"That's tidying. It feels like work because it *is* work — just work nobody can answer."* |
| Read around the topic for ten minutes | stays empty | *"You know more than you did. Nobody else can tell."* |
| **Write the worst possible first paragraph** | **fills** | *"That's terrible. It's also the first thing in this whole project somebody could disagree with."* |
| **Write down the three questions you can't answer** | **fills** | *"Now your supervisor's got something to be useful about."* |
| **Message the supervisor asking for a meeting** | **fills** | *"Ten minutes, and the slowest-moving thing in the project is now moving."* |

Every card is pressable in any order, repeatedly. **Re-tapping reprints.** The panel accumulates.

**Gate vs exploration.** Exploration with a commitment shape. Not gated on a "right" card — but the Case doesn't complete until the panel has something in it, and that is said plainly: *"Try another one. We need something on the right."*
**Completion trigger.** Right-hand panel non-empty.
**Completion confirmation.** The panel frames and stamps *Day 1*.

> **Whiteboard — "Start with the thing that can be wrong":** "Three of those felt more responsible than the other three, and all three left you exactly where you started."
> **Jodi (happy):** "A bad paragraph on Monday beats a perfect plan, every time — because on Tuesday somebody can argue with it."

Covers L4.

### Case 6 — Rating and handoff

> **Jodi (happy):** "Four moments. Two pages and six tells, a calendar with three things gone grey, a notebook that could only answer one question out of four, and ten minutes. Starting late doesn't cost you hours — you can always find hours. It costs you the folks who could've helped, because they've all got calendars too. Start badly, start early. Go on now."

`pressureBelief` prints back with **no correction attached** — *"You said pressure [works / doesn't work] for you. Worth asking yourself again now."*

Rating, completion-write rule and exits as §8 Case 6. Badge: `calendar-clock`, **"6 scenarios completed."**

---

# 12. New interaction registry entries

To be added to `references/storyboard-checklist.md` as **entries 29–43**, continuing from Reading the Room's 24–28.

29. **Self-set belief threshold** — press once at the moment you'd believe a repeated claim; the count at that point becomes data a later Case quotes back
30. **Source merge with a live independence counter** — merge cards sharing an origin; the independent-evidence count falls as they merge, and the honest answer is sometimes higher than it looks
31. **The counter that will not move** — choose a next action; most produce more confirmations and the counter visibly does not change
32. **Prior-position commit, quoted back** — state your view before any evidence; it returns unchallenged and unscored at the end
33. **Predict-the-result** — predict a search's output before running it, three times; improving accuracy is the lesson and is never scored live
34. **Word-level strike editing with live recomposition** — strike the words doing the persuading; the results panel recomposes as you go, and over-striking breaks the question
35. **Framing-mix bibliography** — assemble a list from a provenance-tagged pool; a single-framing selection fails in **both** directions
36. **Audience roster re-run** — audience as named, removable people rather than a dial; the same words re-delivered each time
37. **Branching micro-dialogue with no meter** — the other person's reply *is* the feedback; one-turn rewind at visible cost
38. **Information routing by need-to-know** — four items, four destinations, asymmetric answers, and one destination deliberately correct for nothing
39. **Near-identical-artefact choice** — two messages differing in one structural respect; both sendable, the reply differs
40. **Blind artefact comparison with evidence tagging** — two unlabelled versions, tag the spots that reveal which is which, revealed regardless of the final call
41. **Dependency-aware scheduling** — place sessions on a calendar; late placement makes dependent options structurally unreachable and they grey out rather than vanish
42. **Query-the-journal** — answer a question from past entries; the same entry is useless for one question and load-bearing for another
43. **First-artefact selection** — choose the first ten minutes from options mostly shaped like preparation

**Honest adjacency notes, because the registry only works if it records near-misses:**
- #37 sits close to **#28** (Reading the Room's two-turn responsive exchange). Both are short branching exchanges. The difference is that #28 is about *recovering* from a misstep and #37 is about what a *question* gets you that a statement doesn't — but they are adjacent and an ID should look at them together at UAT.
- #40 sits close to **#27** (perspective swap on paired opposite scenes) in that both present a pair and refuse a blanket rule. The mechanic differs; the shape does not.

---

# 13. Open flags and sign-off

## ⚠️ Open — must close before Phase 3

**⚠️ F1 — The character bible.** Still not bundled, and **not in the uploaded zip.** Every Jodi line here is drafted against the seven shipped scripts, which is close but is not the same as a bible pass. The 🔴 backlog item *CI 6* is still open. **This is the only flag that blocks writing final copy.**

**⚠️ F2 — Two icon names.** `scan-search` and `megaphone` must be checked against the live Lucide library before use. Guessing has failed silently twice in this codebase.

**⚠️ F3 — Accent adjacency.** `#9B3B5A` against Professional Brand's shipped `#7C3D8E`, side by side at card size on the dashboard. If they pair, take the wine darker; PB is shipped and does not move.

## ✅ Resolved in this document

- **R1 — Case numbering.** 6 Cases, 1 intro / 2–5 interactive / 6 handoff, `TOTAL_PAGES = 6`, header `X / 6`. Conforms to the locked convention.
- **R2 — Accent structure.** One Lab-Pack accent, four icons. Follows the RWR founder decision, which supersedes the skill's stale per-GoodBlock registry rule.
- **R3 — Challenge size and threshold.** 24 / 6 per category / 64 of 72, matching both existing Challenges at 88.9%.
- **R4 — HUD metrics.** Discernment / Curiosity / Discretion / Initiative, category-derived, clean 1:1, no merge.
- **R5 — Terminology.** "Blocks" → "sessions." Case vs Scenario locked. Checked before any dialogue was written.
- **R6 — Character names.** All cleared against `public/` and `docs/`. Three obvious first choices — `Priya`, `Dev`, `Nadia` — collide with Privacy & Security and were replaced.
- **R7 — Registry numbering.** 29–43, continuing from 28, with two adjacency notes recorded rather than hidden.
- **R8 — The Case 1 syllabus problem.** Every Case 1 here is a cold open. One pack's answer to a live open ask, not a fix for the other seven.

## Sign-off

- [x] Every Case has entry state, every interaction's exact result, completion trigger and completion confirmation **with real copy**
- [x] Gate-vs-exploration decided consciously per Case, with reasoning
- [x] Both-directions feedback wherever a Case can be got wrong two ways (GB1 Case 4 over-merging; GB2 Case 5 both single-framings; GB3 Case 3 too-hard and too-soft; GB4 Case 3 late and front-loaded)
- [x] Completion reachable from what is on screen on every path
- [x] No mechanic reskins any of the 28 existing registry entries; two adjacencies named
- [x] No student-facing copy references another GoodBlock
- [x] Character names verified clear across the library
- [x] Every numeral in student copy traces to the coverage map
- [ ] **Icons verified** — F2 open
- [ ] **Jodi copy checked against the character bible** — F1 open
- [ ] **Instructional Designer** — sign
- [ ] **Curriculum & Learning Science** — sign

**Not ready for Phase 3 until F1 and F2 close.** Everything else is resolved.

## Do-not-undo list for the eventual AS BUILT reconciliation

Four things in here look like bugs to a fresh reader:
1. **GB2 Case 5** — the two weak sources pass anyway. Deliberate. Not a gate.
2. **GB3 Case 4** — the teacher bin is correct for nothing. Deliberate; the contrast with Case 5 is the teaching.
3. **GB1 Case 3 / GB3 Case 5** — the repost counter and the class-channel thread keep moving through a reset. Deliberate; rewinding them removes the only pressure those Cases have.
4. **GB2 Case 4** — over-striking un-strikes itself automatically. Deliberate, and it needs the visible animation or it reads as a dead tap.

---

# 14. Challenge scenario script — all 24

Authored copy. **The Challenge Voice Standard governs every string in this section** — no narrator, no Jodi, present tense, second person, complete first sentence, under 45 words, three sentences maximum, named objects, staged physically, ends handing over the decision, options readable without the setup, and the lesson never stated in the setup.

Result lines say **what it cost**. They do not explain the mechanism — that is what the GoodBlocks are for.

**Scoring:** 3 most effective / 1 less effective / 0 least effective. Options are stored in the order below; the shuffle rotates which two of three appear first on replay. **Scenario text never changes between plays.**

## `source_counting` — HUD metric **Discernment**

**S1**
> Your uncle sends you four articles saying a supplement cures migraines. You read all four, and three of them link to the same study. He wants to know what you think.

| Option | Pts | Result |
|---|---|---|
| Tell him four articles is enough for you | 0 | Three of those were one study. You passed it on as four. |
| Open the study the three of them link to | 3 | Twelve people took part. It says so on the first page. |
| Tell him you don't trust supplements | 1 | Maybe you're right. You didn't check, so you don't know. |

**S2**
> Six people in your football group chat say Saturday's match is cancelled. Nobody says where they heard it. Your kit is still in the wash.

| Option | Pts | Result |
|---|---|---|
| Leave the kit, six people is six people | 0 | The match was on. Six people forwarded one rumour. |
| Message the coach and ask | 3 | Thirty seconds, and the match was on. |
| Ask the group where they heard it | 1 | Two of them said "someone said." You still don't know. |

**S3**
> A shop page shows forty five-star reviews for the jacket you want. All forty went up in the same week and use the same three words. The page is open on your phone.

| Option | Pts | Result |
|---|---|---|
| Buy it, forty reviews is a strong signal | 0 | The reviews were bought in a batch. So was your confidence. |
| Look for a review that describes a problem | 3 | You find three. All three mention the same broken zip. |
| Avoid the shop completely | 1 | Safe. You also walked away from something you never checked. |

**S4**
> Three posts in your feed say the swimming pool is closing. All three say "as reported by the local paper." Your swimming club meets there on Wednesday.

| Option | Pts | Result |
|---|---|---|
| Post about it yourself | 0 | Now it's four posts. Still one paper. |
| Find the paper's article and read it | 3 | It's closing for eight weeks of repairs, not for good. |
| Decide it's probably exaggerated | 1 | Partly right, for no reason you could name. |

**S5**
> Everyone at your lunch table says the new history teacher gives detentions for late homework. None of them has had her yet. Your essay is two days late.

| Option | Pts | Result |
|---|---|---|
| Stay up and finish it tonight | 1 | It's done. You still don't know if any of that was true. |
| Ask someone in the year above who has had her | 3 | She gives you until Friday if you tell her first. |
| Hand it in late, they're all guessing | 0 | They were guessing. So were you. |

**S6** — *the over-merging direction. The honest count here is higher than it looks.*
> Two people saw a car clip a wing mirror on Bell Street, one from the pavement and one from a shop doorway. They describe the car differently. Your friend says that means one of them is making it up.

| Option | Pts | Result |
|---|---|---|
| Agree, one of them must be wrong | 0 | They were standing in different places. Two views isn't two lies. |
| Keep both accounts and treat them as two | 3 | Between them you've got the colour and the direction. |
| Ignore both and wait for someone official | 1 | Cautious. You just binned the only two people who were there. |

## `question_framing` — HUD metric **Curiosity**

**Q1**
> You are picking a phone and you search "why the Nexa 7 is the best budget phone." Eight results agree with you. The shop shuts in thirty minutes.

| Option | Pts | Result |
|---|---|---|
| Buy the Nexa 7 | 0 | You asked a question with the answer already in it. |
| Search "Nexa 7 problems" as well | 1 | Now you have two one-sided searches instead of one. |
| Search "Nexa 7 review" and read the best and the worst | 3 | The battery is the weak part. You knew before you paid. |

**Q2**
> Your essay asks whether homework helps. Your first search was "homework benefits for students" and you now have eleven sources. You haven't written a word yet.

| Option | Pts | Result |
|---|---|---|
| Start writing, eleven sources is plenty | 0 | Eleven sources, one question. Your teacher can see the shape of it. |
| Search "does homework help" and add what comes back | 3 | Two of the new ones disagree with your eleven. Now it's an argument. |
| Cut down to your five strongest | 1 | Tidier. Still eleven sources' worth of one opinion. |

**Q3**
> Your gran asks whether her new tablets are safe. You search the name of the medicine plus the word dangerous. What comes back is frightening.

| Option | Pts | Result |
|---|---|---|
| Tell her to stop taking them | 0 | She stopped a medicine she needs. You searched for danger and found danger. |
| Search the medicine's name on its own and read the leaflet | 3 | The common effects are mild. The frightening ones are rare and listed. |
| Tell her you couldn't find anything useful | 1 | Honest. She's still asking. |

**Q4**
> You are deciding whether to take Design next year. You ask three people who took Design and all three loved it. Sign-up closes Friday.

| Option | Pts | Result |
|---|---|---|
| Take Design | 1 | Might be right. You asked three people who chose it and stayed. |
| Ask someone who dropped it | 3 | Four hours a week outside lessons. Now you can decide. |
| Ask the three of them what they didn't like | 1 | Better. They are still three people who stayed. |

**Q5**
> A friend sends you a job advert and asks whether it's a scam. You search the company name plus the word scam and nothing comes up. She wants an answer tonight.

| Option | Pts | Result |
|---|---|---|
| Tell her it looks fine | 0 | No results for "scam" isn't a result. The company is nine days old. |
| Search the company name on its own | 3 | Registered nine days ago, no address. That's your answer. |
| Tell her to avoid it anyway | 1 | She dodged it by luck, not by checking. |

**Q6** — *the same mechanism in a question you write rather than type.*
> You are writing a survey for your class project and your first question is "How annoying is the new lunch queue system?" Twenty-eight people are about to answer it. You have five minutes before the bell.

| Option | Pts | Result |
|---|---|---|
| Send it, everyone hates the queue anyway | 0 | You'll get exactly what you asked for and learn nothing. |
| Change it to "How is the new lunch queue system working for you?" | 3 | Nine said it's fine. You'd have missed all nine. |
| Add a second question about what's good about it | 1 | Better balance. The first question still leads. |

## `audience_choice` — HUD metric **Discretion**

**A1**
> Your dad is telling four relatives about your school trip and he has the story wrong. You were there. He's mid-sentence.

| Option | Pts | Result |
|---|---|---|
| Correct him at the table | 0 | He doubled down in front of his sister. Now it's about him. |
| Say nothing, ever | 1 | He'll tell it again next month, still wrong. |
| Let it run and tell him in the car | 3 | He said he must have got it mixed up. |

**A2**
> Your teammate keeps shooting from impossible angles and you are losing. There are two minutes left. Eleven people can hear anything you say.

| Option | Pts | Result |
|---|---|---|
| Shout at him from across the pitch | 0 | He took a worse one thirty seconds later. |
| Say nothing until after the match | 1 | You lost the two minutes. At least you didn't lose him. |
| Jog past him and say one sentence to him only | 3 | He passed the next one. |

**A3**
> Your Saturday job manager put you on the wrong rota and you're marked absent. She's on the till with six customers waiting. Your shift starts in ten minutes.

| Option | Pts | Result |
|---|---|---|
| Explain at the till while the queue waits | 0 | She said she'd look into it. She hasn't. |
| Wait and catch her in the stockroom | 3 | She fixed it on the system while you stood there. |
| Email her that night | 1 | Sorted on Thursday instead of Monday. |

**A4**
> Your friend's new haircut doesn't suit her and she has just asked the whole group what they think. Four people have already said they love it. She's looking at you.

| Option | Pts | Result |
|---|---|---|
| Say you love it too | 1 | Easy. She'll find out from a photograph instead. |
| Say in front of everyone that it doesn't suit her | 0 | She defended it for ten minutes. Nobody enjoyed that. |
| Say something true and small now, and talk properly later | 3 | She asked you on the walk home what you actually thought. |

**A5**
> Your project partner has copied two paragraphs off a website and your name is on the front page. The teacher is at the front of the room. It's due in forty minutes.

| Option | Pts | Result |
|---|---|---|
| Tell your partner quietly that you can't hand it in like that | 3 | He rewrote it that night. Nobody else ever knew. |
| Tell the teacher now, in front of everyone | 1 | Handled. Also handled in the worst room available. |
| Say nothing and hand it in | 0 | Your name is on it. |

**A6** — *the over-correction direction. Quiet is not the same as secret.*
> Your group's deadline moved to Friday because you sorted something out privately with one member. Two other people are still working to Wednesday. You don't want to embarrass him.

| Option | Pts | Result |
|---|---|---|
| Tell nobody, it's his business | 0 | Two people worked all week to the wrong day. That isn't protecting him. |
| Tell the group the date moved and leave out why | 3 | They replanned in a minute. Nothing about him came into it. |
| Tell the group the date moved and why | 1 | They know. So does everyone they tell. |

## `starting_early` — HUD metric **Initiative**

**L1**
> You have two weeks to learn a piece for your grade exam. Your teacher only hears you play on Thursdays. You can play about half of it.

| Option | Pts | Result |
|---|---|---|
| Practise every day and play it to her in the last week | 1 | One hearing, one note, and no time left to use it. |
| Play it to her badly this Thursday | 3 | She fixed your hand position with eleven days to spare. |
| Practise alone and surprise her | 0 | You learned it wrong and drilled it in. |

**L2**
> Your passport expires in five weeks and your flight is in six. The renewal site says it takes three weeks. The form is open in front of you.

| Option | Pts | Result |
|---|---|---|
| Fill it in now | 3 | It took four weeks. You had two spare. |
| Do it in a fortnight, three weeks is plenty | 0 | It took four. You missed the flight by three days. |
| Pay for the fast service nearer the time | 1 | You got there. It cost £142 you didn't need to spend. |

**L3**
> You need a reference from your form tutor for an application due in three weeks. She teaches forty other students. She's free right now.

| Option | Pts | Result |
|---|---|---|
| Ask her today, with a note about what you're applying for | 3 | She wrote it in week two, and it mentions the thing you told her. |
| Ask in week three, it only takes her an hour | 0 | Twenty minutes the night before. It's generic and it shows. |
| Ask a teacher who knows you less but has more time | 1 | On time, and it says almost nothing about you. |

**L4**
> You are cooking for six on Saturday and one of them can't eat dairy. It's Wednesday evening and you haven't picked the menu. The shops are open until nine.

| Option | Pts | Result |
|---|---|---|
| Pick the menu now and read the labels | 3 | The stock cubes had milk powder in them. You found out on Wednesday. |
| Decide Saturday morning, it's only one dish | 0 | You found out at six with the shops shut. |
| Make something you're fairly sure is safe | 1 | It was fine. You got lucky and you'll do it again. |

**L5**
> Your bike needs a new brake cable and you're riding to the coast in nine days. The shop takes two days and shuts on Sundays. It's Monday.

| Option | Pts | Result |
|---|---|---|
| Take it in this week | 3 | They found the rear brake worn too. Both fixed. |
| Take it in two days before you go | 1 | Cable done. Nobody looked at anything else. |
| Take it in the day before | 0 | They couldn't fit it in. Nine days on the old cable. |

**L6** — *front-loading is not the lesson either.*
> You finished your project draft ten days early and it's sitting in a folder. You have re-read it four times and changed two words. Your teacher runs drop-in sessions on Tuesdays.

| Option | Pts | Result |
|---|---|---|
| Keep polishing it yourself until it's due | 0 | Four more reads, two more words. Ten days for nothing. |
| Take it to a Tuesday drop-in | 3 | She asked one question you couldn't answer. That's a section rewritten. |
| Send it to a friend to read | 1 | She said it was good. She always says that. |

## Result screen

Total out of 72, threshold 64, and four category lines:

- **Discernment** — *"You went to the origin X times out of 6."*
- **Curiosity** — *"X of 6."*
- **Discretion** — *"X of 6."*
- **Initiative** — *"X of 6."*

One closing line, no narrator voice: *"The same four things kept turning up in places that had nothing to do with each other."*

Exit: the **Room to Think hub**. Never a dead end into another assessment.

---

# 15. AS BUILT reconciliation — 2026-09-12

Reconciled against the staging build on `claude/new-session-f6ve19`. This section is the
record of where the build and the storyboard differ, and why. Everything not listed here was
built as written.

## What is built

| Piece | Path | State |
|---|---|---|
| Lab Pack hub | `/jsh/room-to-think-lab/` | ✅ Built — five cards, one live, three coming-soon, ungated Challenge |
| Ten Voices, One Source | `/jsh/room-to-think-lab/ten-voices-one-source/` | ✅ Built — 6 Cases, `TOTAL_PAGES = 6` |
| Room to Think Challenge | `/educational-games/room-to-think/` | ✅ Built — all 24 scenarios, 72 / 64 |
| Tailwind bundle | `tailwind/room-to-think.config.js` → `public/assets/css/tailwind.room-to-think.min.css` | ✅ Built |
| Dashboard wiring | `public/dashboard/index.html` | ✅ Built — Room to Think section, both cards |
| The Question Decides the Answer | — | ⬜ Storyboarded (§9), deliberately not built |
| Where You Say It | — | ⬜ Storyboarded (§10), deliberately not built |
| The Cost of Later | — | ⬜ Storyboarded (§11), deliberately not built |

## Deviations from the storyboard

**D1 — Case 4 needed a seventh card that the storyboard does not name.** §8 Case 4 specifies
"seven cards" resolving to "**four**", then enumerates the origins as *a council notice, a
driver told directly at work, a parent who rang and asked, and three reposts of the notice* —
which is six cards across three origins, not seven across four. Dropping to six cards or three
origins would both have broken the Case's stated answer of four, which the whole Case exists to
produce. A fourth independent origin was authored at build time: **`@corner_shop` — "Asked the
bus company about our delivery slot. 61 stops end of term." / *asked the operator directly***.
It is independent for the same reason the driver and the parent are: somebody went and asked,
and asked a different body than the parent did. Group sizes are now notice ×4, driver ×1,
parent ×1, operator ×1 = 7 cards, 4 origins. **The honest number is still four.**

**D2 — the Challenge renders every scenario with the plain "scene" card.** The Real World Ready
chassis picks a device mockup per scenario from its `icon` field (chat, social, browser, email,
video, game). Those templates inject their own framing — `friend_123`, `4,203 likes`,
`Troll_User99`, "Professional Opportunity" — which is invented context sitting on top of an
authored setup, and §14 is explicit that the scenario text is fixed. All 24 use the neutral
scene card so nothing appears on screen that the storyboard did not write.

**D3 — the build-time validator is a new file, not an extension of an existing one.** The sprint
prompt asked for the three copy checks to go in "alongside the existing flag-target and
cost-spread checks". No such validator exists in the repo — neither check appears anywhere. The
three checks are therefore in a new `scripts/check-challenge-copy.js`, wired into
`package.json` and the `Module registry check` workflow. It runs against **all three**
Challenges, not just this one. If the flag-target and cost-spread checks are ever written, they
belong in that file.

**D4 — `scripts/check-modules.js` needed a `PACKS` row.** Acceptance criterion 25 asks for it to
pass unmodified. It cannot: `PACKS` is a hardcoded map and its own comment says "Add a row here
when a pack or lab ships." Without the row, every `pack: 'room-to-think'` registry entry fails
the unknown-pack check and the pack cannot be registered at all. The row is data registration —
it puts the new pack **under** the checker rather than outside it — and no assertion was
weakened. Same reasoning for adding the new GoodBlock to `GOODBLOCKS` in
`scripts/check-invariants.js`, which the integration checklist requires explicitly: without it
"the new module is simply not checked, and the suite passes by not looking."

**D5 — the hub's coming-soon cards put the status pill under the title, not top-right.** The
live card keeps the pill in the top-right row. On the three unbuilt cards it sits directly under
the title instead. It reads better on a card with nothing to click, and `check-modules.js` looks
for the placeholder within 400 characters **after** a planned lab's name — with the pill above
the title, the last coming-soon card had no placeholder after its own name and the two before it
were only borrowing the next card's. Each card now stands on its own.

**D6 — the "Jump to a Lab" menu rows read "Not open yet", not "Coming Soon".** Same 400-character
window: a second "Coming Soon" in the menu falls just inside the window of the live lab's own
menu row, and the checker then reports Ten Voices, One Source as both live and coming soon.

**D7 — `playPageIntro` gained a general `window.pageIntroText(pageIndex, defaultText)` hook.**
The chassis has `handoffPrefix()`, which only fires on the final Case. Case 5 has to quote the
Case 2 number back by name and branch entirely when it was never set, so the hook was
generalised rather than special-cased. One code path, used by Case 5 today.

## Defects found during verification, and fixed

**F-1 (browser pass) — Case 3 could not be completed.** Selection and inspection were the same
gesture on a stack: tapping a stack only ever toggled its members open, so a stack could never be
*selected*, nothing could be merged **into** one, and two stacks could never be combined. The
board bottomed out at five piles and the target of two was unreachable. Both the static and the
simulated layers passed the whole time — the simulated layer modelled the merge *rule*, which was
correct, and never modelled the *taps*. Fixed by making the first tap on a pile select it (a
stack also expands, so re-inspection still works) and a second tap deselect and collapse. The
simulated layer was then extended to model taps and assert the target is reachable from 300
random tap sequences per Case, so this class of bug is caught before the browser next time.
That harness lives with the build rather than in the repo; only `scripts/check-challenge-copy.js`
is checked in, because that is the one the acceptance criteria asked to run on every build.

**F-2 (static pass) — pile ids collided across Cases 3 and 4.** Both boards number their piles
`p0…pN` and the springback animation queried the document, so a wrong merge in Case 4 could
animate a card in Case 3. Scoped to the Case's own board.

**F-3 (static pass) — "I'd believe it now" was armed before the first post landed.** Pressing it
against an empty feed logged a number that counted nothing. Now armed on the first post.

**F-4 (static pass) — Case 4's merge line said "All three of these…" when four cards were
stacked.** Split into a size-3 and a size-4 line.

## Do-not-undo, carried forward

These four look like bugs to a fresh reader and are load-bearing. All four are verified in the
build and asserted by the verification suite.

1. **GB1 Case 3's repost counter keeps climbing through the reset.** Reset unstacks the board;
   it does not rewind the ticker. Rewinding it removes the only pressure the Case has. Asserted
   in the browser pass (`53 → 64 → 64`, still climbing afterwards) and in the static pass
   (`resetCase3` and `restartModule` must not touch `c3Reposts`).
2. **GB1 Case 5's three "free" cards leave the counter unchanged.** That is the teaching moment,
   not a broken handler. All three stay tappable and re-tapping reprints. Asserted in all three
   layers.
3. **GB1 Case 4's honest answer is four, not one.** The Case exists so that over-merging is
   scoreable as wrong. Asserted in the simulated pass (4 is reachable only by fully merging the
   notice group).
4. **The three unbuilt GoodBlock cards do not navigate.** Not a missing link. Asserted in the
   browser pass by clicking each one and checking the URL did not change.

Plus one introduced by the shuffle and fixed before ship:

**F-5 (browser pass) — scenario headings showed the canonical index, not the dealt position.**
With replay shuffling, a student saw "Scenario 4" sitting above a locked "Scenario 3" while the
HUD read "Scenario 5 of 6". The canonical index is what scoring and `scenario_attempts` are keyed
on and must not change; it is simply not a label for a student. Headings now number by position
in the dealt queue, so they read 1…6 in order whatever the deal.

Two more from the Challenge, on the same footing:

5. **Q4 is authored 1/3/1 with no zero-scoring option.** A worst-possible run therefore scores 1,
   not 0. Neither weaker option is a disaster worth zero. the verification harness asserts this is the *only*
   such scenario, so another one losing its zero still fails.
6. **A6 and L6 punish the over-correction.** "Tell nobody, it's his business" scores 0, and
   finishing ten days early then sitting on the draft scores 0. Front-loading and going quiet are
   not the lessons either.

## Still open

- **F1 — the Jodi character bible.** `/mnt/project/jodi-character-bible.md` does not exist in the
  build sandbox (`/mnt/project` is not mounted). **Every Jodi line in the built GoodBlock is
  therefore unchecked against the bible.** They are the storyboard's lines, drafted against the
  seven shipped scripts, entered verbatim and not improvised. This flag does not close.
- **F2 — the two icon names. CLOSED.** `scan-search` and `megaphone` were both verified against
  `public/assets/js/lucide.min.js`, the bundled library that actually renders, along with
  `git-merge`, `calendar-clock`, `compass`, `shuffle` and every icon used in the Challenge.
- **F3 — accent adjacency.** `#9B3B5A` against Professional Brand's shipped `#7C3D8E`. Both cards
  now render on `/dashboard/` and a full-page screenshot was captured for the side-by-side, but
  **this is a human judgement and has not been made.** If they read as a pair, take the wine
  darker; PB is shipped and does not move.
- **Instructional Designer** and **Curriculum & Learning Science** sign-off — unchanged, and not
  closable in code.
