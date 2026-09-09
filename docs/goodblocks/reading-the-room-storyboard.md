# Reading the Room — Storyboard v1

> **AS BUILT (2026-09-08).** Integrated at `/jsh/real-world-ready-lab/reading-the-room/` on the
> Professional Brand chassis. Deviations from the text below:
> - **Case 2:** the gut-read card is placed by tapping "Put it here" on a rung (no drag). Rung 2's evidence panel shows the three words ("they fit every one of these equally"); rungs 3 and 4 open empty. Opening either empty panel after placing on rung 4 collapses the ladder to rung 1 with "This is everything Mira actually knows."
> - **Case 3:** "Commit" unlocks on every row once any two responses have been tested. A wrong commit flashes the failing column. Both explanation cards stay on screen after completion, unresolved.
> - **Case 4:** the dial is three buttons; "Next day" records the position. The trace is an inline SVG polyline. Three closings keyed to the first day the dial moved (day 1–2 early, day 3–5 late, never).
> - **Case 5:** the teacher is Ms. Adeyemi, the friend is Dani. Each replay is four timed beats from the other person's chair; Scene B appears only after Scene A's replay finishes.
> - **Case 6:** the friend is Leah. Turn two's options depend on turn one; the outcome renders as "Door open / closed / reopened — with effort".
> - The sprint prompt's acceptance list filed the ladder under Conflict Has a Winner with "Theo". The ladder is this GoodBlock's Case 2 and names Mira, per this storyboard.

**Status:** READY FOR PHASE 3 — all flags resolved
**Lab Pack:** Real World Ready
**Coverage map:** `real-world-ready-coverage-map-v1.md` — authoritative, conforms to the `reading_room` category (R1–R8)
**Phase:** 2 of 3

---

## Identity

