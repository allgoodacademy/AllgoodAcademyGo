# Conflict Has a Winner — Storyboard v1

> **AS BUILT (2026-09-08).** Integrated at `/jsh/real-world-ready-lab/conflict-has-a-winner/` on the
> Professional Brand chassis. Deviations from the text below, recorded so this reads as a record
> rather than a spec to be re-applied:
> - **Case 2:** the classmate is named Sam; Theo's real need is "presenting something he doesn't understand", Sam's is "doing the whole thing alone again"; the integrative option angles ocean pollution around the satellites that track it and writes the section split down tonight. The two position cards animate into one "agreed path" card on completion.
> - **Case 3:** the "Is Theo right?" meter is frozen at 100% by construction (its width is never written). Exit recovers effectiveness by +15 (capped at 100). Four non-exit rounds leave "Leave the thread" as the only reply. Jodi's "watch that top one, it's not going to move" line is in the Case's intro so it plays before the first click.
> - **Case 4:** the friend is Ravi; the outcome panel shows three short beats, not a score.
> - **Case 5:** the friends are Amira and Jess. The "…something else?" card is greyed from the start and fills in only after both threads are opened, per the board's Q3 resolution.
> - **Case 6:** the friend is Nia (Ellis appears as the audience); cost labels are the four social framings from the storyboard; turn 4 offers concede only.
> - **Character name collision, flagged:** Professional Brand's Case 5 already uses "Theo" for the classmate live-tweeting the class. The storyboard's clearance check did not cover Professional Brand. Kept as specified (founder-approved storyboard); raised in the build report and the Decisions log.

**Status:** READY FOR PHASE 3 — all flags resolved
**Lab Pack:** Real World Ready
**Coverage map:** `real-world-ready-coverage-map-v1.md` — authoritative, conforms to the `conflict` category (C1–C8)
**Phase:** 2 of 3. No code until every ⚠️ below has a written resolution.

---

## Identity

