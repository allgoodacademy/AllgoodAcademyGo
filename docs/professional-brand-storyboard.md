# Professional Brand — Storyboard (AS BUILT)

*Reconciled to `index.html` after implementation. Where the build differs from the design below, the build is correct and the difference is listed here. Do not "fix" the build back toward the design.*

## As-built deviations

| Where | Storyboard said | Built as | Why |
|---|---|---|---|
| Page numbering | Overview and Handoff are not Cases | Chassis convention: `page-1` is the Overview, header reads "Case 1 / 7", the five interactive Cases are labelled **Case 2–6** on screen, Handoff is `page-7` | Every live GoodBlock counts the overview in the header. Changing that is a chassis change, not content. Storyboard Case N = on-screen Case N+1 = `page-(N+1)`. |
| Case 1 (page-2) | Keep / Archive / Feature | "Leave it" / "Put it away" / "Push to top" | Jodi's own phrasing, per the terminology lock. Internal state names are still `keep` / `archive` / `feature`. |
| Case 1 | Completion reflow | Feed reflows featured-first with archived rows collapsed to 44px, plus a "Profile sorted" pill | Silent unlock is not a confirmation. |
| Case 2 (page-3) | Beat 1 is narrative | One button, "Send it somewhere useful", moves the text into the dev-team message | A single button, not a choice. Tapping a flag before pressing it gets a redirect line, not a dead click. |
| Case 2 | Six flags | Six flags; the quiz-feature reposition uses the same flag-and-replace control and renders as a leading sentence | Deliberately not drag-to-reorder. |
| Case 3 (page-4) | Entry instructions never mention the do-over | Entry copy now says up front: "Two picks total, not one," so the gate condition (exactly two paths played) is stated before the student hits it, not discovered by trial and error. | Reported: unclear whether picking one path should unlock Continue. |
| Case 5 (page-6, on-screen Case 6) | Two-stage guess: commit three, then tap each recruiter item to read it, then a separate reveal button | **Collapsed to one stage.** Tap any item for an immediate reaction — "she noticed this" or "she skipped this" — right at the moment of the tap, no commit step. Deselecting is always allowed pre-reveal. The reveal button unlocks the instant three are picked, any three. | Reported: felt difficult, instructions unclear. Matches the immediate-feedback pattern already used in Cases 1 and 2 — no reason this Case needed a different shape. |
| Every Case | A delayed `teach()`/`updateWhiteboard()` call (e.g. "wait 2.5s, then explain the outcome") could fire after the student had already navigated to a later Case, silently overwriting that Case's whiteboard | **Global fix.** Every delayed UI reaction now goes through `scheduleUI()` instead of raw `setTimeout`; `advanceFromPage()` and every Case's own reset call `clearPendingUI()`, cancelling anything still pending. | Reported: arriving at Case 6, the whiteboard was stuck showing Case 5's last line ("The window, not the choice"). Traced to the exact call (Case 5's `messageTheo()`, 2500ms delay) and reproduced with a real headless browser: message Theo, immediately navigate, the old line no longer appears. |
| Case 3 (page-4) | Rewind announced after first path | "Go back — one time" button appears after the first scene resolves; picking a second card *before* pressing it is refused with a Jodi line; the rewind line plays on press | The refusal prevents a student from skipping the rewind beat by clicking a second card directly. |
| Case 3 | Unplayed paths greyed with summary | Greyed with "You don't get to see this one"; no summary | A summary would let them read the outcomes they didn't earn. |
| Case 4 (page-5) | 45s window, events at 18 / 28 / 38 | As designed; nine thread events on a one-second interval; skip control at t=10; clock colour shifts amber at 18s and red at 38s | — |
| Case 4 | Timer start | Started by `advanceFromPage` when page 5 unlocks and by `restoreModuleProgress` only if page 5 is the current page and not yet completed | Never runs behind a lock overlay. On a restored, already-completed visit the thread sits empty and "Message him" works as a replay. |
| Case 5 (page-6) | Recruiter's three revealed | Recruiter's three get an amber "She read this" tag and are tappable; the student's three non-recruiter picks get an italic caption with her one-line dismissal immediately | The storyboard had her read on all six items; the captions surface the three she *didn't* read without a tap. |
| Every Case | Per-item feedback in Jodi's bubble; whiteboard once per Case | **Every interaction result writes both surfaces** via `teach(caseNum, title, desc, mood)` — whiteboard (desktop board / mobile box) and bubble together, the same pairing the live modules use. Re-taps and changes away from a best answer included. | On desktop the bubble tucks behind the whiteboard after its first use; anything sent only to the bubble was invisible from the second click on. |
| Every Case | — | A step bar (`#step-N`) at the top of each Case states the current instruction and updates as the Case moves; it turns green on completion. | Instructions were only in Jodi's line, which tucks away. |
| Case 1 (page-2) | Per-item feedback | Each card stamps a verdict pill after a choice: **Strongest call** / **Either works** / **Not wrong — could be stronger** / **Worth a second look**. | So a student knows when they've hit the best answer and isn't nudged off it. |
| Case 1 (page-2) | Six posts on screen with a control each | **Focus card + mini-map.** One post at a time with Back / Next; a six-tile strip above shows every post's state (Top / Kept / Away / —) and is tappable to jump. Jodi's reaction lands directly under the active card. When the floor is met the view flips to the **reflowed profile** — pinned first, put-away last — with every post still editable; edits re-sort live, and breaking the floor is explained rather than reverted. The verdict pill is deliberately small; Jodi's line is the loud element. | Eighteen controls on one screen with feedback at the top of the page was a worksheet, and on mobile the reaction was out of view. The strip keeps "push to top" a relative call; the second pass is where curation-as-a-whole is practised. |
| Case 2 (page-3) | Beat 1 narrative, Beat 2 rewrite | Three numbered steps in the step bar (move it → rewrite six → send), a six-dot progress row, and the tapped phrase quoted in the panel header. Tapping a phrase writes the board with its problem before the options appear. | The two-beat flow was not legible from the page alone. |
| Case 2 (page-3) | Options opened in a shared panel below the entire six-card list, with `scrollIntoView` jumping the page down to it and back up to see any card update | **Accordion cards.** Each card expands in place, exactly where you tapped it — no shared panel, no forced scroll. Only one card open at a time. Verified with real mouse clicks in a headless browser, not just direct function calls, since this refactor's real risk was event bubbling (an option button inside a card whose own onclick reopens the panel); confirmed with `event.stopPropagation()` that clicking an option never reopens its own card. | Every tap sent the page on a round trip — down to the panel, back up to see the card, down again for the next one. That's what read as "sliding." |
| Case 2 (page-3) | In-place mutating paragraph — phrases replaced, cut, and repositioned inside the live draft | **Rebuilt as before/after cards.** The original one-star review is shown once and never edited again — no span, no mutation, nothing to go blank. Below it, six cards (Opening line, Second sentence, The rhetorical jab, The threat, The extra complaint, The buried compliment), each showing the original phrase struck through and, once fixed, the chosen rewrite. Tapping a card opens the same rewrite panel as before. The assembled final paragraph appears in exactly one place — the Review panel — built by the same `buildFinalText()` that was already verified correct twice. | Three rounds of "Case 3 looks broken" traced to three different causes in the same mechanic: a live-mutating paragraph. Removing the mutation removes the failure class rather than patching the next symptom of it. |
| Case 2 (page-3) | One reaction per flag, shared across both options | **Every one of the 11 real options now has its own Jodi line** — picking "has a bug worth reporting" vs "has an issue I wanted to flag" for the same flag gets a different reaction, not a copy-pasted one. 0 duplicates across 11 lines. | Reported: responses didn't feel aligned with what was actually picked. Auditing choice-by-choice showed 10 of 11 options shared a generic reaction; that's the "scripting is off" feeling. |
| Case 2 (page-3) | Flagged phrases tappable from the first frame, before "Send it somewhere useful" is pressed | Phrases render as **plain, inert text** until the draft is actually moved to a message. No more promising an interaction the box then refuses. | Tapping a highlighted phrase pre-move produced a dead-end "wrong room" response — confusing since nothing about the state said "not yet." |
| Case 2 (page-3) | Closing a flag panel without picking (tap the open phrase again) was silent | Now teaches: "Closed — no change made, tap it again anytime." | Direct regression against the "every click gets a reaction" rule from an earlier pass. |
| Case 2 (page-3) | Quiz flag showed one button with no explanation, next to five flags that showed two | Panel now opens with "There's really only one fix here:" above the single option. | A lone button with no framing reads as a missing second option, not an intentional design. |
| Case 2 (page-3) | Six-dot progress row + text counter | Dot row removed; the "X of 6 to rewrite" text carries the same information alone. | Redundant indicator, not signal. |
| Case 2 (page-3) | Send once all six flags resolved | **Cut markers + review-then-confirm.** Choosing "Remove it entirely" no longer erases a phrase silently — it leaves a small italic "✂ cut" marker in the draft, still tappable to reconsider. Once all six are resolved, the button reads **"Review before sending"**, not Send; it opens a panel with the exact final wording (no markers) and two explicit choices: **Keep editing** or **Looks right — send it**. Nothing sends without that second, deliberate tap. | Reported bug: removing a phrase left zero visual trace, so the mechanic looked broken even though the completion gating was correct. The fix isn't just cosmetic — a confirm step means nothing ever sends by surprise. |
| Case 3 (page-4) | Rewind button appears after first path | No separate rewind button. After the first week resolves the step bar says you get one do-over; **picking a different card is the do-over**. Same card or a third card is refused with a reason. | One fewer control; the refusal loop in the earlier build read as confusing. |
| Case 4 (page-5) | Clock starts on unlock | Clock starts only when the student presses **Join the call**. `advanceFromPage` and `restoreModuleProgress` no longer start it. A state line under the clock narrates the window (screenshot / other chat / staff). | The student now opts into the timer knowing what it is; nothing runs behind a lock or on a restored visit. |
| Case 5 (page-6) | Reveal on third read | After all three of her reads, a button — **Now see the week he actually had** — performs the reveal and completes the Case. Non-recruiter items dim after commit; her three carry an eye marker and a "Tap to read" caption. | Two explicit steps, one explicit finish. |
| Overview | Jodi's opening as designed | Cut to 210 characters. The five moments live on the page cards, not in her line. | The designed line was too long for the bubble. |
| Jodi avatar | — | Four SVGs inlined from the live Privacy & Security module so she renders in preview | Swap for `<img src="/assets/jodi/{mood}.svg">` once the shared files are confirmed in the repo. |
| Handoff callback | Closing line | Jodi's handoff line is prefixed with "That {first featured item} was the first thing you pushed to the top on Monday." when a Feature was recorded | Callbacks are load-bearing; same pattern as Privacy & Security's first-scam callback. |


