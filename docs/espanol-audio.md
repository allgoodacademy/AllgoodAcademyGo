# Español audio (recorded voices)

El Viaje plays pre-rendered MP3s instead of the browser's speech voice. Every spoken line is
rendered once with ElevenLabs, committed, and served from our own `/assets/`. Students' browsers
never talk to ElevenLabs.

## Files

| What | Where |
|---|---|
| Lines, cast (speaker → voice_id), model | `scripts/espanol-audio/el-viaje.lines.json` |
| Render script | `scripts/render-espanol-audio.mjs` |
| MP3s + manifest | `public/assets/audio/espanol/el-viaje/` |
| Coverage test | `tests/espanol-audio.test.mjs` (`npm run test:espanol-audio`) |

Each line is `{ "text", "speaker", "tag" }`. `tag` is an optional delivery tag (`[warmly]`,
`[curious]`…) that is sent in front of the text. File names are
`ev-<speaker>-<hash8>.mp3`, where `hash8` is the first 8 hex characters of
sha256(`voice_id|model_id|tag|text`). Any change to a line, its tag, its voice or the model gives
a new file name, so the one-year cache on `/assets/audio/**/*.mp3` never serves a stale clip.
`manifest.json` (served no-cache) maps the normalized text (curly quotes stripped, whitespace
collapsed) to the file.

In the page, `say(t)` normalizes `t`, looks it up in the manifest (fetched once, on the first
`say()`), and plays it in one shared `Audio` element, stopping whatever was playing. If the line
is not in the manifest or the file fails to load, it falls back to the old speechSynthesis voice.

## Re-render

```bash
npm run audio:el-viaje -- --dry-run   # line count + characters, spends nothing
npm run audio:el-viaje                # renders only the files that don't exist yet
npm run test:espanol-audio            # proves every line has an MP3 and every say() string is covered
```

Auth: in the AllgoodAcademyGo cloud environment the network proxy adds the `xi-api-key` header
for `api.elevenlabs.io`; nothing is needed in the repo. For a local run, export
`ELEVENLABS_API_KEY`. Never commit or print the key. A 401/403 stops the script.

If the page gains or changes a spoken line, add/edit it in `el-viaje.lines.json` (exact wording,
plus a speaker), re-render, and run the test. The test fails if the page says something the
manifest doesn't have, or if the source has lines the page no longer says.

## Swap a character's voice

1. Change that speaker's `voice_id` in the `cast` map of `el-viaje.lines.json`.
2. `npm run audio:el-viaje`: only that speaker's lines re-render (their hashes changed).
3. The script lists the old files as "unused"; delete them and commit.

Changing `model_id` re-renders everything. If `eleven_v4` is rejected, the script falls back
to `eleven_v3` for that run (or pass `--model eleven_v3`).

## Budget guard

The script prints the line count and characters to render before it starts, and refuses to run
above **15,000 characters** in one run unless `--yes-over-budget` is passed (the key is capped at
20,000 credits). Existing files are skipped, so re-runs cost nothing. Requests run one at a time;
a 429/5xx is retried once after 5 s, anything else fails loudly.
