# Digital Decisions — Standards Coverage Map v1

**Status:** Awaiting sign-off — Instructional Designer / Curriculum & Learning Science
**Authored:** 2026-09-11
**Covers:** Social Intelligence, Privacy & Security, Digital Citizenship, Professional Brand

**Frameworks referenced:**
- **CASEL** — the five core competencies of the CASEL 5 (Self-Awareness, Self-Management, Social Awareness, Relationship Skills, Responsible Decision-Making).
- **ISTE Standards for Students (2016)**, Standard 2 — *Digital Citizen*, sub-standards 2a–2d. The edition matters: ISTE renumbered in later revisions, and the For Teachers page says "ISTE Standard 2," so this document states which Standard 2 it means.

---

## What this document is, and how it was written

`public/for-teachers/index.html` tells teachers that every GoodBlock is designed around one CASEL competency, and prints a table naming a specific competency for each of the seven. Until now nothing in this repository stood behind that table — `grep -ric casel docs/` returned zero. A department head who emailed `learning@allgoodacademy.com` for the mapping could not be sent anything.

**The method, because it changes how much this is worth.** Each mapping below was written from the lesson content *upward*. The procedure was: read what the Case actually asks a student to do, describe that, and only then name the competency it exercises. It was not written by taking the claimed competency and looking for Cases that could be made to fit it. That distinction is the whole value of the document — a map produced the other way around will always confirm whatever it set out to confirm.

Where that method produced something other than a clean confirmation, it is stated rather than smoothed. See **Findings** at the end.

**This is not a sign-off.** Claude Code authored it; Claude Code is not the signing authority. It needs Instructional Design and Curriculum & Learning Science to read it against the live modules and sign.

---

## Social Intelligence

| | |
|---|---|
| **Builds (live table)** | Empathy |
| **CASEL claimed (live table)** | Social Awareness · Relationship Skills |
| **Challenge category** | `social_intelligence` — 11 of 30 DDC scenarios |
| **Structure** | 7 Cases (1 overview, 2–6 interactive, 7 handoff) |

### Case-level evidence

| Case | What the student is asked to do | Competency exercised |
|---|---|---|
| **2 — The Inciting Incident** | Marcus has published the team deck with the student's name removed from slide 1. Tap each of three real reactions — public callout, passive vent, private backchannel — and see how each one lands before choosing. | **Social Awareness.** The mechanic is anticipating another person's response to each move, not picking a "right" one. |
| **3 — The Theater Trap** | Slide a dial between "public bleachers, 40 watching" and "private hallway" and watch Marcus's defensiveness track the audience size — 95% in public, with his line *"I can't back down in front of everyone."* | **Social Awareness.** Direct perspective-taking: the student models another person's internal state and sees it change with a situational variable they control. The strongest single instance of the competency in this GoodBlock. |
| **4 — The Script Lab** | Build a de-escalating message from a three-part formula — Observation + Impact + Clean Ask — choosing one tile per part from paired options (*"You always take credit for group work"* vs *"Hey Marcus, I noticed my name was left off the title slide"*). | **Relationship Skills.** Communicating effectively and resolving conflict constructively — a named CASEL sub-skill, practised as construction rather than recognition. |
| **5 — The Ally Protocol** | Sarah is being mocked in an open comment thread. Compare a public counter-attack against silently reporting and sending a warm private check-in, and see the outcome of each. | **Relationship Skills** (offering support, standing up for others) and **Social Awareness** (what the person being mocked actually experiences, as against what looks like defending them). |
| **6 — The Temperature Check** | An abrasive message from Jordan lands; a high-heat reply is already staged in the box. Tap once to run a three-second reset before it can send. | **Self-Management** — impulse control. *Not a claimed competency.* See the note below. |

### ISTE Standard 2

**2b — engage in positive, safe, legal and ethical behavior when using technology, including social interactions online.** This is the substance of the entire GoodBlock, and unusually literally: every Case is an online social interaction. Case 2 is a class channel, Case 5 a public comment thread, Case 6 a direct message. Case 4 is the practised form of 2b — the student builds the positive interaction rather than selecting it.