*Grounded one-to-one in the 4 real `professional_brand` scenarios in the live DDC (verified against `SCENARIO_DATA` this pass), plus one synthesis Case. Adan, plum, 5 interactive Cases + Overview + Handoff = 7 pages.*

---

## The misconception

**"My professional reputation is just about what I post."**

| Real DDC scenario | Facet | Case |
|---|---|---|
| Job application / social media handles | Your footprint — what's already out there | Case 1 |
| Bug report review | How you deliver criticism — conduct under friction | Case 2 |
| Wikipedia group project | How you handle someone else's shortcoming — conduct toward others | Case 3 |
| Live class posting | Helping someone see a risk they can't see themselves | Case 4 |
| *(synthesis — no DDC scenario)* | What all of it reads as, to a stranger | Case 5 |

All four real scenarios require the same underlying move — **think about how this looks, not just whether you're right** — surfaced in four different directions.

## Cast

**Adan**, across one week. He applies for something on Monday and curates his profile because they asked. Tuesday he files a bug. Wednesday it's the group project. Thursday it's the online class. Friday, the people he applied to actually look.

## Identity — LOCKED

| Element | Value |
|---|---|
| Icon | `briefcase-business` |
| Accent | `#7C3D8E` |
| Accent dark | `#5E2C6E` |
| Accent light | `#F3E8F9` |
| Startup gradient | `from-[#1e0f2e] via-[#170b24] to-[#0a0514]` |
| Glow | `rgba(124,61,142,0.35)` |

