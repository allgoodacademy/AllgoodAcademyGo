# Allgood Academy Brand Locker (snapshot)

> Snapshot of the Brand Locker v1.4 (https://claude.ai/artifact/TxXyhJzrvKeD1N7kZRFQ7U), taken 2026-11-25. The locker page is the master copy of the rules; this file exists so Claude Code can read them. Don't edit rules here; change the locker, then refresh this snapshot.


The brand locker for Allgood Academy (allgoodacademy.com): colors, type, characters, art style and the rules for using them. Every design made for Allgood Academy (a GoodBlock, a simulation, a dashboard, a TPT cover, a Facebook post) starts here. The Art Director seat on the advisory board owns it.

**Source of truth:** the GitHub repo `allgoodacademy/AllgoodAcademyGo`. Tokens come from `public/assets/css/design-tokens.css` and `tailwind/theme.js`. Art comes from `public/assets/`. Jodi's personality and voice come from `docs/jodi-character-bible.md`. The repo's `scripts/check-tokens.js` already fails the build if the two token files disagree. This locker is the readable, visual version of all that: it doesn't replace any repo file. If this locker and the repo ever disagree, the repo wins, and this locker gets updated.

## Accessibility comes first

Allgood Academy meets **WCAG 2.1 AA** (what U.S. public schools are required to use) and aims for **WCAG 2.2 AA**. Accessibility beats style: if a brand color, font size or animation fails a check, the check wins. Read the **Accessibility** section before designing anything, and run its checklist before anything ships. The current brand has a few known contrast failures (the orange button labels among them), listed there with fixes.

## The brand in one breath

*Brilliant's craft, Khan Academy's heart.* Warm, smart, never preachy.

**The feel: Cadillac meets Carhartt.** Professional-class polish with durable, trustworthy quality. Everything should look premium enough for a district office and sturdy enough to survive a Tuesday with 28 seventh graders. When a design choice is close, pick the option that is both refined and built to last. Avoid anything flimsy, trendy, cutesy or flashy. The target feeling is **"someone finally taught me this"**: relief, not a grade. Jodi never grades. She reframes.

## Voice

- Talk like a trusted older mentor, not a textbook or a hype account. *"Hey there. Come sit down a minute."*
- Short sentences. Plain words. Explain a term the first time it shows up.
- Questions before answers: **"Guess first. Then find out why."**
- No baby talk, no slang that tries too hard, no exclamation-point pileups.
- Words that matter, used exactly: **GoodBlock** (the format, internal), **Lab** (what students call one), **Lab Pack** (the bundle), **Case** (a step inside one), **Challenge** (the capstone). Never "course." Always "Allgood Academy," never just "Allgood."

## Color

Two colors carry the brand, and they're on everything, Jodi included:

- **Burnt orange `brand-orange` #D34716** is the action color: buttons, progress, the Sun, the lightbulb. One orange action per screen.
- **Deep teal `brand-teal` #357889** is the structure color: headers, nav, links, accents. Jodi's cardigan is this exact teal.

Around them:
- **Day pages** (marketing, sims hub, light sims): `bg` #EAEEEF canvas, `card` white, `ink` #17272C.
- **Night pages** (games, the Seasons sim, dark mode): `night` #0F1923, `night-card` #1C2E3A, `night-warm-white` text.
- **Schoolhouse warmth** (anything with Jodi): `schoolhouse-cream` #FBF6EE with `schoolhouse-cream-border`.

**Lab Pack accents.** Each Lab Pack (or GoodBlock in Digital Decisions) gets one accent, and they can't repeat. Claimed: teal (Social Intelligence), indigo #6D5EC4 (Privacy & Security), blue #2B5FA8 (Digital Citizenship), plum #7C3D8E (Professional Brand), amber #C97D1A (Real World Ready), berry #9B3B5A (Room to Think). Proposed: bronze #B0773A (El Viaje). Green is never an accent: it's the "correct" state color. Check this list before picking a new one.

**Contrast rules.** White on orange is 4.48:1, just under the 4.5 line, so button labels stay bold and 15px+. Amber and bronze are fills only; use their `-dark` for text. `ink-faint` is decoration only.

## Type

Two system fonts, on purpose. **Georgia** for display (headings, big numbers, titles). **Verdana** for everything you read or tap. Nothing loads from a font CDN, so a district filter can never block the text.

**Where they actually show up:** Georgia and Verdana come with Windows, Mac, iPad and iPhone. **Chromebooks don't include them.** ChromeOS ships its own core fonts (Arimo, Tinos, Cousine), so on a Chromebook the page falls back down the chain: headings become Tinos (a Times New Roman look-alike) and body text becomes ChromeOS's default sans-serif. Text always loads and stays readable, but most students (on Chromebooks) see a plainer version than the design shows. The fix, if wanted: self-host open-license fonts from allgoodacademy.com itself (filter-safe because they come from our own domain), such as Gelasio (built to match Georgia's sizing). That's a founder decision; until then, design so the page still looks right in Tinos and a plain sans-serif.

Don't add Google Fonts links to student-facing pages: some district filters block them.

- Headings: Georgia bold, tight (-0.02em letter spacing). Hero 68px, h1 48px, h2 36px, h3 19px.
- Body: Verdana 15px / 1.6. Small 13px. Labels 12px bold.
- Exceptions already shipped and left alone: Mission Control (Space Grotesk + JetBrains Mono), Insider (system UI).

## Shape

- **Buttons and chips are always pills** (`radius-pill`). Cards are `radius-md` 12px; Jodi's frame and feature cards `radius-lg` 16px.
- Soft, low shadows (`shadow-card`). Characters get a warm drop shadow (`shadow-art`).
- No left-border "accent stripe" cards, no purple-blue gradients, no emoji as icons.

## Iconography

**Lucide** icons (self-hosted at `/assets/js/lucide.min.js`), 2px stroke, rounded caps, colored with `brand-teal` or the Lab Pack accent. Each Lab Pack's GoodBlocks are told apart by one Lucide icon plus the pack's accent.

## Logo

The **lightbulb mark** (`assets/Logos/allgood-lightbulb.png`): an orange bulb with a looping filament and a teal base.

**Wordmarks (decided 2026-11-25, concepts on the Wordmark Directions v1.0 canvas):**

- **A · Schoolhouse serif: the primary logo.** The bulb beside "Allgood / Academy" in the display serif, "Allgood" in orange and "Academy" in `brand-teal-deep`. At nav size it's one line in `ink` + `brand-teal-deep` (the orange stays on the bulb so small text passes 4.5:1). Reverse: white on `brand-teal-deep`. **Use it everywhere by default**, and always for anything a district, admin or parent sees.
- **B · The lit O: on trial.** The bulb drawn as the second "o" in "good," with ACADEMY spaced out underneath. It's being tried on a few places to see if it earns a bigger role.

**Where B is allowed during the trial (nowhere else):**
- Facebook, YouTube and TikTok: reel end cards, post graphics, the channel banner
- The Simulations hub hero and simulation end screens
- The student dashboard's power-up screen
- Stickers, classroom posters and other giveaways

**Never B:** Mission Control, the For Teachers page, TPT covers, facilitator guides, emails, privacy and legal pages, certificates, invoices, Allgood OS client work, or anything sent to a district.

**Trial rules:**
- Never put A and B on the same screen or page.
- B is never smaller than 32px tall (below that the bulb stops reading as an "o"). Use A's one-line version instead.
- B always carries `aria-label="Allgood Academy"` (or real alt text). Screen readers must never hear "Allgo d."
- The trial runs through **January 31, 2027**. Then the Art Director reviews it: social engagement on B posts vs. A posts, plus any teacher or student reactions. The outcome is one of three: promote B, keep it as a social-only mark, or retire it.

Final vector (SVG) files for A and B don't exist yet; see "Not in the locker yet."

## Art style

Flat shapes with one shade tone, rounded line caps, a warm drop shadow, no outlines around bodies, no gradients. Characters are friendly and grounded, never cartoon-goofy. **See it drawn:** the Art Style Sheet v1.0 canvas (https://claude.ai/artifact/HSDfhYRLdSiGuFTPbcxqBu) shows the rules, sample people, props and a day/night scene. Full rules: **Art Style**. Characters: **Jodi**. How each product line looks: **Style Families**. Accessibility rules for art (alt text, no text in images): **Accessibility**.

## Where this locker lives

- **Here (this page) is the master copy of the brand rules.** Edit the rules here, nowhere else.
- **The repo is the master copy of the code and art files.** `design-tokens.css`, `theme.js` and `public/assets/` are what the live site uses. A snapshot of this README is kept at `docs/brand-locker.md` so Claude Code can read the rules (it can't open this page). Refresh the snapshot whenever this locker changes in a way that affects code.
- **The advisory board skill** points the Art Director here before any visual work, so chat sessions follow these rules automatically.
- **Claude's design canvases** use this locker as their design system, so new designs start from these colors, fonts and art.
- **Notion holds only a link** (on Sprint HQ), never a copy, so there's no third version to drift out of date.

## How to use this locker (for people and for Claude)

1. Read this README, then the section for what you're making.
2. Use token names, not new hex codes. A color that isn't here needs the Art Director's OK.
3. **Reuse art before drawing it.** Jodi comes from `/assets/jodi/` by path. Never redraw her from a description.
4. New art (a new Jodi expression, a character, a sim world) is drawn as SVG, approved by the founder, added to the repo through the Claude Code prompt queue, then added to this locker.

## Not in the locker yet

- Final SVG files: the lightbulb mark, wordmark A (stacked, one-line, reverse) and wordmark B (light, night), with the text converted to shapes so they look right without the fonts.
- Jodi's poses (see **Jodi**). Her four new expressions, talking mouths and avatar are done.
- Scenario characters (the students and people inside Cases and sims). Jodi works solo, with no sidekick, per her character bible; these are the people in the stories she tells, not co-hosts.
- Self-hosted fonts so Chromebooks see the intended type (founder decision).
- Components (button, Jodi bubble, Case card, A–D vote chip) as live previews.
- The Spanish (El Viaje) style family, once approved.


---

# Accessibility

Accessibility comes first in this locker. Every design is checked against these rules before it goes to Claude Code, and a rule here beats a style choice anywhere else.

## The standard

- **Required: WCAG 2.1 Level AA.** That's the standard the U.S. Department of Justice's ADA Title II rule sets for public schools' web content and apps, and it covers the tools districts use with students, so a district can't adopt Allgood Academy unless we meet it. After a one-year extension in April 2026, the deadlines are **April 26, 2027** for districts serving 50,000+ people and **April 26, 2028** for smaller ones.
- **Our target: WCAG 2.2 Level AA.** It's the newer version and includes everything in 2.1 plus a few extra checks (focus not hidden, bigger tap targets, no dragging-only controls). Meeting 2.2 covers 2.1 automatically.
- This is a lens, not a legal opinion. A district's accessibility office (or a VPAT, the standard accessibility report districts ask vendors for) is the real check.

## Color and contrast

**Minimums:** 4.5:1 for normal text, 3:1 for large text (24px+, or 18.66px+ bold), 3:1 for icons, input borders, focus rings and chart lines. Check every pair in **both** day and night themes.

**Passes (use freely):**
| Pair | Ratio |
|---|---|
| `ink` on `bg` (day) | 13.2:1 |
| `night-warm-white` on `night` | 16.2:1 |
| `night-warm-white` on `night-card` | 12.8:1 |
| `brand-teal` text on white | 5.0:1 |
| White text on `brand-teal` | 5.0:1 |
| `brand-teal-deep` on `bg` or white | 5.7–6.6:1 |
| `brand-orange-deep` on white | 6.0:1 |
| `ink-soft` on `bg`, white or cream | 4.6–5.3:1 |
| `brand-grey` on cream or light | 8.0:1 |

**Known failures in the current brand (need a fix):**
| Pair | Ratio | Where it shows up | Fix |
|---|---|---|---|
| White on `brand-orange` #D34716 | **4.48:1** | Every orange button (labels are 14px bold) | Founder decision: nudge the orange to **#CF4616** (4.62:1, a change no one will see) or keep it and make button labels 19px bold |
| `brand-orange` text on `bg`, cream or light grey | 3.8–4.2:1 | Orange links/labels on non-white pages | Use `brand-orange-deep` for orange text |
| `brand-teal` text on `bg` #EAEEEF | 4.28:1 | Teal links on marketing pages and the sims hub | Use `brand-teal-deep` for teal text on `bg` |
| `night-muted` on `night-card` | 4.21:1 | Small grey text on dark cards | Use it on `night` only (5.3:1), or `night-warm-white` at reduced emphasis |
| Tailwind `text-gray-400` (#9CA3AF) on white | 2.54:1 | 278 places, including the "© Allgood Academy" footer | Swap for `ink-soft` |
| `ink-faint`, `brand-orange-hover`, amber, bronze as text | 2.5–3.8:1 | Labels | Decoration and fills only |

**Color is never the only signal.** Correct, risky and locked-in states also get an icon or a word. Colors that must be told apart differ in lightness, not just hue (blue/orange beats red/green).

## Type

- Body text at least 15px (13px for secondary text, 11px only for captions and legal lines).
- Line height at least 1.5 for body text; lines no wider than about 75 characters.
- Text must survive 200% zoom and the WCAG text-spacing test without being cut off.
- Never put words inside images or SVG art. Text lives in HTML so screen readers, zoom and translation work.

## Focus and keyboard

- Everything clickable works with Tab, Enter and Space, in a logical order.
- **Visible focus ring on every control:** 2px `brand-teal-deep` outline with a 2px offset (`:focus-visible`). Never `outline: none` without a replacement.
- A focused control is never hidden behind a sticky header, Jodi's bubble or a modal.
- Drag interactions (dragging Earth around the orrery, drag-to-sort) always have a non-drag way to do the same thing: arrow keys or buttons.

## Tap targets

- At least 24 × 24px (the WCAG 2.2 minimum); aim for **44 × 44px** on student-facing controls, which are used on touchscreens and projected boards.
- A–D vote chips and Next/Back are always 44px tall.

## Motion and time

- Respect `prefers-reduced-motion`: swap slides and pulses for fades or no motion. About 18 of the 25 pages with animations handle this today; the rest need it.
- Nothing flashes more than three times a second.
- **Timers must be adjustable.** "Lock in your guess · 3 · 2 · 1" countdowns need a way to pause, extend or turn off (the teacher control in Present mode counts). Never auto-advance a student past content on a timer.
- Anything that moves on its own for more than 5 seconds (reels, animated backgrounds) gets a pause control.

## Jodi and other art

- Each Jodi SVG has `role="img"` and an `aria-label` ("Jodi, happy"). When Jodi is next to her speech bubble, mark her as decorative (`alt=""` / `aria-hidden="true"`) so screen readers read her words, not "image of Jodi" every time.
- Informative art (a sim diagram, a chart) gets a real text alternative that says what it shows, not what it looks like.
- Simulations expose their state in text too ("Earth: January 3 · 91.4 million miles · Chicago noon Sun 25° up").

## Audio and video

- Captions on every reel and video, and transcripts for audio (El Viaje's Spanish audio needs text versions).
- Audio never plays on its own before the student chooses to start.

## Checklist before anything ships

1. Contrast checked in day and night themes.
2. Tab through the whole thing with the keyboard only.
3. Zoom to 200%.
4. Turn on reduced motion.
5. Run a screen reader (ChromeVox on a Chromebook, VoiceOver on a Mac) through one full path.
6. Run an automated scan (axe or Lighthouse) and fix everything it flags.


---

# Jodi

Jodi is the host of Jodi's Schoolhouse and the voice of Allgood Academy. She shows up in GoodBlocks, simulations (as "Jodi's take"), reels and social posts.

## Who she is

**Her character bible in the repo (`docs/jodi-character-bible.md`) is the authority on her personality and voice.** Read it before writing a single line for her. The short version:

- The favorite teacher you still think about years later: warm on contact, sharp-witted, funny *and* takes you seriously. Not a mascot, not relentlessly cheerful.
- **She never grades. She reframes.** *"I don't think that one's wrong, exactly, but I want to show you why there might be a stronger play here."*
- **She dishes it back.** A cheeky student gets teased right back, warmly. Teasing is for confidence and cheek, never aimed at someone who's actually struggling.
- **Southern warmth** in word choice and storytelling rhythm, never spelled-out dialect.
- Stories over lectures, and callbacks to what a student said earlier.
- **She works solo.** No sidekick.
- She never talks down, lectures without warmth, or uses baby talk.

## Where she lives

The finished art is in the repo at `public/assets/jodi/` (served as `/assets/jodi/…`), and a copy is in this locker under **Jodi** assets:

| File | Use it when |
|---|---|
| `jodi-neutral.svg` | Introducing a Case, listening, default |
| `jodi-happy.svg` | A good insight, a win, a warm welcome |
| `jodi-concerned.svg` | A risky choice, a "hmm, let's look at that" moment (never scolding) |
| `jodi-thinking.svg` | Posing a question, "guess first" moments |
| `jodi-surprised.svg` | A reveal that flips what students expected |
| `jodi-proud.svg` | Real wins only: finishing a Lab, a Challenge, a big insight. Used rarely so it keeps meaning something |
| `jodi-encouraging.svg` | After a miss: "there's a stronger play here, come look" |
| `jodi-listening.svg` | While students vote, type or think |
| `jodi-talk-ah.svg`, `jodi-talk-ee.svg`, `jodi-talk-oo.svg` | Mouth shapes swapped with neutral in a loop (about 160ms each) while her bubble types out; rest on closed when the text is done. No loop when reduce-motion is on |
| `jodi-avatar.svg` | Round head-and-shoulders crop for nav bars, dashboards, bubble icons and social profiles (works down to 32px) |

The four originals are in the repo now. The eight new files (approved 2026-11-25, drawn from `jodi-neutral.svg` and `jodi-happy.svg` with only the face changed) are queued for the repo; until they land there, use the copies in this locker.

**Always pull her by path. Never describe her and redraw her.**

## How she's drawn (for new expressions and poses)

- 400 × 400 viewBox. Head-and-shoulders behind her desk, centered at x = 200.
- Shapes: hair is an ellipse with a round bun on top and a band; face is an ellipse (rx 62, ry 70) with small ears; almond eyes with a white highlight dot; stroke-only nose and mouth with round caps; blush circles at low opacity.
- Outfit: teal cardigan (`jodi-cardigan`, the brand teal) over a cream collar, a gold chain with a little globe pendant and two leaves. That pendant is her signature detail.
- The desk fills the bottom: wood front, lighter top edge, a recessed panel and a brass name plate.
- One drop shadow on the whole figure: `jodi-shadow` #4A3520 at 15%, offset down 7px.
- Flat fills plus one shade tone. No gradients, no outlines around the body.
- Colors: only the `jodi-*` tokens.

**What changes between expressions:** eyebrows, eyes, mouth, blush strength, and a small head tilt (thinking tilts −4°). **What never changes:** hair, outfit, pendant, desk, palette, proportions.

## Wanted next (approve before drawing)

- **Poses:** pointing, at the whiteboard, holding a tablet. Her current art has no arms, so this needs arms and hands designed first, in her style.

**Signature-detail ideas from her bible** (not drawn yet, founder decision): reading glasses pushed up into her hair, and a mug she's rarely without. Her bible asks for one or two small, consistent details over a detailed likeness, and timeless over trendy.

## Accessibility

- Next to her speech bubble, Jodi is decorative (`alt=""` / `aria-hidden="true"`) so screen readers read her words, not "image of Jodi" each time. Alone, she keeps her `aria-label`.
- Her bubble text meets contrast (`brand-grey` or `ink` on `schoolhouse-cream`, 8:1+), is real HTML text, and is never on a timer.

## Never

- Change her hair, outfit colors or pendant without a founder decision.
- Put her over the thing a student needs to read or tap.
- Make her the one who says "wrong."


---

# Art Style

How every Allgood Academy illustration is drawn: characters, scenes, sim worlds, icons-as-art, social graphics.

## The look

- **Flat shapes, one shade tone.** Each color gets one darker version for shadow. No gradients (the one exception is a sky in a sim, top to bottom, two tokens).
- **Rounded everything.** Round line caps and joins, softened corners, curves over hard angles.
- **No outlines around bodies.** Shapes meet shapes. Strokes are only for features (eyebrows, mouths, hair strands) and thin details.
- **Warm drop shadow.** Characters and props sit on the page with `shadow-art` (#4A3520 at 15%), never a gray or black shadow.
- **Grounded color.** Start from the brand tokens: teal, orange, cream, wood. A sim adds its own world colors on top (see Style Families).
- **Real, not cute.** People have normal proportions (no giant heads, no bobbleheads). Animals look like the animal. Places look like real places, simplified.

## See it drawn

The **Art Style Sheet v1.0** canvas (https://claude.ai/artifact/HSDfhYRLdSiGuFTPbcxqBu) is the visual reference: the four rules with yes/no examples, three sample students, eight props and one classroom scene in day and night. Match it.

Other styles (watercolor, block print, stitched patch, two-ink print, cut paper, sketchbook) were tried on 2026-11-25 and rejected. The flat style is the house style.

## People

- Built exactly like Jodi: same face ellipse, almond eyes with a white highlight dot, stroke-only nose and mouth, soft blush, warm drop shadow. Real proportions; no big heads.
- Skin tones: `skin-1` to `skin-4`, each with its `-shade` (neck shadow, nose stroke). Jodi uses `jodi-skin` (the same value as `skin-1`).
- Hair: `hair-black`, `hair-brown`, `hair-blond`. Hairstyles, clothes and accessories vary widely; casts should look like a real middle school.
- Glasses and other small accessories are thin strokes, which count as features, not outlines.
- Faces may vary a little in width and jaw so a cast doesn't read as clones; eyes, nose and mouth stay in Jodi's style.

## How it's made

- Drawn as **SVG code**, so it can be edited, versioned and reused. Characters use a 400 × 400 viewBox.
- Every fill uses a token from this locker. If a new color is needed, the Art Director adds it here first.
- Finished art goes in the repo under `public/assets/<thing>/`, then into this locker.

## Before drawing anything

1. **Check the repo and this locker.** If it exists, use it by path.
2. **Name the moment it serves.** Art earns its place by helping the learner: setting a mood, showing where to look, or giving a face to the reframe. Art that's only decoration gets cut.
3. **Check it against 6th–8th graders.** If it reads as babyish or as "adults trying too hard," redo it.

## Photos

Real photos are rare and purposeful: the orbit background (`assets/Backgrounds/orbit.jpg`) behind the student dashboard, and the founder's own photos on the About page. No stock photos of smiling students. Never use photos of real public figures.

## Avoid

- AI-art tells: purple-blue gradients, glossy 3D blobs, sparkles everywhere, emoji as illustration.
- Clip-art and mixed styles on one screen.
- Characters from other brands or anything that resembles them.
- Text baked into images (put words in HTML so they're readable and translatable).


---

# Style Families

Each product line shares the brand core (orange action, teal structure, Georgia + Verdana, pill buttons) but has its own world. The shared chassis is plumbing only: present mode, A–D votes, telemetry, accessibility, filter-safe loading. **The look, layout and metaphor are new for every simulation.**

## Jodi's Schoolhouse (GoodBlocks / Labs)

- **Feels like:** a cozy classroom after the bell.
- **Surfaces:** `schoolhouse-cream` sidebar and bubbles, `jodi-frame` behind her portrait, `brand-light` page.
- **Props:** Jodi's desk, a whiteboard that opens when she writes something down, wood trim (`schoolhouse-wood`).
- **Accent:** the Lab Pack's accent token (see README).
- **Jodi:** front and center, with a speech bubble.

## Student dashboard and power-up screen

- **Feels like:** a tablet floating in orbit.
- **Look:** the full-screen orbit photo (`assets/Backgrounds/orbit.jpg`, self-hosted), a brushed-metal tablet frame, orange glow on the power button.
- **Type:** Georgia titles on dark glass.

## Mission Control (teacher dashboard)

- **Feels like:** a calm control room for a busy teacher.
- **Look:** cream canvas, white cards, `shadow-card`; status colors `mc-sage`, `mc-gold`, `mc-plum`.
- **Type:** Space Grotesk + JetBrains Mono (the one deliberate font exception).

## Simulations

Every sim is its own world. Before one is built, the Art Director writes its theme in one line (setting · palette · signature prop) and checks it against this list so no two match.

| Sim | World | Palette | Signature prop |
|---|---|---|---|
| **Water Cycle** | A mountain valley in cross-section, day | Teal-wash sky to cream, cream-border terrain, teal vapor, orange sun | The rain shadow over the mountain |
| **The Snowball** | Savings as a snowball rolling down a hill, day | Canvas and white, teal growth, orange action | The snowball that grows as it rolls (compound growth) |
| **Reasons for the Seasons** | A night desk with a copper orrery over a window on a city at noon | `night`, `sim-seasons-copper`, orange Sun, teal Earth | The copper orrery you drag Earth around |
| **Wolves & Deer** | A topo map of a wild park | `sim-wolves-*`: topo blue-gray, lakes, pines, saplings, deer brown, wolf slate | The topo map with tracks |
| *Next sim* | *Name it here first* | | |

## Marketing and social

- **Site pages:** day canvas, white cards, Georgia headlines that wrap balanced, one orange call to action.
- **Reels and posts:** editorial cream and ink, big Georgia questions, A–D chips, Jodi for the reframe line, URL pill at the end. Never screen-recording montages.
- **Allgood OS** (client work like buy sheets): the client's brand leads; an "Allgood OS" credit sits small in the footer.


---

# Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | #EAEEEF | #0F1923 | Page background. Light: marketing canvas (homepage, sims hub, sims). Dark: the game/sim night shell. Repo: --color-canvas / --color-dark. |
| `card` | #FFFFFF | #1C2E3A | Cards and panels on bg. Repo: --color-surface / --color-dark-card. |
| `ink` | #17272C | #F8F4EE | Main text on bg and card (13:1 light, 16:1 dark). Repo: --color-ink / --color-warm-white. |
| `ink-soft` | #5C6E75 | #7A909F | Secondary text, captions (4.6:1 on bg light, 5.3:1 on bg dark). Repo: --color-ink-soft / --color-muted. |
| `ink-faint` | #8A9AA0 | #7A909F | Decorative only: dividers' labels, placeholder glyphs. Fails 4.5:1 as text (2.9:1 on white) — never body copy. Repo: --color-ink-faint. |
| `hairline` | #D8DFE1 | #425562 | Borders and rules. Light: --color-hairline. Dark: the sims' color-mix(muted 40%, dark-card), worked out to hex. |
| `cta` | #D34716 | #D34716 | The one action color: Next, Start, Lock in. White labels on it are 4.48:1, just under AA's 4.5:1 for normal text — pending a founder decision (nudge to #CF4616, or 19px+ bold labels). Repo: --color-orange / allgood-primary. |
| `focus-ring` | {brand-teal-deep} |  | Keyboard focus outline on every control: 2px solid, 2px offset, via :focus-visible. 6.6:1 on white, 5.7:1 on bg. Never remove focus outlines without this replacement. |
| `brand-orange` | #D34716 |  | Burnt orange. Brand primary and action color; the lightbulb's glass; the Sun in every sim. White label text on it is 4.48:1, which FAILS AA for normal text — see Accessibility for the fix. Orange text on bg/cream/light fails (3.8–4.2:1): use brand-orange-deep for orange text. Repo: --color-orange. |
| `brand-orange-deep` | #B23A0F |  | Pressed/hover depth under orange buttons; safe for small orange text on white (6:1). Repo: --color-orange-deep. |
| `brand-orange-hover` | #EB8D69 |  | Light orange hover fill on older GoodBlocks. Never text (2.5:1). Repo: allgood-hover. |
| `brand-orange-wash` | #FBE9E2 |  | Orange tint behind callouts and chips (Mission Control). Repo: mission-control --orange-wash. |
| `brand-teal` | #357889 |  | Deep cyan. Brand structure color: headers, nav, accents. Text: OK on white (5:1), light and cream (4.65:1); FAILS on bg #EAEEEF (4.28:1), use brand-teal-deep there. Fills only on night-card (2.8:1). Jodi's cardigan is this exact teal. Repo: --color-teal / allgood-secondary. |
| `brand-teal-deep` | #2D6473 |  | Darker teal: hover, focus rings, teal text on tints (6.6:1 on white). Repo: --color-teal-deep / allgood-accent. |
| `brand-teal-wash` | #E3EDEF |  | Teal tint for selected states and sky tops. Repo: --color-teal-wash. |
| `brand-grey` | #4C4C4C |  | Legacy dark grey text in GoodBlocks (8:1 on cream). Repo: --color-grey / allgood-dark. |
| `brand-light` | #F7F7F7 |  | Legacy light grey GoodBlock page. Repo: --color-light / allgood-light. |
| `schoolhouse-cream` | #FBF6EE |  | Jodi's Schoolhouse surface: Jodi's sidebar, speech bubbles, warm cards. Repo: --color-cream / jodi-warmth. |
| `schoolhouse-cream-border` | #E8DFCE |  | Border on cream surfaces; ground in sims. Repo: --color-cream-border / jodi-border. |
| `schoolhouse-scroll` | #D8CDBA |  | Jodi bubble scrollbar thumb in all GoodBlocks. Repo: --color-cream-scroll. |
| `schoolhouse-wood` | #8B5A2B |  | Classroom wood trim. Repo: school-wood. |
| `schoolhouse-desk` | #E3C195 |  | Classroom desk tone. Repo: school-desk. |
| `jodi-frame` | #F5E6D3 |  | The warm frame behind Jodi's portrait (jodi-avatar). Repo: professional-brand GoodBlock. |
| `night` | #0F1923 |  | Game and sim night shell background. Repo: --color-dark. |
| `night-card` | #1C2E3A |  | Cards on the night shell. Repo: --color-dark-card. |
| `night-muted` | #7A909F |  | Muted text on night (5.3:1). FAILS on night-card (4.21:1) — use night-warm-white there. Repo: --color-muted. |
| `night-warm-white` | #F8F4EE |  | Text on night. Repo: --color-warm-white. |
| `legacy-grid-black` | #1A1A1A |  | Old tablet-era page with faint 20px grid (archived GoodBlocks, El Viaje's night theme). |
| `marketing-ink` | #17272C |  | Ink on the marketing surface. Same value as ink (light). Repo: --color-ink. |
| `accent-social-intelligence` | #357889 |  | Digital Decisions → Social Intelligence GoodBlock accent (shares brand teal). |
| `accent-privacy-security` | #6D5EC4 |  | Digital Decisions → Privacy & Security accent, indigo (5.2:1 on white). |
| `accent-digital-citizenship` | #2B5FA8 |  | Digital Decisions → Digital Citizenship accent, deep blue (6.4:1). |
| `accent-digital-citizenship-dark` | #1E4680 |  | Pressed/hover for Digital Citizenship. |
| `accent-digital-citizenship-light` | #E8EFF9 |  | Tint for Digital Citizenship. |
| `accent-professional-brand` | #7C3D8E |  | Digital Decisions → Professional Brand accent, plum (7.2:1). Claimed — not available to new packs. |
| `accent-professional-brand-dark` | #5E2C6E |  | Pressed/hover for Professional Brand. |
| `accent-professional-brand-light` | #F3E8F9 |  | Tint for Professional Brand. |
| `accent-real-world-ready` | #C97D1A |  | Real World Ready Lab Pack amber, shared by all its GoodBlocks. Fill only: 3.3:1 as text — use the -dark for text. |
| `accent-real-world-ready-dark` | #A8620E |  | Real World Ready text/pressed (4.75:1). |
| `accent-real-world-ready-light` | #FEF3DC |  | Real World Ready tint. |
| `accent-room-to-think` | #9B3B5A |  | Room to Think Lab Pack berry, shared by all its GoodBlocks (6.6:1). |
| `accent-room-to-think-dark` | #7A2B45 |  | Room to Think pressed. |
| `accent-room-to-think-light` | #FBEAF0 |  | Room to Think tint. |
| `accent-el-viaje-proposed` | #B0773A |  | PROPOSED (not shipped): bronze for the El Viaje Spanish GoodBlock. Fill only (3.8:1 as text). |
| `mc-sage` | #2E7D52 |  | Mission Control: good/on-track status. |
| `mc-sage-wash` | #E7F0E9 |  | Mission Control: sage tint. |
| `mc-plum` | #5B4B8A |  | Mission Control: secondary data series. |
| `mc-plum-wash` | #ECE8F5 |  | Mission Control: plum tint. |
| `mc-gold` | #8F5E0E |  | Mission Control: attention/Pro status text. |
| `mc-gold-wash` | #F7ECD6 |  | Mission Control: gold tint. |
| `jodi-hair` | #C2A574 |  | Jodi — Hair: main fill, bun and front. From /assets/jodi/*.svg. |
| `jodi-hair-back` | #B69660 |  | Jodi — Hair: back mass behind the head. From /assets/jodi/*.svg. |
| `jodi-hair-line` | #A9884F |  | Jodi — Hair strands, eyebrows, bun band. From /assets/jodi/*.svg. |
| `jodi-hair-shine` | #D3B98C |  | Jodi — Hair highlight stroke. From /assets/jodi/*.svg. |
| `jodi-skin` | #F2C9A0 |  | Jodi — Face. From /assets/jodi/*.svg. |
| `jodi-skin-ear` | #EBBE93 |  | Jodi — Ears. From /assets/jodi/*.svg. |
| `jodi-skin-neck` | #E3B48A |  | Jodi — Neck. From /assets/jodi/*.svg. |
| `jodi-skin-shadow` | #CE9A6C |  | Jodi — Neck shadow under the chin (55% opacity). From /assets/jodi/*.svg. |
| `jodi-cheek` | #E08A6E |  | Jodi — Cheek blush circles (18–30% opacity; more when happy). From /assets/jodi/*.svg. |
| `jodi-eye` | #3E9AD9 |  | Jodi — Iris. From /assets/jodi/*.svg. |
| `jodi-pupil` | #23303A |  | Jodi — Pupil. From /assets/jodi/*.svg. |
| `jodi-lash` | #3A2A22 |  | Jodi — Upper lash line; closed happy eyes. From /assets/jodi/*.svg. |
| `jodi-nose` | #DDA57C |  | Jodi — Nose stroke. From /assets/jodi/*.svg. |
| `jodi-mouth` | #A65A4A |  | Jodi — Mouth stroke. From /assets/jodi/*.svg. |
| `jodi-cardigan` | #357889 |  | Jodi — Cardigan — exactly brand-teal. From /assets/jodi/*.svg. |
| `jodi-cardigan-shade` | #2C6373 |  | Jodi — Cardigan shade and V-neck edge. From /assets/jodi/*.svg. |
| `jodi-collar` | #EFE2CE |  | Jodi — Blouse collar. From /assets/jodi/*.svg. |
| `jodi-gold` | #C79B4E |  | Jodi — Necklace chain and pendant rim. From /assets/jodi/*.svg. |
| `jodi-pendant` | #3E86AE |  | Jodi — Pendant stone (a little globe). From /assets/jodi/*.svg. |
| `jodi-leaf` | #6FA96B |  | Jodi — Leaves on the pendant. From /assets/jodi/*.svg. |
| `jodi-desk` | #8B6A46 |  | Jodi — Desk front. From /assets/jodi/*.svg. |
| `jodi-desk-top` | #A5825A |  | Jodi — Desk top edge. From /assets/jodi/*.svg. |
| `jodi-desk-panel` | #7A5C3C |  | Jodi — Desk panel (50% opacity). From /assets/jodi/*.svg. |
| `jodi-brass` | #D4AF6A |  | Jodi — Desk name plate (65% opacity). From /assets/jodi/*.svg. |
| `jodi-shadow` | #4A3520 |  | Jodi — Drop shadow color, always at 15% opacity. From /assets/jodi/*.svg. |
| `sim-seasons-copper` | #E59677 |  | Reasons for the Seasons: the copper orrery (orange 55% + cream). Night page. From the sim's own :root. |
| `sim-wolves-topo` | #C9D7DD |  | Wolves & Deer: topo map ground (light). From the sim's own :root. |
| `sim-wolves-lake` | #BCD5DF |  | Wolves & Deer: lakes. From the sim's own :root. |
| `sim-wolves-pine` | #2E5A4C |  | Wolves & Deer: pines. From the sim's own :root. |
| `sim-wolves-sapling` | #5E8F4E |  | Wolves & Deer: saplings. From the sim's own :root. |
| `sim-wolves-browsed` | #A6876A |  | Wolves & Deer: browsed saplings. From the sim's own :root. |
| `sim-wolves-deer` | #8A4B2A |  | Wolves & Deer: deer. From the sim's own :root. |
| `sim-wolves-wolf` | #3E4A55 |  | Wolves & Deer: wolves. From the sim's own :root. |
| `skin-1` | #F2C9A0 |  | People — Lightest skin tone for people (same as Jodi's face). Approved 2026-11-25; see the Art Style Sheet People board. |
| `skin-1-shade` | #CE9A6C |  | People — Neck shadow and nose stroke on skin-1. Approved 2026-11-25; see the Art Style Sheet People board. |
| `skin-2` | #E8B98F |  | People — Light-medium skin tone for people. Approved 2026-11-25; see the Art Style Sheet People board. |
| `skin-2-shade` | #CF9A6E |  | People — Neck shadow and nose stroke on skin-2. Approved 2026-11-25; see the Art Style Sheet People board. |
| `skin-3` | #C68A5E |  | People — Medium skin tone for people. Approved 2026-11-25; see the Art Style Sheet People board. |
| `skin-3-shade` | #A8704A |  | People — Neck shadow and nose stroke on skin-3. Approved 2026-11-25; see the Art Style Sheet People board. |
| `skin-4` | #8D5A3B |  | People — Deep skin tone for people. Approved 2026-11-25; see the Art Style Sheet People board. |
| `skin-4-shade` | #6E4329 |  | People — Neck shadow and nose stroke on skin-4. Approved 2026-11-25; see the Art Style Sheet People board. |
| `hair-black` | #2B2320 |  | People — Black hair; also eyebrows on dark-haired characters. Approved 2026-11-25; see the Art Style Sheet People board. |
| `hair-brown` | #4A3520 |  | People — Brown hair (same value as the warm shadow color). Approved 2026-11-25; see the Art Style Sheet People board. |
| `hair-blond` | #C2A574 |  | People — Blond hair (same as Jodi's hair). Approved 2026-11-25; see the Art Style Sheet People board. |
