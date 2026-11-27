#!/usr/bin/env node
// Pre-renders every spoken line of an Español story to MP3 with ElevenLabs.
//
//   node scripts/render-espanol-audio.mjs el-viaje            # render what's missing
//   node scripts/render-espanol-audio.mjs el-viaje --dry-run  # count lines/characters only
//   node scripts/render-espanol-audio.mjs el-viaje --model eleven_v3
//   node scripts/render-espanol-audio.mjs el-viaje --yes-over-budget
//
// Source:  scripts/espanol-audio/<story>.lines.json  ({ model_id, cast, lines: [{text, speaker, tag?}] })
// Output:  public/assets/audio/espanol/<story>/ev-<speaker>-<hash8>.mp3  + manifest.json
//
// Auth: in the cloud environment the network proxy adds the xi-api-key header for
// api.elevenlabs.io, so no key is needed here. For a local run, ELEVENLABS_API_KEY is
// sent if set. The key is never printed or written anywhere.
// See docs/espanol-audio.md.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET = 15000; // characters per run; the key is capped at 20,000 credits
const FALLBACK_MODEL = 'eleven_v3';

const args = process.argv.slice(2);
const story = args.find(a => !a.startsWith('--'));
const flag = f => args.includes(f);
const opt = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
if (!story) { console.error('usage: render-espanol-audio.mjs <story> [--dry-run] [--model id] [--yes-over-budget]'); process.exit(2); }

const srcFile = path.join(ROOT, 'scripts/espanol-audio', `${story}.lines.json`);
const src = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
const outDir = path.join(ROOT, 'public/assets/audio/espanol', story);
const urlBase = `/assets/audio/espanol/${story}/`;
const prefix = src.prefix || 'ev';
let model = opt('--model') || src.model_id;

// Same normalization the page uses before looking a line up.
const norm = t => String(t).replace(/[“”]/g, '').replace(/\s+/g, ' ').trim();
const spoken = l => (l.tag ? l.tag + ' ' : '') + l.text;
const fileFor = (l, m) => {
  const voice = src.cast[l.speaker];
  const h = crypto.createHash('sha256').update(`${voice}|${m}|${l.tag || ''}|${l.text}`).digest('hex').slice(0, 8);
  return `${prefix}-${l.speaker}-${h}.mp3`;
};

// Validate the source before spending anything.
const seen = new Set();
for (const l of src.lines) {
  if (!src.cast[l.speaker]) throw new Error(`no voice for speaker "${l.speaker}" (line: ${l.text})`);
  const k = norm(l.text);
  if (seen.has(k)) throw new Error(`duplicate line: ${l.text}`);
  seen.add(k);
}

fs.mkdirSync(outDir, { recursive: true });
const todo = src.lines.filter(l => !fs.existsSync(path.join(outDir, fileFor(l, model))));
const chars = todo.reduce((a, l) => a + spoken(l).length, 0);
const totalChars = src.lines.reduce((a, l) => a + spoken(l).length, 0);
console.log(`${story}: ${src.lines.length} lines (${totalChars} characters), model ${model}`);
console.log(`to render now: ${todo.length} lines, ${chars} characters (${src.lines.length - todo.length} already on disk)`);

if (flag('--dry-run')) process.exit(0);
if (chars > BUDGET && !flag('--yes-over-budget')) {
  console.error(`refusing: ${chars} characters is over the ${BUDGET}-character budget. Pass --yes-over-budget to go ahead.`);
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function tts(l, m) {
  const headers = { 'Content-Type': 'application/json', Accept: 'audio/mpeg' };
  if (process.env.ELEVENLABS_API_KEY) headers['xi-api-key'] = process.env.ELEVENLABS_API_KEY;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${src.cast[l.speaker]}?output_format=mp3_44100_128`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ text: spoken(l), model_id: m }) });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = (await res.text()).slice(0, 400);
    if ((res.status === 429 || res.status >= 500) && attempt === 0) { console.warn(`  ${res.status}, retrying in 5 s`); await sleep(5000); continue; }
    const err = new Error(`HTTP ${res.status} for "${l.text}": ${body}`);
    err.status = res.status; err.body = body;
    throw err;
  }
}

let done = 0, rendered = 0;
for (const l of todo) {
  let buf;
  try {
    buf = await tts(l, model);
  } catch (e) {
    if (e.status === 401 || e.status === 403) { console.error(`STOP: ElevenLabs refused the request (${e.status}). Check the key; nothing else is attempted.`); process.exit(1); }
    // Model not available: fall back once, before anything was rendered with the first model.
    if ((e.status === 400 || e.status === 422) && /model/i.test(e.body) && model !== FALLBACK_MODEL && rendered === 0 && !opt('--model')) {
      console.warn(`model ${model} was rejected; falling back to ${FALLBACK_MODEL} for this run`);
      model = FALLBACK_MODEL;
      if (fs.existsSync(path.join(outDir, fileFor(l, model)))) continue;
      buf = await tts(l, model);
    } else { console.error(e.message); process.exit(1); }
  }
  const f = fileFor(l, model);
  if (fs.existsSync(path.join(outDir, f))) continue;
  fs.writeFileSync(path.join(outDir, f), buf);
  rendered++; done += spoken(l).length;
  console.log(`  ${f}  ${l.speaker}: ${l.text}`);
}

// Manifest: every line whose file is on disk for the model used.
const manifest = {};
const missing = [];
for (const l of src.lines) {
  const f = fileFor(l, model);
  if (fs.existsSync(path.join(outDir, f))) manifest[norm(l.text)] = urlBase + f;
  else missing.push(l.text);
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
const used = new Set(Object.values(manifest).map(u => path.basename(u)));
const orphans = fs.readdirSync(outDir).filter(f => f.endsWith('.mp3') && !used.has(f));

console.log(`rendered ${rendered} lines, ${done} characters, model ${model}`);
console.log(`manifest: ${Object.keys(manifest).length} entries → ${path.relative(ROOT, path.join(outDir, 'manifest.json'))}`);
if (orphans.length) console.log(`unused files (safe to delete): ${orphans.join(', ')}`);
if (missing.length) { console.error(`missing audio for ${missing.length} lines`); process.exit(1); }