**Icon verified** against the live Lucide library — `briefcase-business` is real, tagged work/portfolio. Distinct from `briefcase` (plain travel bag). `badge-check` and `user-check` were rejected as reading "verified identity," which is Privacy & Security's territory.

**Colour verified** against the registry: teal `#357889` (Social Intelligence), indigo `#6D5EC4` (Privacy & Security), blue `#2B5FA8` (Digital Citizenship). Plum `#7C3D8E` is unclaimed.

*The DDC's own category swatch for this domain is indigo. Do not mirror it — GoodBlock accents are independent of assessment category colours.*

## Terminology — locked before dialogue

- Structural term: **Case**. The Overview and the Handoff are **not** Cases and are never numbered as such.
- Case 2 uses **"flag"** for problem phrases and **"rewrite"** for the action — never "fix," which implies the original was broken rather than badly aimed.
- Case 3's four paths are **"pull him aside," "tell him straight," "just fix it yourself,"** and **"say it in the group chat"** — Jodi's phrasing, never rendered as button labels reading "correct/incorrect."
- Case 4 uses **"the thread"** and **"posting about the class."** Not "live-tweeting."
- Jodi never uses "brand" as a noun in narration. She says "how you come across" or "what people find."

**Wording diverges from the assessment on purpose.** The live scenario says "live-tweeting the lecture, making fun of the professor." Case 4 keeps the setting (online class, the person teaching it, someone posting jokes about them in real time) and says "posting" and "the teacher."

