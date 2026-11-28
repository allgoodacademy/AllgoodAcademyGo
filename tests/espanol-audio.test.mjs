// Español recorded voices, for EVERY story that has scripts/espanol-audio/<story>.lines.json:
// every source line has an MP3 + manifest entry, the clip folder holds nothing else, and every
// string the story page can pass to say() is covered (El Viaje: except free-typed Puerta 5 text).
// A new story's lines.json fails here until the story gets a page extractor below.
//   node --test tests/espanol-audio.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const norm = t => String(t).replace(/[“”]/g, '').replace(/\s+/g, ' ').trim();
const STORIES = fs.readdirSync(path.join(ROOT, 'scripts/espanol-audio'))
  .filter(f => f.endsWith('.lines.json')).map(f => f.replace(/\.lines\.json$/, '')).sort();

function load(story) {
  const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/espanol-audio', `${story}.lines.json`), 'utf8'));
  const dir = path.join(ROOT, 'public/assets/audio/espanol', story);
  const mf = path.join(dir, 'manifest.json');
  const manifest = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : null;
  const html = fs.readFileSync(path.join(ROOT, 'public/espanol', story, 'index.html'), 'utf8');
  const js = html.slice(html.lastIndexOf('<script>'));
  // The file-name prefix the render script uses (scripts/render-espanol-audio.mjs): the source's
  // own `prefix`, else 'ev'. Derived the same way here, never hard-coded per story.
  const prefix = src.prefix || 'ev';
  return { src, dir, manifest, html, js, prefix };
}

test('every story with recorded voices is checked', () => {
  assert.ok(['el-viaje', 'la-selva', 'el-mundial'].every(s => STORIES.includes(s)), `stories found: ${STORIES.join(', ')}`);
});

for (const story of STORIES) {
  const S = load(story);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  test(`${story}: every source line has a manifest entry and an MP3 on disk`, () => {
    assert.ok(S.manifest, `no manifest: run npm run audio:${story}`);
    const re = new RegExp(`^/assets/audio/espanol/${esc(story)}/${esc(S.prefix)}-[a-z]+-[0-9a-f]{8}\\.mp3$`);
    for (const l of S.src.lines) {
      const u = S.manifest[norm(l.text)];
      assert.ok(u, `no manifest entry for: ${l.text}`);
      assert.match(u, re);
      assert.ok(u.includes(`/${S.prefix}-${l.speaker}-`), `${l.text} is filed under the wrong speaker`);
      const f = path.join(ROOT, 'public', u);
      assert.ok(fs.existsSync(f) && fs.statSync(f).size > 1000, `missing or empty MP3 ${u}`);
    }
    assert.equal(Object.keys(S.manifest).length, S.src.lines.length, 'manifest has entries that are not in the source');
  });

  test(`${story}: the clip folder holds only clips the manifest uses`, () => {
    const used = new Set(Object.values(S.manifest || {}).map(u => path.basename(u)));
    const orphans = fs.readdirSync(S.dir).filter(f => f.endsWith('.mp3') && !used.has(f));
    assert.deepEqual(orphans, [], 'unused MP3s: delete them');
  });

  test(`${story}: every speaker has a voice`, () => {
    for (const l of S.src.lines) assert.ok(S.src.cast[l.speaker], `no voice for ${l.speaker}`);
  });

  test(`${story}: every say() string in the page is in the manifest`, () => {
    const extract = EXTRACT[story];
    assert.ok(extract, `no page extractor for "${story}" in tests/espanol-audio.test.mjs: add one, so a line the page says without a clip fails here`);
    const lines = extract(S);
    assert.ok(lines.size >= Math.min(60, S.src.lines.length), `only found ${lines.size} lines; the extractor is probably broken`);
    const missing = [...lines].filter(t => !(S.manifest || {})[t]);
    assert.deepEqual(missing, [], 'the page says these with no recorded clip');
    const stale = S.src.lines.map(l => norm(l.text)).filter(t => !lines.has(t));
    assert.deepEqual(stale, [], 'source lines the page no longer says');
  });

  test(`${story}: the page never calls ElevenLabs`, () => {
    assert.ok(!/elevenlabs\.io/i.test(S.html), 'the page must not call ElevenLabs');
    assert.ok(S.js.includes(`/assets/audio/espanol/${story}/manifest.json`), 'the page does not read its own manifest');
  });
}