| Property | Value |
|---|---|
| Slug | `conflict-has-a-winner` |
| Path | `/jsh/real-world-ready-lab/conflict-has-a-winner/` |
| Accent | `#C97D1A` amber — Lab Pack level, shared with all Real World Ready GoodBlocks |
| Icon | `merge` — verified against the live Lucide library 2026-09-07 |
| Badge copy | **"8 scenarios completed"** — from the coverage map's `conflict` count, not the Case count |
| Narrative style | **Character-driven** — `narrativeStyle: 'character'` on the Firestore completion doc |
| Character | **Theo**, 12. Present in all five Cases. Verified clear of Priya, Nadia, Dev (Privacy & Security), Marcus, Sarah, Jordan (Social Intelligence), Jolene (Jolene's Lemonade) |
| Mentor | Solo Jodi |

---

## Narrative style — why character-driven, and how the A/B actually works

**The A/B was already decided and logged.** Money as a Skill is tagged `narrativeStyle: 'second-person'` specifically so the two styles can be compared. Writing this GoodBlock second-person too would have quietly killed that.

Final split across the Lab Pack:

| GoodBlock | Style | Tag |
|---|---|---|
| Money as a Skill | Second-person — "you and a friend" | `second-person` |
| Conflict Has a Winner | Character-driven — Theo | `character` |
| Reading the Room | Character-driven | `character` |

**The Challenge is the measuring instrument, and this is the part that makes the comparison real.** Each GoodBlock has its own Challenge category and its own HUD metric. Judgment comes from a second-person GoodBlock; Composure and Perspective come from character-driven ones. Same assessment, same student, same sitting — so per-category Challenge performance is a genuine read on whether narrative style affected how well the material landed. Without that shared instrument the comparison would be two completion rates on unrelated topics, which measures nothing.

Topic still confounds it. This gives directional signal, not proof. Saying otherwise would be the kind of efficacy overclaim the board's hard rule exists to prevent.

**Second reason, independent of the A/B:** this content is safer in third person. Case 6 opens by telling someone they are wrong mid-argument. Aimed at a 12-year-old that is confrontational; aimed at Theo it is observational, and the student gets to notice the pattern without defending themselves while doing it.

**Why `merge`:** two lines converging into one path is the misconception being overturned — an integrative option existed and nobody looked for it. Rejected `handshake` (depicts the outcome, not the skill, and reads corporate). Full board reasoning in the Decisions Log.

---

## The misconception

**What a student currently believes:** a disagreement ends when one person wins. Compromise means you lost and were too weak to hold your position.

**Where it comes from:** peer culture and media model conflict as zero-sum. Group chat arguments have winners. Nobody models the version where both people leave with what they actually needed.

**What replaces it:** most conflicts have an option nobody has looked for yet, because both sides are arguing about *positions* instead of saying what they actually *need*. Finding that option isn't losing. It's the harder move.

**What this GoodBlock is NOT:** it is not "always compromise" or "avoid conflict." A student who learns to fold every time has learned a different wrong thing. Several Cases below deliberately reward holding a position.

---

## Terminology lock

Per the Lab Pack convention, locked before any dialogue is written:

- **Case** — one page. **Every page is a Case, numbered from 1.** Case 1 is the intro. Cases 2–6 are the scenarios. Case 7 is rating and handoff. Header shows `X / 7`.
- **Scenario** — Challenge items only. Never a page label.
- **Banned in dialogue:** Jodi never uses "case" as a narrative word ("make your case", "in this case"). The structural label owns it. This exact collision shipped once already.
- **Also banned:** "win", "lose", "beat" as *approving* narration. Jodi may quote a student using them; she never endorses the frame.

---

## Standalone rule

No student-facing copy in this GoodBlock may reference Money as a Skill, Reading the Room, or any Digital Decisions module. Lab Pack modules are taken in any order.

**Specific risk here:** Case 4 (below) is thematically adjacent to Reading the Room's R5. Neither may reference the other in student-facing text. This note is design rationale and stays in this document.

---

## Interaction design — the self-check, done honestly

Worked through the skill's four questions before choosing any widget. Existing registry has 13 entries plus Money as a Skill's 5; the aim is that none of these five reskin those.

| Case | Exact judgment call | Exploration or commitment | Survives "remove the story"? |
|---|---|---|---|
| 2 | Whether to argue your position harder or ask what the other person actually needs | Commitment | Yes — student must generate an unstated need from two stated positions |
| 3 | Whether to keep being right or start being effective, with an audience watching | Commitment, escalating | Yes — cost accrues visibly per turn regardless of narration |
| 4 | Whether to accept a bad-but-real apology or hold out for a better one | Commitment | Yes — student weighs a concrete repair against a hoped-for one |
| 5 | Whether to take a side when two friends both want you to | Commitment, with a genuine third option | Yes — the third option is not offered; it must be constructed |
| 6 | Whether to concede mid-argument when you realise you're wrong | Commitment, timed | Yes — the cost of conceding rises the longer you wait |

**Deliberate absences.** No multi-toggle (Money's Group Fund, Privacy & Security #7). No limited-budget check selection (Money's Upgrade Trap, Digital Citizenship #11). No binary consequence choice (Social Intelligence #4). Those are the three this topic would most easily default into.

---

## Case 2 — The Unspoken Need

**Covers:** C1 (group project, two topics), C3 (rule change at home)
**Mechanic:** **Position-to-need translator.** New to the registry.

### Entry state
Theo and a classmate are locked on different topics for a group project. Both positions shown as opposing statement cards. Jodi's opening line plays.

> **Jodi (neutral):** "Alright. Two people, two answers, and both of them are sure. Now — everybody's first instinct here is to figure out who's right. I want you to do something else. I want you to figure out what each of them is actually *worried about*, because I promise you neither one has said it out loud yet."

### The interaction
Each position card has three candidate "what they actually need" statements underneath. Only one per person is the real underlying interest; the other two are restatements of the position in softer words. Student picks one per person — **two picks total**.

Once both are picked, a third card appears: **"Is there an option that gives both of them that?"** — with three constructed options. Only one satisfies both stated needs.

**Why not multiple choice on "what should they do":** that skips the actual skill. The hard part isn't picking a resolution, it's noticing that "I want topic A" and "I'm worried I'll get stuck doing all the work" are different sentences. The interaction forces the translation step before any resolution is available.

### Every interaction and its result

| Student action | Screen | Whiteboard | Jodi |
|---|---|---|---|
| Picks a restatement (wrong) | Card shows amber border, stays selectable | "That's the Position Again" — *Read it back. That's the same sentence wearing different clothes. A need is something they'd be worried about even if they got their way.* | thinking — "Mm. Read those two side by side. That's the same thing said politer. What are they *afraid of*?" |
| Picks the real need (right) | Card locks green, position card dims | "Underneath the Position" — *Now you've got something to work with. Positions collide. Needs usually don't.* | happy — "There it is. Notice that's not what they said. It's what they meant." |
| Both needs found | Third card set appears | "Now Look For The Door" — *Two positions can't both win. Two needs usually can. That's not a compromise — it's an option nobody had looked for.* | neutral — "Now. With both of those on the table, is there a way through that gives them each the thing they were actually worried about?" |
| Picks a losing option | Amber border, stays selectable | Names which need it fails and why | thinking — "Close. But go back and check — whose worry does that one leave sitting there?" |
| Picks the integrative option | Green, Case completes | "Nobody Lost" — *Neither of them got their original answer. Both of them got the thing underneath it. That's the move most people never look for, because they're busy trying to win the first argument.* | happy — see completion below |

### Completion trigger
Both underlying needs correctly identified **and** the integrative option selected.

### Completion confirmation
Both position cards visually merge into a single card showing the agreed path — a literal echo of the `merge` icon. Continue prompt appears.

> **Jodi (happy):** "Look at that. Neither one of them got what they walked in asking for, and neither one of them lost. That's not a compromise — a compromise is where everybody gives something up. Nobody gave anything up here. Somebody just finally asked the right question."

### ⚠️ Gate decision
**Skill-practice, gated.** Constructing the integrative option is the entire point; letting a student proceed having failed it teaches nothing. Every wrong pick teaches immediately on the spot rather than saying "try again."

---

## Case 3 — The Cost of Being Right

**Covers:** C6 (group chat spiral), C7 (teammate dismisses your idea publicly)
**Mechanic:** **Escalating exchange with a running cost meter.** New to the registry.

### Entry state
A group chat. Someone has publicly dismissed Theo's idea, and they are factually wrong. Theo is correct. Three reply options for him.

> **Jodi (neutral):** "Now this one's different, because here — Theo's right. Genuinely, actually right. Which is exactly what makes it dangerous."

### The interaction
Four exchange rounds. Each round offers three replies for Theo: **escalate**, **hold and restate**, or **exit the thread**. Every round shows two live meters:

- **Is Theo right?** — stays at 100% the entire time and never moves
- **Is this working?** — drops with every escalation, holds flat on restate, recovers on exit

**Why the meters:** the concept is that being right and being effective are separate quantities. A student can *hear* that in a sentence and not believe it. Watching one meter sit frozen at 100% while the other collapses makes the separation impossible to miss. This is the one Case where a continuous visual is the correct answer rather than a lazy one — the concept is fundamentally about two independent quantities.

**✅ Q2 resolved** — see resolutions section.

### Every interaction and its result

| Round | Escalate | Hold and restate | Exit |
|---|---|---|---|
| 1 | Effectiveness −25. *"He just made it about who's smarter."* | No change. *"Restating once is fair."* | Available, effectiveness recovers. Case can end here. |
| 2 | −25. Others start replying to the argument, not the point | −10. *"Twice reads as a lecture."* | Recovers. Case can end here. |
| 3 | −25. Theo's original point is now invisible in the thread | −10 | Recovers |
| 4 | −25, floor. *"Nobody remembers what he was right about."* | −10 | Recovers |

Whiteboard updates every round with what specifically shifted. Jodi's mood tracks: neutral → thinking → concerned as effectiveness drops.

### Completion trigger
Theo exits the thread at **any** round — **or** reaches round 4 by any path, at which point the exit becomes the only option.

**Reachability check:** every path terminates. Exit is available from round 1. Escalating four times floors the meter and forces exit. No dead end exists.

### Completion confirmation
Both meters freeze side by side and are labelled explicitly: **Right: 100%** / **Effective: [final]%**.

> **Jodi (thinking):** "Look at those two numbers. He never stopped being right — not once, not for a second. And it didn't help him at all past about the second message. That's the whole thing I wanted you to see. Being right is a fact. Being effective is a choice, and they're not the same button."

### ⚠️ Gate decision
**Exploration, not gated.** Exiting at round 1 and exiting at round 4 both complete the Case. The cost of escalating is the teaching; refusing to let a student experience it would be the quiz-in-disguise failure. A student who escalates to the floor has learned more viscerally than one who exited immediately.

**Both-directions feedback:** exiting at round 1 is not silently rewarded. Jodi names that leaving instantly also left the point unmade — *"He didn't lose anything. He also didn't say his piece. There was one restate available there that cost him nothing."*

---

## Case 4 — The Apology That Isn't Great

**Covers:** C5 (bad apology)
**Mechanic:** **Repair evaluation against a hidden bar.** New to the registry.

### Entry state
A friend has apologised to Theo. The apology is technically an apology and clearly not fully sorry — *"ok I'm sorry you took it that way, can we drop it."*

> **Jodi (neutral):** "So that's an apology. Sort of. It's got the word in it. Now — he can push for a better one. People do. I just want you to look at what pushing actually costs, and what he'd be pushing *for*."

### The interaction
Student marks each of four elements as **present** or **missing** in the apology:

- Named what they did — *missing*
- Said sorry — *present*
- Took responsibility (vs "sorry you felt") — *missing*
- Offered to change something — *missing*

Then a single commitment on Theo's behalf: **accept it**, **name one missing piece**, or **hold out for a full apology**.

**Why the audit precedes the choice:** without it the decision is a vibe. Having named that three of four pieces are missing, the student is choosing against something concrete rather than a feeling.

### Every interaction and its result

| Action | Whiteboard | Jodi |
|---|---|---|
| Marks an element wrong | Names the specific words in the apology that decide it | thinking — "Read it once more. Where exactly does it say that?" |
| All four marked correctly | "Three Missing, One Present" — *It has the word and almost nothing else. That's real information, and it's not the same as it being worthless.* | neutral — "So now he knows exactly what he's got. One out of four. What should he do with that?" |
| **Accept it** | "Accepting Isn't Agreeing" — *You can accept a thin repair and still know it was thin. Accepting is a decision about the relationship, not a grade on the apology.* | thinking — "That's allowed. Just — he noticed. That matters more than you'd think." |
| **Name one missing piece** | "The Ask That Usually Works" — *Naming one specific missing thing is a request someone can actually act on. 'That wasn't a real apology' isn't.* | happy — "That's the strongest move on the board, and it's not the toughest one. One specific thing they can actually do." |
| **Hold out for full** | "Holding Out Has a Price" — *Sometimes worth it. But a full apology can't be extracted — it has to be offered. Holding out often means waiting for something that was never coming.* | thinking — "Sometimes that's right. Just know what he's waiting on, and whether it was ever on its way." |

### Completion trigger
All four elements correctly marked **and** one of the three responses committed.

### Completion confirmation
Chosen response locks and expands to show what happens next in the friendship — a concrete consequence, not a score. Continue appears.

### ⚠️ Gate decision
**Hybrid, decided deliberately.** The audit is skill-practice and gated — the four elements have factually right answers readable in the apology text. The response is exploration and ungated — all three are legitimate and depend on the relationship. Naming one missing piece is framed as strongest without the others being marked wrong.

---

## Case 5 — Both of Them Want You

**Covers:** C4 (two friends, both want you to agree)
**Mechanic:** **Two-inbox pressure with an unlisted third option.** New to the registry.

### Entry state
Two of Theo's friends have fallen out. Both message him separately. Both want him to agree that they're right. Two message threads shown side by side, each with reply options.

> **Jodi (neutral):** "Two people he likes, and they both want the same thing from him: they want him to say they're right. Now — everybody looks at this and sees two doors. Have a look and tell me if you're sure that's all there is."

### The interaction
Each thread offers three replies: **agree with them**, **defend the other one**, **deflect**. All six are available. The genuine third option — declining the frame while staying present with both — **is not in the list**. It unlocks only after the student has read both threads fully, which requires opening each at least once.

**Why the third option is hidden:** the misconception is that two positions are the only positions. Handing over "refuse to take a side" as button three teaches the answer instead of the noticing. Making it appear only after both sides have actually been read reproduces the real move — you can't decline a frame you haven't understood.

**✅ Q3 resolved** — see resolutions section.

### Every interaction and its result

| Action | Result | Jodi |
|---|---|---|
| Opens one thread | That thread expands; other dims | neutral — "Alright. That's her side. Don't let him answer yet." |
| Opens both threads | **Third option unlocks** with a visible reveal | thinking — "Now he's heard both. Notice anything? They're not even arguing about the same thing." |
| Agrees with one | That friendship holds, other visibly cools. Both consequences shown | concerned — "He picked. And he was kind about it. Look what it cost on the other side." |
| Defends the absent one | Both cool. The friend he was talking to feels unheard | concerned — "He defended somebody who isn't in the room, to somebody who is. Both of them feel unheard now." |
| Deflects both | Neither cools sharply, neither warms. Both drift | thinking — "Nobody's angry. Nobody's closer either. Sometimes that's the right trade. Sometimes it's just avoiding." |
| **Declines the frame** | Both threads stay warm. Neither dispute resolves — and that's shown, not hidden | happy — see below |

### Completion trigger
Any of the four responses committed. All complete the Case.

### Completion confirmation
A relationship state panel shows both friendships' standing after the choice — for every path, including the strongest one.

> **Jodi (happy) — declining the frame:** "That's it. And notice what he did *not* do: he didn't fix it. They're still not talking to each other. He just refused to be the judge, and he stayed somebody they can both still talk to. That's not sitting on the fence. Sitting on the fence is having no opinion. He's got one — he just didn't hand it over as a verdict."

### ⚠️ Gate decision
**Exploration, not gated.** All four are real moves with real costs. Taking a side isn't wrong — sometimes one friend is genuinely in the wrong. Gating would teach "never take a side," which is its own bad lesson.

---

## Case 6 — When You're the One Who's Wrong

**Covers:** C2 (naming a pattern), C8 (realising mid-argument you're wrong)
**Mechanic:** **Rising-cost concession window.** New to the registry.

### Entry state
Mid-argument. Theo has been pushing a position. New information arrives that makes it clear he's wrong.

> **Jodi (neutral):** "Last one, and it's the hardest, so I'll just say it plain. He's wrong. He's worked out that he's wrong, and he's three messages into arguing that he's right. Everybody's been here. What happens next is the whole thing."

### The interaction
Each turn the student picks for Theo: **concede now**, **deflect**, or **double down**. A **cost-to-concede** indicator rises every turn he doesn't concede. Conceding is available every single turn — never blocked.

Cost framing is social, not numeric: *"easy"* → *"a bit awkward"* → *"he'll have to walk it back"* → *"he'll have to explain why he kept going."*

**Why rising cost rather than a countdown:** a timer teaches urgency. This isn't about speed — it's that the price of conceding is real and it compounds. A student who has Theo concede at turn four should feel a genuinely worse landing than one who conceded at turn one, without ever having been blocked from conceding.

### Every interaction and its result

| Turn | Concede | Deflect | Double down |
|---|---|---|---|
| 1 | *"That's my bad, you're right."* Costs nothing. Case completes | Cost → awkward | Cost → awkward, other person digs in |
| 2 | Costs a little. Completes | Cost → walk it back | Cost → walk it back, audience notices |
| 3 | Requires walking back. Completes | Cost → explain yourself | Cost → explain yourself |
| 4 | Requires explaining why he kept going. Completes | Deflect and double down both removed — **concede is the only option** | Removed |

### Completion trigger
Concede, at any turn. Turn 4 leaves it as the only available action.

**Reachability check:** concede is present and enabled at every turn. No path can avoid it.

### Completion confirmation
A side-by-side of what conceding would have cost at turn 1 versus what it cost at the actual turn — showing the gap concretely.

> **Jodi (happy) — conceded at turn 1:** "That's the whole skill and it took him four words. Most grown adults can't do that. He didn't lose the argument — he ended it, and he's the reason it ended."

> **Jodi (thinking) — conceded later:** "He got there. That's what matters. Just look at that gap — same three words, and back at the start they'd have cost him nothing at all. That's not a lecture. That's just the price going up while he decides."

### ⚠️ Gate decision
**Skill-practice, gated on the action but not the timing.** The Case requires conceding — that *is* the skill. But when Theo concedes is free, and the cost difference is the entire lesson.

---

## Case 7 — Rating and badge

Standard chassis pattern. Star selection never auto-submits; Submit appears on first star pick. Badge reuses `merge` at the accent colour, matching the startup screen.

**Badge copy:** "8 scenarios completed" — from the coverage map.

> **Jodi (happy):** "Here's what I want you to take out of here. Every single one of those had a version where somebody wins and somebody loses, and every single one had another way through that most folks never go looking for. You went looking. Keep doing that."

---

## Resolutions — all flags closed

**✅ Q1 — Narrative style. RESOLVED (founder).**
Character-driven, Theo. The A/B was already a logged decision and writing this second-person would have broken it. Full reasoning in the Narrative Style section above. `narrativeStyle: 'character'` goes on the Firestore completion doc.

**✅ Q2 — Case 3's frozen meter. RESOLVED (board).**
Leave it frozen at 100%. Jodi names it out loud on round one so it reads as deliberate rather than broken: *"Watch that top one. It's not going to move. That's the point."* An empty progress bar reads as broken; a **full** one that stays full reads as emphatic. Rejected the alternative (meter visibly tries to move and snaps back) — animating it implies his rightness is under threat, which is the opposite of the concept.

*Dissent worth knowing:* Product Designer wanted the snap-back animation for visual interest and only dropped it once the concept argument was made. If the frozen meter tests badly with real students, that alternative is the fallback, not a redesign.

**✅ Q3 — Case 5's hidden option. RESOLVED (board).**
Use a **greyed placeholder** visible from the start, labelled *"…something else?"*, which fills in once both threads are read. Keeps the discovery moment — the student still can't act on it until they've read both sides — while removing the "why did a button appear" problem. A UI element that materialises with no prior trace reads as a glitch, and a student who thinks the interface is broken stops trusting it.

**✅ Q4 — Case count vs scenario count. RESOLVED (board, with a check).**
Five interactive Cases across eight Challenge scenarios stands. Verified the two merges are genuinely one judgment call each, not two opposites collapsed:
- **C1 + C3 → Case 2.** Group project topics and a rule change at home are both "two stated positions, unstated needs underneath." Same call, different setting. Merge holds.
- **C6 + C7 → Case 3.** Group chat spiral and public dismissal are both "you're right and it's costing you." Same call. Merge holds.

The remaining four scenarios (C2, C4, C5, C8) map one-to-one onto Cases 4, 5, and 6, with C2 and C8 sharing Case 6 as the same "name it and own it" move.

*Instructional Designer's caveat:* this is the exact error class the skill documents — two scenarios once read as near-duplicates when they were opposites. The merges were re-derived rather than assumed, but the check should be repeated by whoever writes the Challenge scenario copy, since that's when a genuine difference would surface.

---

## Pre-Phase-3 self-check

- [x] Every Case has entry state, every interaction and result, completion trigger, completion confirmation — with real copy, not placeholders
- [x] Every Case's completion confirmation is a visible event, not a silent unlock
- [x] Gate-vs-exploration decided consciously and separately for each Case, with reasoning
- [x] Both-directions feedback where a Case can be got wrong two ways (Case 3 over-exit; Case 5 deflect)
- [x] Completion reachable from what is on screen for every path — checked per Case
- [x] Terminology locked before dialogue written
- [x] No mechanic reskins an existing registry entry
- [x] Icon verified against the live Lucide library
- [x] No student-facing copy references another GoodBlock
- [x] **Q1–Q4 resolved** — all four closed, see Resolutions

**This storyboard is ready for Phase 3.** All flags carry written resolutions with reasoning.