## Count consistency — CHECK AT BUILD TIME

**5 interactive Cases + Overview + Handoff = 7 pages. `TOTAL_PAGES = 7`.**

**Five moments, named identically in the Overview and the Handoff:** the profile, the bug report, the group project, the online class, and Friday.

Badge: **4 scenarios** in the 30-scenario Digital Decisions assessment. *(Verified this pass against live `SCENARIO_DATA`: `professional_brand` = 4, total scenario objects = 30. Do not estimate.)*

Grep every numeral in narration against these before shipping.

---

# Overview

**Entry state:** Startup screen resolves; Jodi centre, `neutral`.

> "Hey there. This week we're following Adan. Monday he applies for something, and the form asks for his social media — so he actually goes and looks at his own profile for the first time in about a year. Tuesday he files a bug report. Wednesday it's a group project. Thursday it's an online class. And Friday, the people he applied to sit down and read all of it.
>
> Five moments. Not one of them dramatic. And every one of them turns on the same thing — your reputation isn't just what you post. It's how you show up when things get awkward."

**Completion:** none. Immediately continuable.

---

# Case 1 — What They Find

*DDC scenario: job application requesting social media handles.*

**Judgment call:** When a stranger goes looking, what do they find — and is that a decision you made, or just whatever happened to still be there?

**Entry state:** Adan's feed, six posts, each with an untouched three-way control. Jodi `neutral`, whiteboard blank.

> "They asked for his handles. He said yes — that's the easy part. The hard part is that he hasn't looked at this in a year. Go through it with him. Three choices per post: leave it, put it away, or push it to the top."

**Interaction — three-way toggle per item, immediate per-item feedback on tap.**

| Post | Intended | On tapping the intended action | On tapping the wrong direction |
|---|---|---|---|
| A side project he built | **Feature** | "That's the one. He built a thing. Most people can't show you a thing they built." | *Archive:* "Wait — that's the best thing here. Why would he hide the one thing that proves he can do something?" |
| A community service photo | **Feature** | "Shows who he is when nobody's grading him. That's worth the top slot." | *Archive:* "Careful. Hiding all the good stuff isn't the same as being private — it just leaves a blank." |
| A team win he celebrated | **Keep** | "Doesn't need pinning. But it shows he notices when other people do well, and that reads." | *Archive:* "Nothing's wrong with it. If he archives everything that isn't perfect, there's nothing left to look at." |
| A late-night vent about a teacher | **Archive** | "Yeah. That one's honest, and it's still the kind of thing that reads very differently to someone who's deciding whether to call you back." | *Feature:* "That's the honest one, and I get why he wants it up. It's also the first thing a stranger would use to decide what he's like." |
| A joke that got rude replies | **Archive** | "The joke's fine. It's the replies underneath it — and he didn't write those. Away it goes, not because he did something wrong, but because nobody scrolling past will separate the two." | *Feature:* "The joke isn't the problem and neither is he. It's what's sitting under it that he can't control." |
| A meme reposted from a friend | **Keep or Archive — both fine** | Either: "Honestly? Either. Not everything has to be a decision. If he archived every ordinary thing he'd look like nobody." | — |

**Whiteboard** (`updateWhiteboard`, fires on first Feature): *"Curating isn't deleting"* / *"Deleting everything reads as hiding something. The move is choosing what's on top."*

**Gate — skill practice with a principled floor.** Completion requires: all six assigned, **at least one item Featured**, and the vent and the joke-with-replies both Archived. The meme is ungated in both directions and Jodi says so.

**Completion trigger:** All six assigned; the two mandatory archives placed; ≥1 Feature.

**Completion confirmation:** Feed reflows with featured items pinned to the top and archived items greyed to a collapsed row. Jodi → `happy`.

> "Look at that — four minutes. And here's the part worth keeping: he could have done that any time. Most people wait until somebody's already looking, and then they're deleting things fast and hoping. The better version is just knowing, on any ordinary Tuesday, what a stranger would find."