/* ---------------------------------------------------------------- page extractors
   Everything a story page can hand to say(), gathered from the page itself. */
const EXTRACT = {
  'el-viaje': ({ html, js }) => {
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
    // Puerta 5's sentence, read from the page so a wording change there is caught here too
    const p5 = js.match(/say\('(Busco un [^']+ que )'\+v\+'( cerca del estudio\.)'\)/);
    assert.ok(p5, 'Puerta 5 say() not found');
    for (const v of ['esté', 'está']) add(p5[1] + v + p5[2]);
    return out;
  },

  // La selva: dialogue lines L(who, es, en), English narration N(text) (looked up without its
  // HTML tags), field cards and Embarque / Aduana items ({es:'…'}), the counting arrays, and the
  // Puerta replies. Every say() / sayQ() call site must pass one of the expressions below, so a
  // new kind of spoken line fails here until it is covered.
  'la-selva': ({ js }) => {
    const out = new Set();
    const un = s => s.replace(/\\'/g, "'");
    const add = t => out.add(norm(un(t)));
    const Q = "'((?:[^'\\\\]|\\\\.)*)'";   // a single-quoted JS string literal
    const all = (re, k = 1) => { const ms = [...js.matchAll(re)]; assert.ok(ms.length, `pattern not found: ${re}`); ms.forEach(m => add(m[k])); return ms.length; };
    all(new RegExp(`\\bL\\(${Q},${Q}`, 'g'), 2);                         // L('Marisol','…','…')
    for (const m of js.matchAll(new RegExp(`\\bN\\(${Q}\\)`, 'g'))) add(un(m[1]).replace(/<[^>]+>/g, '')); // N('…<b>…</b>…')
    all(new RegExp(`\\bes:${Q}`, 'g'));                                  // F, EMB, ADU
    for (const name of ['W', 'NUM']) {
      for (const m of js.matchAll(new RegExp(`const ${name}=\\[([^\\]]*)\\]`, 'g'))) for (const x of m[1].matchAll(new RegExp(Q, 'g'))) add(x[1]);
    }
    all(new RegExp(`const R=${Q},W=${Q}`, 'g'), 1); all(new RegExp(`const R=${Q},W=${Q}`, 'g'), 2);   // Puerta 1
    all(new RegExp(`const l2=${Q}`, 'g'));                               // Puerta 1, "Miren aquí"
    all(new RegExp(`const l=${Q}`, 'g'));                                // las cataratas
    all(new RegExp(`\\bline=${Q}`, 'g'));                                // Puerta 3, the keeper
    all(new RegExp(`'[\\w+-]+':\\[${Q},`, 'g'));                         // Puertas 2 and 4: lines={k:[es,en]}
    for (const m of js.matchAll(new RegExp(`\\bsayQ?\\(${Q}`, 'g'))) add(m[1]);   // literal say('…')

    // Every call site passes something gathered above.
    const OK = new Set(['es.dataset.es', 'n.dataset.say', 'f.dataset.es', 'F[k].es', 'it.es', 'ok?R:W', 'l2', 'lines[0]', 'W[n]', 'W[n-1]', 'W[i]', 'NUM[i]', 'line', 'l']);
    const sites = [...js.matchAll(/\b(say|sayQ)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)]
      .map(m => m[2].replace(/,'(es|en)'$/, '').trim())
      .filter(a => a && a !== 't,lang');
    assert.ok(sites.length > 10, 'say() call sites not found');
    const unknown = sites.filter(a => !OK.has(a) && !/^'.*'$/.test(a));
    assert.deepEqual(unknown, [], 'say() is passed something this test does not know how to read: teach the la-selva extractor about it');
    return out;
  },

  // El Mundial: data-say prompts, literal say()/sayQ() lines, the fork lines (plaza taps, metro
  // ternary, the food words), glossary (.gl), plan words (.pl), verb chips (data-a and data-b), WORDS,
  // the Puerta replies, and the TEMPLATED lines: every combination of the student's picks, built
  // from the page's own template and chip values. Every say() / sayQ() call site must pass one of
  // the expressions below, so a new kind of spoken line fails here until it is covered.
  'el-mundial': ({ html, js }) => {
    const out = new Set();
    const add = t => out.add(norm(t));
    const must = (re, s = js) => { const m = s.match(re); assert.ok(m, `pattern not found: ${re}`); return m; };
    const grab = re => Function(`return (${must(re)[1]})`)();
    for (const m of html.matchAll(/data-say="([^"$]+)"/g)) add(m[1]);
    for (const m of js.matchAll(/\bsayQ?\('([^']+)'/g)) add(m[1]);
    for (const m of html.matchAll(/class="gl"[^>]*>([^<]+)</g)) add(m[1]);
    for (const m of html.matchAll(/class="pl" data-w="([^"]+)"/g)) add(m[1]);
    const chips = {};
    for (const m of html.matchAll(/class="chip" data-slot="(\d+)" data-a="([^"]+)" data-b="([^"]+)"/g)) { chips[m[1]] = [m[2], m[3]]; add(m[2]); add(m[3]); }
    for (const [es] of grab(/const WORDS=(\[.*?\]\]);/)) add(es);
    // Puerta 1 and the metro question: both arms of each ternary
    for (const re of [/say\(k==='A'\?'([^']+)':'([^']+)'\)/, /const t=o\.dataset\.k==='a'\?'([^']+)':'([^']+)'/, /const q=k==='A'\?'([^']+)':'([^']+)'/]) { const m = must(re); add(m[1]); add(m[2]); }
    // plaza taps (say(t) with "Facu: " dropped)
    for (const t of grab(/const t=(\['La Catedral[^\]]*\])\[\+d\.dataset\.i\]/)) add(t.replace(/Facu: /, ''));
    // supermercado: each food word, and Lucía's line for every ordered pair of two different items
    const FOOD = grab(/const FOOD=(\[[\s\S]*?\]\n\]);/).map(f => f[1]);
    FOOD.forEach(add);
    const sup = must(/const t=`Lucía: “([^`]*)\$\{got\[0\]\}([^`]*)\$\{got\[1\]\}([^`]*)”`/);
    for (const a of FOOD) for (const b of FOOD) if (a !== b) add(sup[1] + a + sup[2] + b + sup[3]);
    // Puerta 3: the student's voice note for every chip combination, and Facu's replies
    const g3 = must(/say\(`([^`]*)\$\{v\[1\]\}([^`]*)\$\{v\[2\]\}([^`]*)\$\{v\[3\]\}([^`]*)`\)/);
    for (const a of chips[1]) for (const b of chips[2]) for (const c of chips[3]) add(g3[1] + a + g3[2] + b + g3[3] + c + g3[4]);
    for (const m of must(/const R=\{1:([\s\S]*?)\};/)[1].matchAll(/'([^']+)'/g)) add(m[1]);
    // Puerta 4: the student's answer for every chip combination, and Rosa's three replies
    const g4 = must(/say\(`([^`]*)\$\{a\}([^`]*)\$\{b\}([^`]*)`\)/);
    for (const a of chips[41]) for (const b of chips[42]) add(g4[1] + a + g4[2] + b + g4[3]);
    const g4r = [...must(/\/\* PUERTA 4([\s\S]*?)\/\* PUERTA 5/)[1].matchAll(/t='([^']+)'/g)];
    assert.equal(g4r.length, 3, 'Puerta 4 replies not found'); g4r.forEach(m => add(m[1]));

    // Every call site passes something gathered above.
    const OK = new Set(['r.dataset.w', 'b.dataset.say,b.dataset.lang', 'b.dataset.say', 'g.textContent', 'c.textContent', 't', 'q', 's.dataset.es',
      "t.replace(/Facu: /,'').replace(/[“”]/g,'')", "t.replace('Lucía: ','').replace(/[“”]/g,'')", "R[i].replace(/[“”]/g,'')", "t.replace(/[“”]/g,'')",
      "k==='A'?'¡Genial! Mañana vamos a la Plaza Roja. ¡Vení con nosotros!':'Jaja, no, ¡vos! Te pregunto a vos. ¿De dónde sos?'",
      `\`${g3[0].slice(5, -2)}\``, `\`${g4[0].slice(5, -2)}\``]);
    const sites = [...js.matchAll(/\b(say|sayQ)\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)]
      .map(m => m[2].replace(/,'(es|en)'$/, '').trim())
      .filter(a => a && a !== 't,lang');
    assert.ok(sites.length > 15, 'say() call sites not found');
    const unknown = sites.filter(a => !OK.has(a) && !/^'[^']*'$/.test(a));
    assert.deepEqual(unknown, [], 'say() is passed something this test does not know how to read: teach the el-mundial extractor about it');
    return out;
  },
};

test('El Viaje: say() keeps the speechSynthesis fallback and the existing telemetry call', () => {
  const { js } = load('el-viaje');
  assert.match(js, /function say\(t\)\{T\('ev_audio_play',\{t\}\);/);
  assert.match(js, /function sayTTS\(t\)\{if\(!hasTTS\)return;try\{speechSynthesis\.cancel\(\);const u=new SpeechSynthesisUtterance\(t\);u\.lang=VOICE\?VOICE\.lang:'es-MX';if\(VOICE\)u\.voice=VOICE;u\.rate=\.92;speechSynthesis\.speak\(u\)\}catch\(_\)\{\}\}/);
});

test('La selva: one shared Audio element, stop-before-play, browser speech as the fallback', () => {
  const { js } = load('la-selva');
  assert.match(js, /let a=AUD\.el;if\(!a\)\{a=AUD\.el=new Audio\(\);a\.preload='none'\}/, 'one shared Audio element');
  assert.match(js, /try\{a\.pause\(\)\}catch\(e\)\{\}/, 'stops what was playing before the next clip');
  assert.match(js, /const u=m\[k\];if\(!u\)\{tts\(\);return\}/, 'a line missing from the manifest falls back to the browser voice');
  assert.match(js, /function sayTTS\(t,lang\)\{if\(!hasTTS\)return;try\{speechSynthesis\.cancel\(\);speechSynthesis\.speak\(utter\(t,lang\)\)\}catch\(e\)\{\}\}/);
  assert.match(js, /\naudManifest\(\);\n/, 'the manifest is fetched as the page loads, so the first tap plays at once');
});

test('El Mundial: one shared Audio element, stop-before-play, browser speech as the fallback, telemetry kept', () => {
  const { js } = load('el-mundial');
  assert.match(js, /let a=AUD\.el;if\(!a\)\{a=AUD\.el=new Audio\(\);a\.preload='none'\}/, 'one shared Audio element');
  assert.match(js, /try\{a\.pause\(\)\}catch\(_\)\{\}/, 'stops what was playing before the next clip');
  assert.match(js, /const u=m\[k\];if\(!u\)\{tts\(\);return\}/, 'a line missing from the manifest falls back to the browser voice');
  assert.match(js, /function say\(t,lang\)\{T\('ev_audio_play',\{\}\);/, 'say() keeps the ev_audio_play telemetry call');
  assert.match(js, /function sayTTS\(t,lang\)\{if\(!hasTTS\)return;try\{speechSynthesis\.cancel\(\);/);
  assert.equal((js.match(/speechSynthesis\.speak\(/g) || []).length, 1, 'only sayTTS() may use the browser voice');
  assert.match(js, /\naudManifest\(\);\n/, 'the manifest is fetched as the page loads, so the first tap plays at once');
});