### Trait confirmation

The DDC HUD renders **Empathy** from `catPoints.social_intelligence` (`public/educational-games/digital-decisions/index.html:727`). Matches the Builds column. ✅

### Note — coverage beyond the claim

Case 6 exercises **Self-Management**, which the live table does not claim for this GoodBlock. This is not a defect and needs no correction; it is recorded because a coverage map that only ever reports matches is not being read carefully. The two claimed competencies are each carried by two Cases independently of it.

---

## Privacy & Security

| | |
|---|---|
| **Builds (live table)** | Critical Thinking |
| **CASEL claimed (live table)** | Responsible Decision-Making |
| **Challenge category** | `privacy_security` — 8 of 30 DDC scenarios |
| **Structure** | 6 Cases (1 overview, 2–5 interactive, 6 handoff) |

### Case-level evidence

| Case | What the student is asked to do | Competency exercised |
|---|---|---|
| **2 — The Scam Sort** | Five overnight items, one at a time. Call each legit or scam *before* being told anything — the Case's own framing is *"you don't get to un-see a link after you've tapped it."* | **Responsible Decision-Making.** Evaluating before acting, with the irreversibility of the action made explicit. |
| **3 — The Permission Calibration** | A flashlight app requests camera, torch, contacts, always-on location and microphone. Judge each request against the one job the app does — the Case states the question is *not* "is this app shady." | **Responsible Decision-Making.** Replaces a global impression with a per-item analysis against a stated criterion. Also the clearest **ISTE 2d** instance in the pack. |
| **4 — The Password Pressure Test** | Type a password and read an honest offline-crack-time estimate; compare `Tr0ub4dor&3` against `purple tractor mango stapler`, then against the same phrase one word longer. | **Responsible Decision-Making.** The student's prior belief ("clever is strong") is tested against a measurement they generate themselves, rather than corrected by Jodi. |
| **5 — The DM Redirect** | A friendly message from a stranger. Before deciding anything, check every item it is actually fishing for — which school, last name, whether an adult is home, phone number, current physical location. | **Responsible Decision-Making.** Naming what is being asked for is separated from deciding what to do, so the analysis has to happen first. |

### ISTE Standard 2

- **2d — manage personal data to maintain digital privacy and security, and be aware of data-collection technology.** Cases 3, 4 and 5 in sequence: what an app collects, what protects an account, what a person extracts conversationally.
- **2b — positive, safe behavior online.** Case 5's resolution is Block & Report, ending *"nothing sent, nothing given."*

### Trait confirmation

The DDC HUD renders **Critical Thinking** from `catPoints.privacy_security` (`:726`). Matches the Builds column. ✅

---

## Digital Citizenship

| | |
|---|---|
| **Builds (live table)** | Integrity |
| **CASEL claimed (live table)** | Responsible Decision-Making · Social Awareness |
| **Challenge category** | `digital_citizenship` — 7 of 30 DDC scenarios |
| **Structure** | 7 Cases (1 overview, 2–6 interactive, 7 handoff) |

### Case-level evidence

| Case | What the student is asked to do | Competency exercised |
|---|---|---|
| **2 — The Source Check** | Judge seven sources for a claim about 1930s soil conservation and build a works-cited stack that holds up. The confidence bar explicitly does not reward volume; middling sources land in "consulted, not cited" rather than vanishing. | **Responsible Decision-Making.** Analysing information and making a reasoned judgment, with the common error (more sources = stronger) designed against. |
| **3 — The Credit Trail** | Click back through four reposts, watching the image degrade hop by hop and the signature erode, until the actual creator is reached. Then choose how to credit: use it freely, a vague "credit to the creator," or name the artist, link the original and ask. | **Social Awareness** — there is a specific person at the end of the chain whom nobody has named, and the degradation makes their erasure visible rather than asserted. Also the clearest **ISTE 2c** instance in the pack. |
| **4 — The One You've Never Heard Of** | An earnest friend shares an animal-rescue fundraiser. Three checks available before class — pick the ones that would actually settle it, then decide whether to share. | **Responsible Decision-Making.** A bounded investigation budget forces the student to rank checks by what they would actually prove. |
| **5 — The One You Know Is Fake** | Della is sharing a fundraising scam the student already knows is fake, and it is climbing — 41 shares. Build the response in order; each action shows what it costs. | **Social Awareness** and **Responsible Decision-Making** together. The overview frames it as *"saying nothing is a choice too, and somebody else pays for it"* — the cost is carried by Della and by the people who donate, not by the student. |
| **6 — The Toxic Lobby** | A player in a match will not let up. The reply box works. So do Report, Mute and Block, which most people never touch. | **Responsible Decision-Making** (choosing among available tools rather than the nearest one) with **Social Awareness** of what each does to the other player and to the lobby. Also **ISTE 2b**. |