**Reset control:** "Start the feed over." Restores all six to untouched.

**Repeatability:** Every control must be re-tappable after assignment, including after completion fires.

---

# Case 2 — The Draft

*DDC scenario: reviewing a learning app and finding a bug.*

**Judgment call:** How you deliver a criticism is itself a reputation-bearing act, separate from whether the criticism is correct — and who you deliver it to decides whether it does anything at all.

**Entry state:** Adan's scathing review sits in a public review box, cursor blinking, "Post" button visible. Jodi `thinking`.

**Draft (verbatim on screen):**

> "This app is a mess. The home screen crashes every time I switch to dark mode, which is honestly embarrassing for a school app. Did nobody test this? I'm going to tell my whole class to avoid it. The design is ugly too. The only good thing is the quiz feature."

**Beat 1 — the channel (narrative, not a choice).** Jodi:

> "He's not wrong. The bug is real and it's annoying. Question though — who fixes it? Not the four hundred people reading the review. Let's send this somewhere it can actually do something."

The review box animates into a message window addressed to the dev team. **Same text, new envelope.** Jodi:

> "Same words. Different room. Now read them again."

**Beat 2 — the rewrite.** Six phrases become highlighted and tappable. Tapping opens a panel: why it's a problem, and 2–3 replacements. The message visibly transforms in place.

| Phrase | Problem | Replacement options |
|---|---|---|
| "This app is a mess" | Vague, dismissive — tells them nothing to act on | "has a bug worth reporting" / "has an issue I wanted to flag" |
| "honestly embarrassing" | Punches at the people, not the problem | "pretty disruptive" / "worth fixing before wider rollout" |
| "Did nobody test this?" | Rhetorical attack, not feedback | *remove entirely* / "it may not have been caught in testing" |
| "I'm going to tell my whole class to avoid it" | A threat. Threats get you handled, not helped | *remove entirely* / "I'd hold off recommending it until this is sorted" |
| "The design is ugly too" | New criticism, no specifics, dilutes the real one | "the settings page layout felt cluttered" / *remove* |
| "The only good thing is the quiz feature" | True, but buried at the bottom where it reads as a consolation prize | **Move to the top:** "The quiz feature is genuinely good — which is why I wanted to flag this." |

*(The last one is a reposition, not a rewrite. Implement it with the same flag-and-replace control; the replacement relocates the sentence to the opening. Do not build it as drag-to-reorder.)*

**Whiteboard** (fires on first replacement): *"Aim, then soften"* / *"Criticism that lands is specific, sent to someone who can act, and doesn't cost the reader anything to accept."*

**Gate — skill practice.** All six flagged phrases addressed before **"Send to the dev team"** unlocks.

**Completion trigger:** All six flagged phrases addressed.

**Completion confirmation:** The finished message renders clean, flags gone, and a reply arrives after ~2s: *"Thanks — reproduced it on our end, fix is going out Thursday."* Jodi → `happy`.

> "Same bug. Same frustration. Completely different person on the other end. The first version, nobody answers, or they answer defensively. This one, somebody fixes it and remembers who told them. The criticism didn't get softer. It got useful."

**Reset control:** "Put the draft back." Restores the original text and all six flags.

---

# Case 3 — The Group Project

*DDC scenario: teammate copying and pasting from Wikipedia.*

**Judgment call:** Not "do I say something," and not even "do I say it privately." Two of the four ways to handle this are private, and only one works. The question is what you actually say once you're in the room alone with them.

**Entry state:** The shared doc, teammate's section visibly pasted (different font, a stray citation bracket). Jodi `neutral`.

> "Adan's got the doc open and he can see it. Whole paragraph, straight off Wikipedia, brackets still in it. He's got maybe a minute before their meeting starts. What does he do?"

**Interaction — four paths, pick one, play it out, one rewind.**

Each path plays as a short live scene (three beats: the moment, end of week, next project), not a feedback card.

*1. Pull him aside.* Adan messages him alone: notices the paragraph, says he's worried it'll get flagged, offers to rewrite it together tonight. → Teammate embarrassed, then relieved. They rewrite it together. → End of week: section is his own. → Next project: he asks Adan to partner again.
> "That's the one. Not because it was private — the next one's private too. Because it gave him something to do."

