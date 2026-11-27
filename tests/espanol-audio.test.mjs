// El Viaje recorded voices: every source line has an MP3 + manifest entry, and every
// string the page can pass to say() is covered (except free-typed Puerta 5 text).
//   node --test tests/espanol-audio.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const norm = t => String(t).replace(/[“”]/g, '').replace(/\s+/g, ' ').trim();
const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/espanol-audio/el-viaje.lines.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/audio/espanol/el-viaje/manifest.json'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'public/espanol/el-viaje/index.html'), 'utf8');
const js = html.slice(html.lastIndexOf('<script>'));

test('every source line has a manifest entry and an MP3 on disk', () => {
  for (const l of src.lines) {
    const u = manifest[norm(l.text)];
    assert.ok(u, `no manifest entry for: ${l.text}`);
    assert.match(u, /^\/assets\/audio\/espanol\/el-viaje\/ev-[a-z]+-[0-9a-f]{8}\.mp3$/);
    assert.ok(u.includes(`ev-${l.speaker}-`), `${l.text} is filed under the wrong speaker`);
    const f = path.join(ROOT, 'public', u);
    assert.ok(fs.existsSync(f) && fs.statSync(f).size > 1000, `missing or empty MP3 ${u}`);
  }
  assert.equal(Object.keys(manifest).length, src.lines.length, 'manifest has entries that are not in the source');
});

test('every speaker has a voice', () => {
  for (const l of src.lines) assert.ok(src.cast[l.speaker], `no voice for ${l.speaker}`);
});

// Everything the page can hand to say(), gathered from the page itself.
function pageLines() {
  const out = new Set();
  const add = t => out.add(norm(t));
  // literal data-say attributes (not ${templates})
  for (const m of html.matchAll(/data-say="([^"$]+)"/g)) add(m[1]);
  // literal say('…') calls
  for (const m of js.matchAll(/\bsay\('([^']+)'\)/g)) add(m[1]);
  // story glossary words (say(g.textContent))
  for (const m of html.matchAll(/class="gl"[^>]*>([^<]+)</g)) add(m[1]);
  // data tables: evaluate the literals straight out of the page
  const grab = re => { const m = js.match(re); assert.ok(m, `pattern not found: ${re}`); return Function(`return (${m[1]})`)(); };
  for (const [es] of grab(/const WORDS=(\[.*?\]\]);/)) add(es);
  const SHIRTS = grab(/const SHIRTS=(\[.*?\]);/);
  for (const s of SHIRTS) add(s.name + ', talla ' + s.talla);
  for (const x of ['lo', 'la']) add('Buena elección. ¿Se ' + x + ' quiere probar?');
  const MENU = grab(/const MENU=(\[[\s\S]*?\]);/);
  for (const m of MENU) add(m.name);
  for (const v of Object.values(grab(/const F2A=(\{.*?\});/))) add(v);
  const R = grab(/const R=(\{[\s\S]*?\})\[k\];/);
  for (const r of Object.values(R)) add(r[1]);
  for (const v of Object.values(grab(/const F=(\{.*?\});/))) add(v);
  // reception + Puerta 4 turn-1 ternaries: both arms
  for (const re of [/const t=o\.dataset\.k==='plancha'\?'([^']+)':'([^']+)'/, /const t=k==='u'\?'([^']+)':'([^']+)'/]) {
    const m = js.match(re); assert.ok(m, `pattern not found: ${re}`); add(m[1]); add(m[2]);
  }
  // dinner sequence: fixed lines + every 1–3 dish order Memo can repeat
  for (const m of js.match(/const seq=\[(.*?),\['Don Memo',line\]\]/)[1].matchAll(/'(“[^']+”)'/g)) add(m[1]);
  const listES = a => a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
  for (let mask = 1; mask < 1 << MENU.length; mask++) {
    const items = MENU.filter((_, i) => mask >> i & 1);
    if (items.length <= 3) add(`Muy bien. Y para usted: ${listES(items.map(i => i.the))}. Ahorita se los traigo.`);
  }
  // facturé/facturaba chip and the two accepted Puerta 5 answers
  add('facturé'); add('facturaba');
  for (const v of ['esté', 'está']) add('Busco un apartamento que ' + v + ' cerca del estudio.');
  return out;
}

test('every say() string in the page is in the manifest', () => {
  const lines = pageLines();
  assert.ok(lines.size > 100, `only found ${lines.size} lines; the extractor is probably broken`);
  const missing = [...lines].filter(t => !manifest[t]);
  assert.deepEqual(missing, []);
  const stale = src.lines.map(l => norm(l.text)).filter(t => !lines.has(t));
  assert.deepEqual(stale, [], 'source lines the page no longer says');
});

test('say() keeps the speechSynthesis fallback and the existing telemetry call', () => {
  assert.match(js, /function say\(t\)\{T\('ev_audio_play',\{t\}\);/);
  assert.match(js, /function sayTTS\(t\)\{if\(!hasTTS\)return;try\{speechSynthesis\.cancel\(\);const u=new SpeechSynthesisUtterance\(t\);u\.lang=VOICE\?VOICE\.lang:'es-MX';if\(VOICE\)u\.voice=VOICE;u\.rate=\.92;speechSynthesis\.speak\(u\)\}catch\(_\)\{\}\}/);
  assert.ok(!/elevenlabs\.io/i.test(html), 'the page must not call ElevenLabs');
});