### ISTE Standard 2

- **2c — understanding of and respect for the rights and obligations of using and sharing intellectual property.** Case 3, squarely and as the Case's entire subject.
- **2b — positive, safe, legal and ethical behavior online.** Case 5 (declining to amplify a known scam and acting on it) and Case 6 (using moderation tools instead of the reply box).

### Trait confirmation

The DDC HUD renders **Integrity** — but from `professional_brand` **+** `digital_citizenship` merged into a single bar (`:728`). The trait *name* matches the Builds column. ✅ The *number* is not per-GoodBlock. See **Finding 2**.

### Note on relative strength

Responsible Decision-Making is carried by four of the five interactive Cases. Social Awareness is carried by three (3, 5, 6) and is, in each, the secondary competency rather than the primary one. Both claims hold on the content; they do not hold equally, and a reviewer should know which is which.

---

## Professional Brand

| | |
|---|---|
| **Builds (live table)** | Integrity |
| **CASEL claimed (live table)** | Self-Awareness |
| **Challenge category** | `professional_brand` — 4 of 30 DDC scenarios |
| **Structure** | 7 Cases (1 overview, 2–6 interactive, 7 handoff) |

### Case-level evidence

| Case | What the student is asked to do | Competency exercised |
|---|---|---|
| **2 — What They Find (Monday)** | A form asked for Adan's handles and he said yes. Go through a year of his own posts one at a time — Leave it, Put it away, or Push to top — then look at the finished profile the way a stranger would. | **Self-Awareness.** Two named sub-skills at once: identifying personal assets (the side project is the thing worth pinning to the top) and linking one's record to how it represents one's values. |
| **3 — The Draft (Tuesday)** | Adan found a real bug and has written exactly how he feels about it, aimed at a public app-store review. He is not wrong; he is aimed at the wrong room. Rewrite it, six fixes, and read back the exact final text before it sends. | **Self-Awareness** — understanding how one's own emotion is driving behaviour, with the Case separating *being right* from *where the feeling pointed him*. Also **Relationship Skills** (communicating effectively). |
| **4 — The Group Project (Wednesday)** | Luis's section is a paragraph off Wikipedia, brackets still in it, and the meeting starts in a minute. Pick what Adan does, watch the whole week play out as a consequence, then take one do-over down a second path. | **Responsible Decision-Making** — evaluating consequences, made literal by running the week twice. *Not the claimed competency.* Also **ISTE 2c**. |
| **5 — The Class Thread (Thursday)** | Theo is posting jokes about the teacher during a live class and thinks six people can see it. Nothing about it is Adan's problem. Join the call and press *Message him* whenever — or never — while a 45-second thread runs and a screenshot is taken partway through. | **Responsible Decision-Making** (a timing decision with a live cost) and **Social Awareness** (what it costs Theo, who does not know what he is doing). *Neither is the claimed competency.* |
| **6 — Friday** | A recruiter reads the unmanaged version of the week in forty seconds and passes. Pick three things that cost him the interview; each says immediately whether she actually noticed it. | **Self-Awareness** — recognising one's own limitations, through the specific device of seeing one's own record from outside. Also **ISTE 2a**. |

### ISTE Standard 2