*2. Tell him straight.* Adan messages him alone: says he can see it's copied, it's not okay, he needs to fix it. → Teammate goes defensive, says fine, rewrites it badly at 1am. → End of week: section is technically original and clearly rushed. → Next project: he picks a different group.
> "Private, honest, and completely correct. And he still ended up alone. Being right in a quiet room is still just being right — Adan told him what was wrong and nothing about what to do next."

*3. Just fix it yourself.* Adan quietly rewrites the section. → Teammate says thanks, no idea what happened. → End of week: project's fine, Adan did two people's work. → Next project: same teammate, same pasted paragraph.
> "He fixed the project and broke the pattern. Also he's now the guy who does this, and everyone's worked out that he will."

*4. Say it in the group chat.* Adan posts it where everyone can see. → Teammate goes silent, group goes awkward. → End of week: section gets rewritten under pressure, nobody's talking. → Next project: nobody picks anybody.
> "He wasn't wrong. And it made the rest of the week awful for five people instead of a problem for one."

**The rewind.** After the first path resolves fully, Jodi (`thinking`):

> "Okay. That happened. Now — you don't usually get this, so use it — you can go back and run the week one more time. One. Then it's the week you had."

Student picks a second path. It plays fully. Then all four lock, with the two they didn't run shown as greyed cards they can read the summary of but not play. Jodi:

> "The other two you don't get to see. That's about right, honestly."

**Gate — exploration with commitment.** No correctness gate. Completion fires on the second path resolving, whichever two they picked. A student who picks "pull him aside" first still gets and spends the rewind — Jodi frames it as worth seeing what the other version costs.

**Whiteboard** (fires when the second path resolves): *"Private is the room, not the message"* / *"Going private is what makes the conversation possible. What you say in there is what decides whether anything changes."*

**Completion trigger:** Two paths played to resolution.

**Completion confirmation:** The four cards settle into a row; the two played show their end-of-week state, the two unplayed stay greyed. Jodi → `happy` if path 1 was one of the two, `neutral` otherwise.

> "He didn't cover for him. He didn't shame him either. He gave him a way to fix it like a person rather than a caught student — and that's the version where they both still want to work together in three weeks. That's not being nice. That's being the person the group actually wants on it."

**Reset control:** "Run the week again." Restores all four paths and the rewind.

**The rewind is announced only after the first path resolves.** Do not add a rewind counter or any hint of it to the entry state.

---

# Case 4 — The Class Thread

*DDC scenario: classmate posting jokes about the teacher during an online class.*

**Judgment call:** Someone is doing damage to themselves that they can't see, in a window that's closing. Nothing happens to you either way.

**Whose reputation:** the classmate's own, not the teacher's. Every line of copy in this Case is about Theo doing damage to himself that he can't see. Adan has no stake, which is the only thing that makes it hard.

**Entry state:** Split screen — the class call on the left (teacher talking, muted thumbnails), the thread on the right. First post appears at t=0. A single control sits under the thread: **"Message him."** Jodi `concerned`.

> "That's Theo. He's four posts in and he thinks about six people are looking. Adan can see it. Nothing about this is Adan's problem — that's the part that makes it easy to leave alone. Watch it if you want. Say something whenever you want. Clock's running either way."

**Interaction — a live 45-second window. One control, pressable once, at any moment.**

The thread accrues on a real timer regardless of input:

| t | What happens in the thread |
|---|---|
| 0–8s | Two posts. Mild. Two likes from people in the class. |
| 8–18s | Third post, sharper, names the teacher. A reply from outside the class appears. |
| 18–28s | **A screenshot is taken.** Visible as a small flash + a "1 screenshot" indicator. It is now out of Theo's hands. |
| 28–38s | The screenshot appears in a different group chat. Two names Adan doesn't recognise. |
| 38–45s | A staff account follows the thread. Timer stops. Only escalation remains. |

**Result of pressing "Message him," by window:**

- **Before 18s** — Theo deletes the thread. Nobody outside the class saw it. He replies "oh god, thanks, I didn't think." Jodi (`happy`): *"That's the whole thing. Two sentences, no drama, and it never existed."*
- **18–28s** — Theo deletes the thread; the screenshot is still out there. He's grateful and slightly sick about it. Jodi (`neutral`): *"Still worth it. He stopped it getting worse. Just — the part that already left, left."*
- **28–38s** — Theo deletes; it's in two chats already. Jodi (`concerned`): *"He helped. Later is genuinely better than never here, and it still cost Theo something that a message at minute one wouldn't have."*
- **Never presses / 45s elapses** — The staff account is following. Jodi (`concerned`): *"Nothing happened to Adan. That's true the whole way through, and it's exactly why it was easy. Theo's going to find out on Monday from somebody who isn't a friend."* Then, without a gate: *"Want to run it again? You know where the window is now."*