| Property | Value |
|---|---|
| Slug | `reading-the-room` |
| Path | `/jsh/real-world-ready-lab/reading-the-room/` |
| Accent | `#C97D1A` amber — Lab Pack level |
| Icon | `glasses` — verified against the live Lucide library 2026-09-07 |
| Badge copy | **"8 scenarios completed"** — from the coverage map's `reading_room` count |
| Narrative style | **Character-driven** — `narrativeStyle: 'character'` |
| Character | **Mira**, 12. Verified clear of Theo (Conflict Has a Winner), Priya, Nadia, Dev, Reena, Jaydn (Privacy & Security), Marcus, Sarah, Jordan (Social Intelligence), Jolene (Jolene's Lemonade) |
| HUD metric | Perspective |

**Why `glasses`:** you put them on to see what was already there and you were missing. Rejected `radar` — it is a threat-detection metaphor that builds vigilance rather than humility, which is close to the opposite of what this teaches. Rejected `scan-eye` and `scan` — both tagged "surveillance" in Lucide, colliding with Privacy & Security's territory.

---

## The misconception

**What a student currently believes:** the way a situation looks to them at first glance is what the situation *is*. A read is a verdict.

**Where it comes from:** at 12, confidence in one's own reasoning is rising sharply — which is developmentally healthy. The problem isn't that their instincts are bad; instincts pattern-match fast and are often right. What hasn't formed yet is the habit of treating a strong first read as a *flag* — "look here" — rather than a finding.

**What replaces it:** a first read is an opening signal worth one quick check. Most of the time the check confirms it. The cost of skipping the check is paid entirely in the cases where it wouldn't have.

**What this GoodBlock is NOT:** it is not "don't trust your gut" and it is not "assume you're wrong about people." A student who leaves second-guessing every read has learned something worse than they came in with. Case 4 explicitly rewards a read that survives checking, and Case 5 punishes over-correction in one direction as hard as under-correction in the other.

---

## Terminology lock

- **Case** — one page. **Every page is a Case, numbered from 1.** Case 1 is the intro. Cases 2–6 are the scenarios. Case 7 is rating and handoff. Header shows `X / 7`.
- **Scenario** — Challenge items only. Never a page label.
- **Banned in dialogue:** "case" as narrative language. Also **"read"** as a structural label — Jodi uses it constantly as a verb ("her first read"), so it must never also name a UI element or step.

---

## Standalone rule

No student-facing copy references Conflict Has a Winner, Money as a Skill, or any Digital Decisions module.

**Specific risk:** Case 5 here and Conflict's Case 5 both involve misjudging a social moment. Neither references the other. This note is rationale and stays in this document.

---

## Interaction design — self-check

Twenty-three mechanics now exist across the library (13 registry + 5 Money + 5 Conflict). None of the five below reskins one.

| Case | Exact judgment call | Exploration or commitment | Survives "remove the story"? |
|---|---|---|---|
| 2 | Whether her conclusion about a person is supported by what actually happened | Commitment | Yes — she must locate her own inference on a chain of reasoning |
| 3 | What to do when two opposite explanations are both still live and neither will resolve | Commitment | Yes — the response must hold up under either being true |
| 4 | Whether to revise a first impression as evidence accumulates | Commitment, repeated | Yes — the student's own revision history is the output |
| 5 | Whether a signal is about her or not — in both directions | Commitment, paired | Yes — a blanket rule fails one of the two scenes |
| 6 | Whether to accept what someone said or respond to what they meant, without overriding them | Commitment, two turns | Yes — the friend's state responds to the choice |

**Deliberate absences.** No limited-budget check selection. No multi-toggle. No two-bin sort. No slider. Those are the four this topic would default into.

---

## Case 2 — Three Rungs Up

**Covers:** R1 (short texts), R8 (curt one-word reply)
**Mechanic:** **Inference-ladder placement.** New to the registry.

### Entry state
A text thread. Mira's friend Sana, normally chatty, has sent three one-word replies today. Mira's gut read is displayed as a card: *"She's mad at me."*

> **Jodi (neutral):** "Alright. Three short answers and Mira's already got it worked out — Sana's mad at her. Now I'm not going to tell you she's wrong. She might be exactly right. What I want is for us to go back and find out how she got there, because I don't think she noticed how far she travelled."

### The interaction
A four-rung ladder is shown, bottom to top:

1. **What was actually said** — "k" / "sure" / "ok"
2. **What that could mean** — she's busy / she's tired / she's annoyed
3. **What I've decided it means** — she's annoyed
4. **What I've concluded about her** — she's mad at me and she's being petty about it

Mira's gut read card must be dragged or tapped onto the rung it actually sits on. Then, for every rung *above* rung 1, the student marks what evidence exists for it — and finds there is none.

**Why a ladder rather than a "is this fair?" judgment:** the skill isn't deciding whether her conclusion is wrong. It's noticing it's a conclusion at all. Asking a student to judge fairness lets them answer from vibe. Asking them to *locate* the read forces them to see the distance between the words on screen and the sentence in her head.

### Every interaction and its result

| Action | Screen | Whiteboard | Jodi |
|---|---|---|---|
| Places the card on rung 1 or 2 | Amber, stays placeable | "Look at It Again" — *Rung one is only what's on the screen. Rung two is every meaning those words could carry. 'She's mad at me' has already picked one.* | thinking — "Not quite. Rung one is just the words. Has she stopped at the words?" |
| Places on rung 4 (correct) | Locks; rungs 1–3 illuminate beneath it | "Three Rungs Up" — *Three one-word texts became a whole opinion about who Sana is. Every rung in between happened silently and fast, and none of them got checked.* | happy — "There it is. Three rungs up from anything that actually happened. And she took every one of those steps in about a second and a half." |
| Marks evidence for rung 3 or 4 | Evidence panel opens and is **empty** | "Nothing Here" — *There's no evidence on this rung. Not weak evidence. None. The rung was built out of the one below it.* | thinking — "Go on, look for it. I'll wait. There's nothing there — and that's not a trick, that's the whole point." |

### Completion trigger
Gut read placed on rung 4 **and** the empty evidence panel opened for at least one upper rung.

### Completion confirmation
The ladder collapses down to rung 1, leaving only the three actual words on screen, with a new prompt: *"This is everything Mira actually knows."*

> **Jodi (happy):** "That's all of it. Three words. Everything else was hers. Now — she still might be right, and I want to be straight with you about that. Sana might genuinely be annoyed. But Mira doesn't *know* that, and there's a real difference between 'I think' and 'I know' that most folks stop noticing somewhere around your age."

### ⚠️ Gate decision
**Skill-practice, gated.** Locating the inference is the entire exercise. Wrong placements teach immediately rather than saying try again.

---

## Case 3 — Both Still True

**Covers:** R2 (a plan happened without her), R6 (conversation stops when she walks over)
**Mechanic:** **Robust-action selector under unresolved ambiguity.** New to the registry.

### Entry state
Mira sees photos from a weekend thing she wasn't invited to. Two explanation cards are shown side by side, both plausible, neither marked correct:

- **A:** It was a small thing and she genuinely wasn't thought of
- **B:** It was deliberate and she was left out

> **Jodi (neutral):** "Two explanations. Now here's the part nobody likes: I'm not going to tell you which one it is. Neither is Mira going to find out — not today, maybe not ever. So the question isn't which one's true. The question is what she does while both of them are still standing."

### The interaction
Four possible responses. Each must be tested against **both** explanations before commitment. Tapping a response shows two outcome panels — one under A, one under B.

| Response | Under A | Under B |
|---|---|---|
| Post something passive-aggressive | Confusing and slightly alarming to people who meant no harm | Escalates it and hands them the story |
| Say nothing, pull back from the group | She's now absent from a group that didn't exclude her | Confirms the distance without her ever knowing why |
| Ask one person directly and lightly | Easy, gets a real answer | Awkward for ten seconds, gets a real answer |
| Demand to know why she wasn't invited | Reads as an accusation of people who did nothing | They get to be defensive instead of accountable |

Only "ask one person directly and lightly" holds up under both. It becomes selectable only after the student has viewed both outcome panels for at least two responses.

**Why not just pick the best response:** picking the best response is a quiz. The skill is holding two live explanations at once and choosing something that doesn't depend on guessing right. The dual-panel structure makes "works under either" a visible property rather than a claim.

### Every interaction and its result

| Action | Whiteboard | Jodi |
|---|---|---|
| Views a response's outcomes | Names what that response assumes about which explanation is true | thinking — "Notice what that one's betting on." |
| Commits to a response that fails under one | Both panels shown side by side, the failure highlighted | concerned — "That one works fine if she's right. Have a look at the other column." |
| Commits to the robust response | "The Move That Doesn't Need to Be Right" — *It costs almost nothing under either explanation, and it's the only one on the board that ends the not-knowing.* | happy — see below |

### Completion trigger
The robust response committed.

### Completion confirmation
Both explanation cards stay on screen — deliberately unresolved — with the chosen action beneath them and a label: *"Still doesn't know. Acted anyway."*

> **Jodi (happy):** "And look — she still doesn't know. I'm leaving those both up there on purpose, because that's honest. Some of this you never find out. What she did was pick the one thing that doesn't fall apart either way. That's not avoiding it. That's the most useful thing available."

### ⚠️ Gate decision
**Skill-practice, gated.** Only one response is genuinely robust, and identifying it is the skill. But every wrong commitment shows exactly which column it fails in rather than just rejecting it.

---

## Case 4 — Five Tuesdays

**Covers:** R3 (new person seems standoffish)
**Mechanic:** **Belief revision trace.** New to the registry.

### Entry state
A new student, Kofi, joined Mira's class. First impression: he didn't say much and didn't look up. Mira's read: *"He's stuck-up."*

Five observation cards arrive one at a time, one per "day." After each, Mira's read can be adjusted on a three-point control: **stuck-up / not sure / something else going on**.

> **Jodi (neutral):** "First day, he barely said a word. Mira's already got a label on him. Now — five days are going to go by, and I want you to move that dial whenever you think it should move. Or don't. I'm keeping track either way."

### The interaction

| Day | Observation |
|---|---|
| 1 | He didn't look up when introduced |
| 2 | He laughed at something across the room — genuinely, not politely |
| 3 | He answered a question in class, quietly and correctly |
| 4 | He sat alone at lunch, reading, looking comfortable |
| 5 | He said good morning to the caretaker by name |

The student's dial position is recorded after every day. Nothing is marked right or wrong in the moment.

**Why a recorded trace rather than a final judgment:** asking "what do you think of Kofi now" at the end tests conclusion, not updating. The output that matters is *when* the student moved and whether they moved at all. That's only visible as a history.

### Every interaction and its result

| Action | Whiteboard | Jodi |
|---|---|---|
| Moves the dial | Names what in that observation could justify a move — without saying the move was right | thinking — "Alright. What was it in that one?" |
| Leaves the dial unmoved | *"Holding is a choice too. It only counts if it's a choice."* | neutral — "Sticking with it. Fair. Just make sure you're sticking, and not just not-looking." |
| Reaches day 5 | Trace renders | happy — see below |

### Completion trigger
All five days viewed and the dial confirmed on day 5, at whatever position.

### Completion confirmation
The five-day trace renders as a visible line showing exactly where the student sat each day, with the observations marked beneath.

Three closings, depending on the trace:

> **Updated early:** "You moved on day two, at the laugh. That's the right place to move — it's the first thing that didn't fit. That's not being talked out of your read. That's your read doing its job."

> **Updated late:** "Took until day four. That's alright — you got there, and the evidence had piled up by then. Worth asking yourself what day two would have cost you to consider."

> **Never moved:** "Held it the whole way. Now — I'm not going to tell you you're wrong, because I don't know Kofi either. But look at that line next to those five days and ask yourself honestly: was there anything in there that could have moved it? If the answer's no, that's not a read anymore. That's a decision that stopped listening."

### ⚠️ Gate decision
**Exploration, not gated.** Never moving completes the Case. Gating on "must revise" teaches that first impressions are always wrong, which is the over-correction this GoodBlock explicitly refuses to teach. The trace does the work.

---

## Case 5 — Is This About Me?

**Covers:** R4 (teacher seems irritated), R5 (her joke lands badly)
**Mechanic:** **Perspective swap on paired opposite scenes.** New to the registry. Directly serves the Perspective HUD metric.

### Entry state
Two short scenes, played in sequence. Deliberately opposite errors.

> **Jodi (neutral):** "Two moments. They look like the same kind of thing and they are not, and that's exactly why I've put them next to each other."

### The interaction

**Scene A — the teacher.** Ms. Adeyemi is short with the class and Mira is sure it's about her late homework. Student calls it: **about her / not about her**. Then the scene **replays from Ms. Adeyemi's point of view**, with her internal state visible: she's had a difficult phone call at lunch and hasn't thought about Mira's homework once.

**Scene B — the joke.** Mira makes a joke; the group laughs and moves on. Student calls it: **about her / not about her**. Then the scene **replays from her friend Dani's point of view** — Dani's smile drops for half a second, because the joke was about something she'd told Mira privately. Mira missed it entirely.

**Why POV replay rather than judging:** the skill is not classification accuracy. It's that her own vantage point is missing information in both directions, and no amount of harder looking from inside her own head fixes that. Showing the same seconds from another person's position is the only mechanic that demonstrates it rather than asserting it.

### Every interaction and its result

| Action | Whiteboard | Jodi |
|---|---|---|
| Scene A called "about her" | POV replay runs regardless | thinking — "Watch it again. Same room, different chair." |
| Scene A called "not about her" | POV replay runs regardless | neutral — "Let's see. Watch it from where she's sitting." |
| After Scene A replay | "It Wasn't About Her" — *Nothing in the room changed. The only thing that changed was whose head we were in.* | thinking — "Not one thing in that room was about Mira. And she'd have sworn it all was." |
| Scene B called either way | POV replay runs regardless | neutral — "Now this one. Watch Dani." |
| After Scene B replay | "This One Was About Her" — *Half a second, and Mira had already moved on. The room told her. She wasn't looking.* | concerned — "That one *was* about her. And she walked straight past it — because she'd just decided this wasn't the kind of moment where she'd got something wrong." |

**Both directions, explicitly.** A student who calls both "not about her" gets Scene B's correction. A student who calls both "about her" gets Scene A's. Neither blanket rule survives the pair. This is the Case that prevents the GoodBlock teaching "nothing is ever about you."

### Completion trigger
Both scenes called and both POV replays viewed.

### Completion confirmation
Both scenes shown side by side, each labelled with what it actually was, and one line across the pair.

> **Jodi (thinking):** "One she thought was about her and wasn't. One she'd have sworn wasn't and was. Same girl, same day, same pair of eyes. So the lesson is not 'it's never about you' — that's just being wrong in a new direction. The lesson is that from inside your own head, you cannot tell. You have to go and look."

### ⚠️ Gate decision
**Exploration, not gated.** Both calls complete the Case regardless of answer. The POV replay teaches; a gate would turn it into a quiz about other people's inner lives, which is not knowable and not the point.

---

## Case 6 — "I'm Fine"

**Covers:** R7 (says "I'm fine" and clearly isn't)
**Mechanic:** **Two-turn responsive exchange with failure in both directions.** New to the registry.

### Entry state
Mira's friend says "I'm fine" and visibly isn't. Three responses.

> **Jodi (neutral):** "Last one. Her friend says she's fine, and she isn't, and Mira can see it. Now — there's a trap on both sides of this one, so take your time."

### The interaction — turn one

| Response | Friend's reaction |
|---|---|
| Take it at face value, move on | Friend's expression closes slightly. Something was on offer and it passed |
| Leave a door open — *"okay. I'm around later if you want"* | Friend's shoulders drop half an inch. Nothing said, but the door stays open |
| Insist — *"you're obviously not fine, just tell me"* | Friend goes flat and defensive. *"I said I'm fine."* |

**Turn two** offers a response to whatever happened, so a first-turn misstep is recoverable — the recovery costs something and is visibly harder than getting it right first time.

**Why two turns:** a single choice makes this a quiz with one right answer. Real versions of this are recoverable, and knowing that recovery is possible but costly is more useful than learning that one wrong sentence ends it.

### Every interaction and its result

| Path | Whiteboard | Jodi |
|---|---|---|
| Face value → turn two door-open | "Late Is Still Open" — *The moment passed, and the door can still be opened. It's just heavier the second time.* | thinking — "She caught it. A bit late, and it cost a little more to say. Still counts." |
| Insist → turn two back off | "Backing Off Is a Repair" — *Pushing made her defend the 'I'm fine.' Backing off doesn't undo that, but it stops adding to it.* | concerned — "See what pushing did? Now she's got to defend it. Mira didn't get more truth — she got less." |
| Door open first turn | "Believed Her and Didn't" — *She took the words at face value out loud, and answered what was underneath at the same time. Nobody had to be caught out.* | happy — see below |

### Completion trigger
Two turns played, by any path.

### Completion confirmation
The friend's state renders as a simple visible outcome — door open, door closed, or door reopened with effort. Continue appears.

> **Jodi (happy) — door open first turn:** "That's the one. And look at what it does: it takes her at her word out loud, and it answers the thing underneath at the same time. Nobody got called a liar. Nobody had to admit anything. The door's just open, and she knows where it is."

> **Jodi (thinking) — recovered:** "Got there in the end. Notice it was heavier the second time — that's real, and it's not a punishment. Just what it costs."

### ⚠️ Gate decision
**Exploration, not gated.** Every path completes. Both failure directions get their own feedback: face-value under-responds, insisting overrides. Neither is scored wrong; both are shown costing something specific.

---

## Case 7 — Rating and badge

Standard chassis pattern. Star selection never auto-submits; Submit appears on first star pick. Badge reuses `glasses` at the accent colour, matching the startup screen.

**Badge copy:** "8 scenarios completed"

> **Jodi (happy):** "Here's the thing I'd like you to keep. Not one time today did I tell you Mira's gut was wrong. Her first read was good more often than not — that's not the problem. The problem is she'd stopped treating it as a first read. Yours is probably good too. Just go and check it. That's the whole thing, and it takes about ten seconds."

---

## Resolutions

**Narrative style** — character-driven, Mira. Consistent with the logged A/B split: Money as a Skill second-person, Conflict Has a Winner and Reading the Room character-driven, with the Challenge as the shared measuring instrument.

**Case count** — five interactive Cases across eight Challenge scenarios. Merges verified as one judgment call each, not opposites collapsed:
- **R1 + R8 → Case 2.** Short texts and a curt one-word reply are both "a thin signal became a conclusion about a person." Same call.
- **R2 + R6 → Case 3.** Left out of a plan and conversation stopping are both "an exclusion signal that will not resolve." Same call.
- **R4 + R5 → Case 5.** These are *deliberately opposites* and are paired **because** of it, not despite it. R4 is a signal she wrongly thinks is about her; R5 is one she wrongly thinks isn't. Pairing them is what stops the GoodBlock teaching "it's never about you." This is the one merge that would have been an error to make on similarity grounds — it is made on contrast grounds, and the Case is built around the contrast.
- **R3 → Case 4**, **R7 → Case 6**, one to one.

**Icon** — `glasses`, board decision, verified live.

---

## Pre-Phase-3 self-check

- [x] Every Case has entry state, every interaction and result, completion trigger, completion confirmation — real copy, no placeholders
- [x] Every completion confirmation is a visible event, not a silent unlock
- [x] Gate-vs-exploration decided consciously per Case with reasoning
- [x] Both-directions feedback wherever a Case can be got wrong two ways (Case 4 never-moving; Case 5 both blanket rules; Case 6 face-value and insisting)
- [x] Completion reachable from what is on screen on every path
- [x] Terminology locked before dialogue — including "read" barred as a structural label
- [x] No mechanic reskins any of the 23 existing registry entries
- [x] Icon verified against the live Lucide library
- [x] No student-facing copy references another GoodBlock
- [x] Character name verified clear of every existing character across the library

**Ready for Phase 3.**

---

## New interaction registry entries — Reading the Room

To be added to `references/storyboard-checklist.md` as entries 24–28:

24. **Inference-ladder placement** — locate your own conclusion on a chain from stated evidence to judgement about a person; upper rungs open to reveal empty evidence panels
25. **Robust-action selector under unresolved ambiguity** — two contradictory explanations both stay live and never resolve; choose the response that holds under either
26. **Belief revision trace** — sequential observations with a revisable dial; the recorded history of when you moved is the output, not the final position
27. **Perspective swap on paired opposite scenes** — call a scene, then watch the same seconds from another person's vantage point; the pair is built so no blanket rule survives both
28. **Two-turn responsive exchange** — a first-turn misstep is recoverable on turn two at visible cost; failure exists in both directions