- **2a — cultivate and manage digital identity and reputation, and be aware of the permanence of actions in the digital world.** The organising idea of the whole GoodBlock: Case 2 is the cultivation, Case 6 is the permanence, and the intervening Cases are the actions that accumulate. The strongest 2a mapping in the pack.
- **2c — intellectual property.** Case 4, as plagiarism in a shared document.
- **2b — ethical behavior in online social interactions.** Case 5.

### Trait confirmation

The DDC HUD renders **Integrity** from `professional_brand` **+** `digital_citizenship` merged (`:728`). The trait *name* matches the Builds column. ✅ See **Finding 2**.

### ⚠️ Note — the claim holds, but it is narrower than the content

**Self-Awareness is genuinely exercised**, in Cases 2, 3 and 6, and in Case 2 it is exercised well. **No `CLAIM NOT SUPPORTED` block is raised for this GoodBlock**, because the trigger for one is a claimed competency the content does not exercise, and this content does exercise it.

What is worth a reviewer's attention is the weighting. Cases 4 and 5 are not Self-Awareness by any honest reading — Case 4 is consequence-evaluation about somebody else's plagiarism, Case 5 is a judgment call about intervening for somebody else's sake. Both are **Responsible Decision-Making**, with **Social Awareness** in Case 5. The live table names one competency for this GoodBlock where the content exercises three.

The consequence is small but real, and it is a founder/board decision rather than one to fix here: a department head who reads this map after reading the table will find two of five Cases mapping to competencies the table does not mention. The options are to leave the table as the headline competency only, or to widen the Professional Brand row to `Self-Awareness · Responsible Decision-Making`. Nothing needs to be removed either way.

---

## Findings

### Finding 1 — every row in the live table traces to Case-level evidence

All four Digital Decisions rows of the For Teachers table are backed by named Cases above. No `⚠️ CLAIM NOT SUPPORTED` block is raised in this document. That is a result, not an absence of scrutiny: the one row that came closest, Professional Brand, is written up in full above with the narrowness stated rather than smoothed.

### Finding 2 — "reports these traits back by name" is true; the Integrity number is blended

The For Teachers page says: *"Each Challenge scores and reports these traits back to the student by name, so what a GoodBlock is built to develop is the same thing it reports on."*

For three of the four DDC traits this is exact and 1:1. For **Integrity** it is not. The DDC HUD has three bars and the pack has four categories, so `professional_brand` and `digital_citizenship` are summed into one Integrity bar:

```js
const inPct = getPct(catPoints.professional_brand.s + catPoints.digital_citizenship.s,
                     catPoints.professional_brand.max + catPoints.digital_citizenship.max);
```
`public/educational-games/digital-decisions/index.html:728`

The sentence on the live page survives this, because both rows claim Integrity and Integrity is what gets reported by name. But a student strong on Digital Citizenship and weak on Professional Brand sees one blended figure, and the weighting is uneven — 7 scenarios against 4. The Real World Ready map records the same merge as *"a compromise forced by the count, not a design principle."* It is recorded here so that nobody reading the table later assumes a per-GoodBlock score exists when it does not.

**Not a marketing correction.** No copy needs to change. It is a limitation of the reporting, and the honest place for it is this document.

### Finding 3 — scenario counts verified

Counted from the live `SCENARIO_DATA`, not inferred: `social_intelligence` 11, `privacy_security` 8, `digital_citizenship` 7, `professional_brand` 4 — totalling the declared 30. Each GoodBlock's completion badge was checked against its own category count and each is correct.

---

## Sign-off

- [x] All four Digital Decisions GoodBlocks mapped from Case content upward
- [x] CASEL competency named exactly as the live For Teachers table claims it
- [x] ISTE Standard 2 sub-standards identified per GoodBlock with Case-level evidence
- [x] Trait names verified against Challenge source, not against the coverage map
- [ ] **Instructional Designer** — read against the live modules and sign
- [ ] **Curriculum & Learning Science** — read against the live modules and sign
- [ ] **Founder/board decision outstanding:** the Professional Brand row — leave as `Self-Awareness`, or widen it (see the note under Professional Brand)

**Until both signatures are present this document is not a standards alignment.** It is an evidenced draft of one.