**On escalation.** The "send it to the teacher" route is **not** a parallel option and is **not** framed as snitching. It appears only at 45s, as the one thing left:
> "He could tell the teacher now. That's not tattling and I'm not going to pretend it is — it's just the only tool left, and it's the one where Theo finds out from an adult instead of a friend. Educating beats escalating, but only if you're early enough to educate."

**Whiteboard** (fires on first press, or at 45s): *"The window, not the choice"* / *"Almost nobody gets this wrong on purpose. They get it wrong by waiting to see whether it's their business."*

**Gate — exploration. No correctness gate.** Completion fires either on pressing the control at any time **or** on the timer running out. Jodi reframes; she never blocks.

**Completion trigger:** Control pressed, or 45s elapsed.

**Completion confirmation:** Thread resolves to its final state and the timeline collapses into a small marked strip showing where the student acted relative to the screenshot. Jodi:

> "Nothing was going to happen to Adan either way. That's what made it easy to stay out of, and it's exactly the thing worth noticing. The person who says something when there's nothing in it for them is the person everybody remembers — and the earlier they say it, the less there is to say."

**Reset control:** "Run the class again." Full replay, timer from zero.

**Skip affordance:** a "skip to the end" control appears at t=10 so a student deliberately running the do-nothing path a second time doesn't sit through 45 seconds.

---

# Case 5 — Friday

*Synthesis Case — no DDC scenario behind it.*

**Judgment call:** You know what your week looked like from the inside. Guess what it looks like to someone who wasn't there — then find out.

**Entry state:** A recruiter's screen. Adan's application open. Beside it, the **uncurated** version of his week — the vent still up, the scathing review posted publicly, the section he rewrote for his teammate, the class thread he stayed out of. Verdict at the bottom: **"Pass."** Jodi `thinking`.

> "This is Friday. This is the version where he didn't do any of it. She got through this in about forty seconds and she's already on the next one. Before I show you what she actually thought — you tell me. What cost him this? Pick the three that did the most damage."

**Interaction — predict, commit, then get corrected.**

Six items are selectable. The student picks **exactly three**, then presses **"That's my guess."** No feedback until they commit.

| Item | What most students pick | What the recruiter actually thought |
|---|---|---|
| The vent about a teacher | **Most-picked** | Barely registered. "Everyone's got one of these. I don't read them." |
| The scathing public review | Sometimes picked | **The decisive one.** "This is the only writing of his I can see. It's how he'll talk to my team." |
| The joke with rude replies | **Most-picked** | Didn't see it. It was four screens down. |
| The rewritten teammate section | Rarely picked | **Decisive.** "His teammate's reference says Adan 'handled it.' I don't know what that means and neither does his teammate." |
| Staying out of the class thread | **Almost never picked** | **Decisive.** "Not a mark against him. It's that there's nothing here at all — no evidence he does anything when it isn't required." |
| No side project visible | Rarely picked | "I had nothing to look at. That's not a red flag, it's just a blank." |

**On commit:** the three the student picked highlight, then the recruiter's actual three slide in beside them. **Overlap is deliberately partial** — most students will get one right at most. Jodi, `neutral`, not scoring:

> "Okay. So you flagged the vent and the joke — the two things that felt most embarrassing from the inside. She didn't read either of them. What she read was the review, because it's the only sentence of his writing she had. And what she *couldn't* find was anything he did when nobody made him."

Then each of the recruiter's three is clickable for her one-line read. All three must be read.

**Whiteboard** (fires on commit): *"The inside view isn't the outside view"* / *"People flag what embarrassed them. Strangers notice what's missing."*

**Gate — exploration.** No correctness gate anywhere. **Any** three-item selection is accepted and the reveal is identical. Being wrong is the design. **Do not undo this into a scored pick** — it will look like an ungraded quiz to a fresh reader and it isn't one.

**Completion trigger:** Three items committed, and all three of the recruiter's reads opened.

**Completion confirmation:** The uncurated week fades and the **actual** week replaces it, item for item — the curated profile with the side project featured, the private bug report and the developer's thank-you, the teammate's section in the teammate's own words, and a class thread that isn't there because it came down in ninety seconds. Verdict changes to **"Interview."** Jodi → `happy`.

