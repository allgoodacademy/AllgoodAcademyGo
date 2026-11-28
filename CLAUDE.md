# Notes for Claude Code: AllgoodAcademyGo

## Español audio (every story with a lines.json)
- A story's voices are pre-rendered ElevenLabs MP3s in public/assets/audio/espanol/<story>/, looked up by that folder's manifest.json. The source of truth is scripts/espanol-audio/<story>.lines.json. Today: El Viaje (`el-viaje`) and La selva (`la-selva`). See docs/espanol-audio.md.
- Styling or layout work must not change say(), the audio player, the manifest or the MP3s.
- If you change any text a story speaks, update its <story>.lines.json to match, then run `npm run audio:<story>`. It only renders changed lines. El Viaje: data-say, a say('…') line, WORDS, MENU, SHIRTS, the F/F2A/R/seq tables. La selva: L() and N() lines (narration is looked up without its HTML tags), the F field cards, EMB/ADU, the W/NUM counts and the Puerta replies.
- Rendering needs a session on the **AllgoodAcademyGo** environment (the only one with the ElevenLabs network secret). If you're not on it, say so in the PR and leave the re-render for a session there.
- `npm run test:espanol-audio` must pass. It covers every story with a lines.json, and a new one fails until its page extractor is added to tests/espanol-audio.test.mjs. Never change a line's wording just to make the test pass.
- No slow version; no Jodi voice in Español; never commit or print an API key.
