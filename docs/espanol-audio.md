# Español audio (recorded voices)

Every Español story with a `scripts/espanol-audio/<story>.lines.json` plays pre-rendered MP3s
instead of the browser's speech voice: El Viaje (`el-viaje`) and La selva (`la-selva`, 2026-11-28).
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
both stories' files start `ev-`; the test derives it the same way), where `hash8` is the first 8 hex characters of
sha256(`voice_id|model_id|tag|text`). Any change to a line, its tag, its voice or the model gives
a new file name, so the one-year cache on `/assets/audio/**/*.mp3` never serves a stale clip.
`manifest.json` (served no-cache) maps the normalized text (curly quotes stripped, whitespace
collapsed) to the file.

In the page, `say(t)` normalizes `t`, looks it up in the manifest (fetched once, on the first
`say()`), and plays it in one shared `Audio` element, stopping whatever was playing. If the line
is not in the manifest or the file fails to load, it falls back to the old speechSynthesis voice.

## Re-render

```bash
npm run audio:la-selva -- --dry-run   # line count + characters, spends nothing
npm run audio:la-selva                # renders only the files that don't exist yet
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