> "Here's the thing about a professional reputation: nobody's grading it in the moment. It just accumulates, and then one Friday somebody reads the pile. What Adan can say about this week is that he thought about how it looked before somebody else did. That's not being calculating. That's just being ready."

**Reset control:** "Guess again." Restores the uncurated view and clears the selection.

---

# Handoff

Standard chassis. Rating (submit-gated, not star-gated), badge on `briefcase-business` / `#7C3D8E`, Lab Pack hub primary, DDC secondary.

**Badge line:** Covers the principles behind **4 scenarios** in the 30-scenario Digital Decisions assessment. *(Verified against live `SCENARIO_DATA`: `professional_brand` = 4; 30 scenario objects total. Do not estimate.)*

**Closing callback — names the same five moments as the Overview, in the same order:**

> "One profile he finally looked at. One bug report he sent to the right room. One group project where he gave somebody a way out. One class where he said something in ninety seconds that would have taken a week to undo. And one Friday when a stranger read all of it.
>
> None of it dramatic. All of it visible. That's the thing about a reputation — it isn't built in the big moments. It's the shape of the ordinary ones, read by somebody who doesn't know you yet.
>
> Go on now. Go be somebody's good day."

---

## Cross-cutting requirements

- **Jodi's resting face is `neutral`.** `thinking` when explaining a mechanism, `happy` for real wins, `concerned` when the cost is landing on someone who isn't Adan (Case 4 throughout, Case 3 path 4).
- **Every mechanism explanation routes through `updateWhiteboard(title, desc, caseNum)`** — desktop whiteboard and that Case's own mobile box, all five Cases, no exceptions.
- **Her opening line must stay retrievable** — carry the recall toggle (tap portrait or button) built for Privacy & Security and Digital Citizenship.
- **Every interaction must be repeatable.** Test a second tap on each, including after completion has fired. Case 3's rewind and Case 4's timer are the two most likely to stick one-time-only.
- **Case 4's timer must actually start.** A Case shipped inert once because its timer was never kicked off and static checks could not see it. Assert in the browser that the thread advances without input.
- **Icons injected after page load must be inline SVG**, not `data-lucide`.
- **Wrong answers teach immediately**, and over-caution is a separate branch from under-caution wherever both exist — Case 1 (archiving the good stuff vs. featuring the vent) and Case 4 (acting at second 3 vs. never acting).
- **Every interactive Case carries one reset control**, consistent position, context-aware label. Labels are specified per Case above.
- **No student-facing copy references another GoodBlock**, by character, structure, or comparison.
- **Build on the live Digital Citizenship file** (`public/jsh/digital-decisions-lab/digital-citizenship/index.html`) — not a bundled snapshot. Read `docs/goodblock-integration-checklist.md` for the site-wiring half.
- **Never re-implement a shared module.** `auth-core.js`, `identity-gate.js`, `telemetry.js`, `message-hq.js`, and Jodi's SVGs are single files loaded by script tag.

## Do-not-undo list

Three things here look like bugs to a fresh reader and are deliberate:

1. **Case 5 accepts any three-item guess and reveals the same answer.** It is not an ungraded quiz that lost its scoring. Being wrong is the mechanism.
2. **Case 3's rewind is announced only after the first path resolves.** Surfacing it earlier turns a commitment into a menu.
3. **Case 1's meme item has no correct answer in either direction** and is intentionally outside the completion floor.

## Notes for the assessment team (not blockers)

- The `professional_brand` live-class scenario says *"live-tweeting"* and *"professor."* Case 4 diverges to "posting" and "the teacher." Recommend updating the scenario wording so the lab and the assessment match.
- The same scenario's middle-answer feedback uses the word *"tattling."* Case 4 does not, and frames escalation as a late-window tool rather than a social failure.

## Registry updates to make after build

**Accent registry:** claim plum `#7C3D8E` for Professional Brand.

**Interaction inventory** — add to `references/storyboard-checklist.md`:
14. **In-place phrase flag-and-rewrite** (edit a real draft; each flagged phrase opens its own reasoning and replacements; one flag is a reposition rather than a replacement)
15. **One-rewind commitment across four paths** (play a choice to full consequence, get exactly one undo, announced only after the first result; unplayed paths lock)
16. **Timing-cost intervention window** (a live timeline advances without input; one control, pressable once, at any moment; *when* changes the outcome, not *what*; inaction is fully playable and ends somewhere real)
17. **Predict-then-reveal with a designed mismatch** (commit a guess before any feedback; the reveal is authored to disagree with the intuitive pick)
