# Notes for Claude Code: AllgoodAcademyGo

## Español audio (El Viaje)
- El Viaje's voices are pre-rendered ElevenLabs MP3s in public/assets/audio/espanol/el-viaje/, looked up by public/assets/audio/espanol/el-viaje/manifest.json. The source of truth is scripts/espanol-audio/el-viaje.lines.json. See docs/espanol-audio.md.
- Styling or layout work must not change say(), the audio player, the manifest or the MP3s.
- If you change any text the page speaks (data-say, a say('…') line, WORDS, MENU, SHIRTS, the F/F2A/R/seq tables), update el-viaje.lines.json to match, then run `npm run audio:el-viaje`. It only renders changed lines. Rendering needs a session on the **AllgoodAcademyGo** environment (the only one with the ElevenLabs network secret). If you're not on it, say so in the PR and leave the re-render for a session there.
- `npm run test:espanol-audio` must pass. Never change a line's wording just to make the test pass.
- No slow version; no Jodi voice in Español; never commit or print an API key.
