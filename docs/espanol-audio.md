# Español audio (recorded voices)

Every Español story with a `scripts/espanol-audio/<story>.lines.json` plays pre-rendered MP3s
instead of the browser's speech voice: El Viaje (`el-viaje`), La selva (`la-selva`, 2026-11-28),
El Mundial (`el-mundial`, 2026-11-28) and La Habana (`la-habana`, 2026-11-28).
Every spoken line is rendered once with ElevenLabs, committed, and served from our own `/assets/`.
Students' browsers never talk to ElevenLabs. `<story>` below is the story's folder name.

## Files

| What | Where |
|---|---|
| Lines, cast (speaker → voice_id), model | `scripts/espanol-audio/<story>.lines.json` |
| Render script | `scripts/render-espanol-audio.mjs <story>` (`npm run audio:<story>`) |
| MP3s + manifest | `public/assets/audio/espanol/<story>/` |
| Coverage test | `tests/espanol-audio.test.mjs` (`npm run test:espanol-audio`), every story with a lines.json |

Each line is `{ "text", "speaker", "tag" }`. `tag` is an optional delivery tag (`[warmly]`,
`[curious]`…) that is sent in front of the text. File names are
`<prefix>-<speaker>-<hash8>.mp3` (`prefix` is the lines.json's own `prefix`, else `ev`, so
every story's files start `ev-`; the test derives it the same way), where `hash8` is the first 8 hex characters of
sha256(`voice_id|model_id|tag|text`). Any change to a line, its tag, its voice or the model gives
a new file name, so the one-year cache on `/assets/audio/**/*.mp3` never serves a stale clip.
`manifest.json` (served no-cache) maps the normalized text (curly quotes stripped, whitespace
collapsed) to the file.

In the page, `say(t)` normalizes `t`, looks it up in the manifest (fetched once, on the first
`say()`), and plays it in one shared `Audio` element, stopping whatever was playing. If the line
is not in the manifest or the file fails to load, it falls back to the old speechSynthesis voice.

## Re-render

```bash
npm run audio:el-mundial -- --dry-run # line count + characters, spends nothing
npm run audio:el-mundial              # renders only the files that don't exist yet
npm run test:espanol-audio            # every story: every line has an MP3, every say() string is covered
```

Auth: in the AllgoodAcademyGo cloud environment the network proxy adds the `xi-api-key` header
for `api.elevenlabs.io`; nothing is needed in the repo. For a local run, export
`ELEVENLABS_API_KEY`. Never commit or print the key. A 401/403 stops the script.

If the page gains or changes a spoken line, add/edit it in `<story>.lines.json` (exact wording,
plus a speaker), re-render, and run the test. The test fails if the page says something the
manifest doesn't have, or if the source has lines the page no longer says. Each story has its own
page extractor in the test (what its say() can be handed); La selva's also fails if a say() call
passes an expression it does not know, so a new kind of spoken line can't slip past it.

### A new story

1. Add `scripts/espanol-audio/<story>.lines.json` and an `audio:<story>` script in package.json.
2. Render it (see Auth below), and wire the page's `say()` to its manifest as El Viaje and La selva
   do: one shared `Audio` element, stop-before-play, the browser voice as the fallback.
3. Add the story's extractor to `EXTRACT` in `tests/espanol-audio.test.mjs`. Until then the test fails.

### La selva

Five voices: Marisol, la profe Daniela and el cuidador (Costa Rican), `voz` for item phrases and
field cards, and `narr`, an English narrator for the `N()` lines. A narration line is looked up by
its text without HTML tags (`data-say` already strips them). The manifest is fetched as the page
loads so the first ▶ plays at once. `sayQ()` queues a line behind the one playing (the toucan's
count); any `say()` drops what is still queued.

### El Mundial

122 lines, 5,604 characters (first render 2026-11-28, `eleven_v4`). Seven speakers:

| Speaker | Who | Voice |
|---|---|---|
| `facu` | Facu, Argentine fan (voseo kept as written) | Tomás |
| `lucia` | Lucía, Argentine fan | Julieta |
| `rosa` | Rosa, Peruvian mom on the train | Nelly |
| `olga` | Olga, Russian train attendant, in English | Natasha |
| `tu` | the student's own Spanish (the sentences built at the Puertas) | El Viaje's narrador |
| `tu_en` | the student's own English to Olga | Carolyn (in the cast; the page speaks no such line today) |
| `voz` | word list, glossary taps, verb chips, plan words, food words | Ninoska |

Mateo has no spoken lines; no voice speaks as William or Jodi.

The **templated** lines are rendered whole, one clip per combination the page can build, because
every template is small: Puerta 3's voice note (2 × 2 × 2 = 8), Puerta 4's answer (2 × 2 = 4) and
Lucía's supermarket line (every ordered pair of two different foods, 12). The test builds the same
combinations from the page's own template strings and chip values, so a new chip value or a reworded
template fails until it is rendered. Puerta 5 says nothing but its chips.

Same player as La selva: the manifest is fetched as the page loads, `say()` stops what is playing,
and `sayQ()` queues a Puerta's replies behind the line before them (the bubbles keep their timing;
only the voice waits). English lines (`data-lang="en"`, Olga) use the same lookup; the browser
fallback reads them as en-US.

### La Habana

69 lines, 3,478 characters (first render 2026-11-28, `eleven_v4`). Files start `lh-` (the
lines.json's `prefix`). Five speakers:

| Speaker | Who | Voice | Tag |
|---|---|---|---|
| `caridad` | Doña Caridad, the host (Cuban) | Yenisel | `[warmly]`; `[laughing]` on "¿Rica yo?…" |
| `yoel` | Yoel, her 15-year-old nephew (Cuban) | Aaron | `[excited]`; `[offended, then laughing]` on "¿¡Yo soy aburrido!?…" |
| `kate` | Kate, British friend, in English (`K()` lines and the Puertas' `kate:` reactions) | Molly | `[cheerful]`; `[laughing]` on the "RICH" line |
| `narr` | English narration, the `N()` lines | Carolyn | `[clearly]` |
| `voz` | the Puerta sentences (what *you* say), Embarque / Aduana items, transfer sentences, field-card names | Ninoska | `[clearly]` |

No voice speaks as William. Kate's stage direction "(crying laughing)" is shown, not spoken: `K()`
and the test both drop a leading "(…)". The transfer has no blank to read aloud, so tapping
*es* or *está* says the sentence the student built: both verbs are rendered for each sentence (4
clips). Same player as La selva (one shared `Audio`, stop-before-play, manifest fetched on load);
there is no queued line, so no `sayQ()`.

## Swap a character's voice

1. Change that speaker's `voice_id` in the `cast` map of `<story>.lines.json`.
2. `npm run audio:<story>`: only that speaker's lines re-render (their hashes changed).
3. The script lists the old files as "unused"; delete them and commit.

Changing `model_id` re-renders everything. If `eleven_v4` is rejected, the script falls back
to `eleven_v3` for that run (or pass `--model eleven_v3`).

## Budget guard

The script prints the line count and characters to render before it starts, and refuses to run
above **15,000 characters** in one run unless `--yes-over-budget` is passed (the key is capped at
20,000 credits). Existing files are skipped, so re-runs cost nothing. Requests run one at a time;
a 429/5xx is retried once after 5 s, anything else fails loudly.
