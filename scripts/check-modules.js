#!/usr/bin/env node
// Validates every module surface against ONE list: public/data/modules-registry.json.
//
// This script used to cross-check several independently hardcoded lists against each other.
// That catches drift between them but cannot catch a module missing from all of them at
// once — which is exactly how four live games went unregistered. The registry is now the
// single source and every surface is checked against it:
//   - public/dashboard/index.html reads the registry at runtime, so what is checked here is
//     that it still does, and that LAB_PACK_PLANNED / RWR_PACK_PLANNED / RTT_PACK_PLANNED
//     name exactly the labs the registry says are live in each pack
//   - COURSES in public/insider/index.html (still hand-maintained, so checked entry by entry)
//   - each Lab Pack hub renders its cards from the registry, so what is checked is that it
//     still fetches it and still carries the anchors the cards are inserted at
//   - the "Steps per module" table in docs/insider-analytics.md
//   - each module page's Telemetry.init({ module, gameName, stepsTotal }) call — INCLUDING
//     the four games, which had no such check before
//   - each lab's completion-badge "N scenarios" figure vs the real category count in its
//     pack's Challenge SCENARIO_DATA (the Privacy & Security "9 vs 8" bug class)
//   - internal skill tags: every category a game routes by exists on some lab (so
//     /js/skill-routing.js can never resolve to nothing), AND every such tag cites the
//     evidence its placement rests on (so a placement can be reviewed rather than trusted)
//   - public/mission-control/module-data.js is in sync with the arrays it is generated from
// No dependencies; run with `node scripts/check-modules.js`. Exits 1 on any mismatch.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const problems = [];
const fail = (msg) => problems.push(msg);
// A warning is something a human must see on every run but which does not stop a build.
// There is exactly one source of these today: a skill on the registry's `orphanedSkills`
// list. It is deliberately loud rather than a log line — the whole point of the list is
// that a known gap stays visible instead of being papered over with a fake destination.
const warnings = [];
const warn = (msg) => warnings.push(msg);

// Lab Packs: which hub and which Challenge each pack's modules belong to, and which
// Challenge category each lab's badge counts. Add a row here when a pack or lab ships.
const PACKS = {
  'digital-decisions': {
    plannedConst: 'LAB_PACK_PLANNED',
    hub: 'public/jsh/digital-decisions-lab/index.html',
    hubPrefix: '/jsh/digital-decisions-lab/',
    challengeId: 'ddc',
    challengePage: 'public/educational-games/digital-decisions/index.html',
    badgeCategory: { 'social-intelligence': 'social_intelligence', 'privacy-security': 'privacy_security', 'digital-citizenship': 'digital_citizenship', 'professional-brand': 'professional_brand' },
  },
  'real-world-ready': {
    plannedConst: 'RWR_PACK_PLANNED',
    hub: 'public/jsh/real-world-ready-lab/index.html',
    hubPrefix: '/jsh/real-world-ready-lab/',
    challengeId: 'rwr-challenge',
    challengePage: 'public/educational-games/real-world-ready/index.html',
    badgeCategory: { 'money-as-a-skill': 'money', 'conflict-has-a-winner': 'conflict', 'reading-the-room': 'reading_room' },
  },
  'room-to-think': {
    plannedConst: 'RTT_PACK_PLANNED',
    hub: 'public/jsh/room-to-think-lab/index.html',
    hubPrefix: '/jsh/room-to-think-lab/',
    challengeId: 'rtt-challenge',
    challengePage: 'public/educational-games/room-to-think/index.html',
    badgeCategory: {
      'ten-voices-one-source': 'source_counting',
      'the-question-decides-the-answer': 'question_framing',
      'where-you-say-it': 'audience_choice',
      'the-cost-of-later': 'starting_early',
    },
  },
};

// --- the shared registry: everything below is checked against this
let REGISTRY = [];
let ORPHANED = [];
try {
  const raw = JSON.parse(read('public/data/modules-registry.json'));
  REGISTRY = Array.isArray(raw.modules) ? raw.modules : [];
  if (!REGISTRY.length) fail('public/data/modules-registry.json: no `modules` array, or it is empty');
  if (raw.orphanedSkills !== undefined && !Array.isArray(raw.orphanedSkills)) {
    fail('public/data/modules-registry.json: `orphanedSkills` must be an array');
  } else {
    ORPHANED = Array.isArray(raw.orphanedSkills) ? raw.orphanedSkills : [];
  }
} catch (e) {
  fail(`public/data/modules-registry.json: not valid JSON — ${e.message}`);
}
const TYPES = new Set(['game', 'lab', 'challenge']);
const seenIds = new Set();
for (const m of REGISTRY) {
  if (!m.id) { fail('registry: an entry has no id'); continue; }
  if (seenIds.has(m.id)) fail(`registry: duplicate id "${m.id}"`);
  seenIds.add(m.id);
  if (!TYPES.has(m.type)) fail(`registry: "${m.id}" has unknown type "${m.type}"`);
  if (!m.name) fail(`registry: "${m.id}" has no name`);
  if (!['reviewed', 'draft'].includes(m.status)) fail(`registry: "${m.id}" status must be "reviewed" or "draft", got "${m.status}"`);
  if (!Array.isArray(m.skillTags)) fail(`registry: "${m.id}" skillTags must be an array`);
  // A game routes ACROSS packs depending on which skill a student is weak in, so it belongs
  // to none. This is load-bearing, not cosmetic: skill-routing.js uses the calling game's
  // default destination for its pack tie-break precisely because the game has no pack.
  if (m.type === 'game' && m.pack !== null) fail(`registry: game "${m.id}" must have pack: null (got ${JSON.stringify(m.pack)})`);
  if (m.type !== 'game' && !m.retired && !m.pack) fail(`registry: "${m.id}" is a ${m.type} with no pack`);
  if (m.pack && !PACKS[m.pack]) fail(`registry: "${m.id}" has unknown pack "${m.pack}"`);
  if (m.retired) {
    if (m.url) fail(`registry: retired "${m.id}" should have url: null — it has no live page`);
    continue;
  }
  if (!m.url) fail(`registry: "${m.id}" has no url`);
  else {
    if (/^https?:\/\//.test(m.url)) fail(`registry: "${m.id}" url is absolute ("${m.url}") — module URLs must be site-relative so preview channels stay on the preview`);
    if (!/\/$/.test(m.url) || /index\.html/.test(m.url)) fail(`registry: "${m.id}" url "${m.url}" is not the trailing-slash directory form`);
    if (!fs.existsSync(path.join(root, 'public', m.url, 'index.html'))) fail(`registry: "${m.id}" url "${m.url}" has no index.html`);
  }
  for (const t of m.skillTags || []) {
    if (!t || !t.framework || !t.code) fail(`registry: "${m.id}" has a skillTag missing framework or code`);
    if (t.status && !['reviewed', 'draft'].includes(t.status)) fail(`registry: "${m.id}" skillTag "${t.code}" has an invalid status "${t.status}"`);
    // An internal tag is a ROUTING decision — it can send a student to a different lab in a
    // different pack. `reputation` was placed on Social Intelligence by content-similarity
    // judgment, with nothing recording why, and The Rumor Mill routed there on staging.
    // Social Intelligence does not teach reputational harm. A placement nobody can cite is a
    // placement nobody can review, so an uncited one is a build failure, not a style note.
    if (t.framework === 'internal' && !(t.evidence && String(t.evidence).trim().length > 30)) {
      fail(`registry: "${m.id}" internal skillTag "${t.code}" has no \`evidence\` — cite the shipped routing or the coverage-map Case this placement rests on`);
    }
  }
}
const byId = Object.fromEntries(REGISTRY.map(m => [m.id, m]));
const registry = REGISTRY.filter(m => !m.retired && (m.type === 'lab' || m.type === 'challenge'))
  .map(m => ({ id: m.id, name: m.name, category: m.type, pack: m.pack, url: m.url, gameNames: m.gameNames || [] }));
const dashLabs = registry.filter(r => r.category === 'lab');
const games = REGISTRY.filter(m => m.type === 'game');
if (games.length !== 4) fail(`registry: expected the four standalone games, found ${games.length}`);

// --- internal skill tags: a game must never route to nothing.
// skill-routing.js falls back to the game's own default when a category matches no lab, so
// a missing tag is silent — the routing simply stops adapting. Caught here instead.
const norm = (c) => String(c == null ? '' : c).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const labTagIndex = {};
for (const m of REGISTRY) {
  if (m.type !== 'lab' || m.retired) continue;
  for (const t of m.skillTags || []) if (t.framework === 'internal') (labTagIndex[norm(t.code)] ||= []).push(m.id);
}
// The ONE exception is a skill on `orphanedSkills`: a gap we have decided to carry and
// said so in the registry. That is a warning on every run, never a silent pass — see the
// ORPHANED SKILLS note in the registry's own _comment block.
const orphanIndex = {};
for (const o of ORPHANED) {
  if (!o || typeof o !== 'object') { fail('registry: an `orphanedSkills` entry is not an object'); continue; }
  const code = norm(o.tag);
  if (!code) { fail('registry: an `orphanedSkills` entry has no `tag`'); continue; }
  if (orphanIndex[code]) fail(`registry: \`orphanedSkills\` lists "${o.tag}" twice`);
  // An orphan entry is a debt record, so it must say when and why — the same standard the
  // `evidence` rule holds a placement to. A bare tag would be an ignore file.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(o.since || ''))) fail(`registry: \`orphanedSkills\` entry "${o.tag}" needs a \`since\` date (YYYY-MM-DD)`);
  if (!(o.reason && String(o.reason).trim().length > 30)) fail(`registry: \`orphanedSkills\` entry "${o.tag}" needs a \`reason\` saying what decision is pending`);
  orphanIndex[code] = o;
  // The list must not outlive the gap. Once a lab teaches the skill the entry is stale and
  // would mask the next real break of the same tag, so removing it is a build requirement.
  if (labTagIndex[code]) fail(`registry: \`orphanedSkills\` lists "${o.tag}" but ${labTagIndex[code].join(', ')} now carries that tag — remove the orphan entry, the gap is closed`);
}
const diagnosedCodes = new Set();
for (const g of games) {
  for (const t of g.skillTags || []) {
    if (t.framework !== 'internal') continue;
    const code = norm(t.code);
    diagnosedCodes.add(code);
    if (labTagIndex[code]) continue;
    const orphan = orphanIndex[code];
    if (!orphan) {
      fail(`registry: game "${g.id}" routes by "${t.code}" but no lab carries that internal skill tag — skill-routing.js would silently fall back. If this gap is known and intentional, add "${norm(t.code)}" to \`orphanedSkills\` in the registry with a \`since\` date and a \`reason\`.`);
      continue;
    }
    warn(`ORPHANED SKILL: game "${g.id}" diagnoses "${t.code}" and NO GoodBlock teaches it. `
      + `Students weak in it fall through to ${g.id}'s own default destination. `
      + `Orphaned since ${orphan.since}: ${String(orphan.reason).trim()}`);
  }
}
// A tag listed as orphaned that no game diagnoses either is not a build break — a skill can
// sit in the Dictionary before any game diagnoses it — but it is not the gap this list is
// for, so say so rather than letting the entry sit unexamined.
for (const o of ORPHANED) {
  const code = norm(o && o.tag);
  if (code && !labTagIndex[code] && !diagnosedCodes.has(code)) {
    warn(`ORPHANED SKILL: "${o.tag}" is on \`orphanedSkills\` but no game diagnoses it and no GoodBlock teaches it — nothing routes by it at all. Check the entry is still the record you want.`);
  }
}
// Every category actually present in a game's scenario bank must be a declared skill tag —
// a category invented in the bank and never registered routes nowhere, which is the exact
// shape of the Before You Send bug (30 scenarios, one flat `social`).
const GAME_PAGES = Object.fromEntries(games.map(g => [g.id, path.join('public', g.url, 'index.html')]));
for (const g of games) {
  const src = read(GAME_PAGES[g.id]);
  const declared = new Set((g.skillTags || []).filter(t => t.framework === 'internal').map(t => norm(t.code)));
  const used = new Set([...src.matchAll(/\bcategory:\s*["']([^"']+)["']/g)].map(m => norm(m[1])));
  for (const c of used) if (!declared.has(c)) fail(`registry: "${g.id}" has scenarios tagged "${c}" but its skillTags do not declare it`);
}

// --- dashboard: it reads the registry now, so what is checked is that it still does
const dash = read('public/dashboard/index.html');
if (!/fetch\('\/data\/modules-registry\.json'/.test(dash)) fail('dashboard: no longer fetches /data/modules-registry.json — MODULE_REGISTRY must come from the shared registry');
if (/const MODULE_REGISTRY = \[/.test(dash)) fail('dashboard: MODULE_REGISTRY is a hardcoded array again — it must be derived from the shared registry');
const plannedByPack = {};
for (const [pack, cfg] of Object.entries(PACKS)) {
  plannedByPack[pack] = [...((dash.match(new RegExp(`const ${cfg.plannedConst} = \\[([^\\]]*)\\]`)) || ['', ''])[1]).matchAll(/'([^']*)'/g)].map(x => x[1]);
  if (!plannedByPack[pack].length) fail(`dashboard: ${cfg.plannedConst} not found or empty`);
  if (!new RegExp(`'${pack}':\\s*\\{[^}]*planned:\\s*${cfg.plannedConst}`).test(dash)) fail(`dashboard: LAB_PACKS['${pack}'] does not use ${cfg.plannedConst}`);
}
for (const lab of dashLabs) {
  const cfg = PACKS[lab.pack]; if (!cfg) continue;
  if (!plannedByPack[lab.pack].includes(lab.name)) fail(`dashboard: live lab "${lab.name}" is not in ${cfg.plannedConst}`);
  if (!new RegExp(`^${cfg.hubPrefix.replace(/\//g, '\\/')}[a-z0-9-]+\\/$`).test(lab.url)) fail(`registry: lab "${lab.name}" url "${lab.url}" is not under ${cfg.hubPrefix}`);
}
// Each Challenge's completion predicate lives in the dashboard's MODULE_COMPLETION map
// (JSON cannot hold a function); its threshold must still be the registry's badgeThreshold.
for (const ch of registry.filter(r => r.category === 'challenge')) {
  const entry = (dash.match(new RegExp(`'${ch.id}':\\s*\\(d\\) =>[^\\n]*`)) || [])[0];
  if (!entry) { fail(`dashboard: MODULE_COMPLETION has no predicate for challenge "${ch.id}"`); continue; }
  const predThreshold = Number((entry.match(/finalScore >= (\d+)/) || [])[1]);
  const declared = byId[ch.id].badgeThreshold;
  if (predThreshold && declared && predThreshold !== declared) fail(`dashboard: challenge "${ch.id}" isComplete uses >= ${predThreshold} but the registry badgeThreshold is ${declared}`);
}
if (/labpack-status-pill[^>]*>\s*Social Intelligence Live/.test(dash)) fail('dashboard: status pill still hardcodes "Social Intelligence Live"');
for (const cfg of Object.values(PACKS)) {
  // Each pack's card must exist on the dashboard with the ids LAB_PACKS wires up.
  const m = dash.match(new RegExp(`planned:\\s*${cfg.plannedConst},\\s*pillId:\\s*'([^']+)',\\s*counterId:\\s*'([^']+)',\\s*durationId:\\s*'([^']+)'`));
  if (!m) { fail(`dashboard: LAB_PACKS entry for ${cfg.plannedConst} not found`); continue; }
  for (const id of [m[1], m[2], m[3]]) if (!dash.includes(`id="${id}"`)) fail(`dashboard: LAB_PACKS references #${id} but no element has that id`);
}

// --- insider
const insider = read('public/insider/index.html');
const coursesSrc = (insider.match(/const COURSES = \[([\s\S]*?)\n\s*\];/) || [])[1];
if (!coursesSrc) fail('insider: COURSES not found');
const courses = [];
for (const m of (coursesSrc || '').matchAll(/id:\s*'([^']+)',\s*name:\s*(?:'([^']*)'|"([^"]*)"),\s*category:\s*(?:'([^']*)'|"([^"]*)"),\s*gameNames:\s*\[([^\]]*)\][\s\S]*?stepsTotal:\s*(\d+),\s*stepLabel:\s*'([^']*)'/g)) {
  courses.push({ id: m[1], name: m[2] ?? m[3], category: m[4] ?? m[5], gameNames: [...m[6].matchAll(/'([^']*)'/g)].map(x => x[1]), stepsTotal: Number(m[7]), stepLabel: m[8] });
}
const insiderLabs = courses.filter(c => /lab/i.test(c.category));
for (const lab of dashLabs) {
  const c = insiderLabs.find(x => x.id === lab.id);
  if (!c) { fail(`insider: no COURSES entry with id "${lab.id}" (the registry has it)`); continue; }
  if (c.name !== lab.name) fail(`insider: "${lab.id}" name "${c.name}" != registry "${lab.name}"`);
  if (JSON.stringify(c.gameNames) !== JSON.stringify(lab.gameNames)) fail(`insider: "${lab.id}" gameNames ${JSON.stringify(c.gameNames)} != registry ${JSON.stringify(lab.gameNames)}`);
}
for (const c of insiderLabs) if (!dashLabs.find(l => l.id === c.id)) fail(`registry: no entry with id "${c.id}" (Insider's COURSES has it)`);
// Challenges: Insider must know every Challenge the dashboard lists, by the same gameName.
for (const ch of registry.filter(r => r.category === 'challenge')) {
  const c = courses.find(x => JSON.stringify(x.gameNames) === JSON.stringify(ch.gameNames) || x.gameNames.includes(ch.gameNames[0]));
  if (!c) fail(`insider: no COURSES entry for challenge "${ch.name}" (gameNames ${JSON.stringify(ch.gameNames)}) — the registry has it`);
}

// --- each module page's Telemetry.init
// Retired courses stay in Insider's COURSES (historical analytics on real past data), but
// have no live page left to check Telemetry.init against — skip them here instead of
// failing on a page that was deliberately deleted.
const RETIRED_NO_LIVE_PAGE = ['jolenes-lemonade'];
const modulePages = { ...Object.fromEntries(dashLabs.map(l => [l.id, path.join('public', l.url, 'index.html')])) };
for (const cfg of Object.values(PACKS)) {
  // The Insider id for a Challenge is what its page's Telemetry.init({ module }) says.
  const src = read(cfg.challengePage);
  const m = src.match(/Telemetry\.init\(\{\s*module:\s*'([^']+)'/);
  if (m) modulePages[m[1]] = cfg.challengePage;
}
for (const c of courses) {
  if (RETIRED_NO_LIVE_PAGE.includes(c.id)) continue;
  const page = modulePages[c.id];
  if (!page) { fail(`insider: course "${c.id}" has no known page to check Telemetry.init against`); continue; }
  const src = read(page);
  const m = src.match(/Telemetry\.init\(\{\s*module:\s*'([^']+)',\s*gameName:\s*'([^']+)',\s*stepsTotal:\s*(\d+)/);
  if (!m) { fail(`${page}: no Telemetry.init({ module, gameName, stepsTotal }) call found`); continue; }
  if (m[1] !== c.id) fail(`${page}: Telemetry module "${m[1]}" != Insider id "${c.id}"`);
  if (!c.gameNames.includes(m[2])) fail(`${page}: Telemetry gameName "${m[2]}" not in Insider gameNames ${JSON.stringify(c.gameNames)}`);
  if (Number(m[3]) !== c.stepsTotal) fail(`${page}: Telemetry stepsTotal ${m[3]} != Insider stepsTotal ${c.stepsTotal}`);
}

// --- the four games' Telemetry.init
// Games were in none of the lists this script used to check, so nothing verified that a
// game announced itself to the shared telemetry pipe under the id the registry knows it by.
// Mission Control reads a game's sessions by exactly that module id, so a mismatch would
// silently empty a teacher's per-game roster.
for (const g of games) {
  const page = GAME_PAGES[g.id];
  const src = read(page);
  // Unlike a GoodBlock, a game's stepsTotal is its round size, which some games hold in a
  // named constant — accept either and resolve the constant, rather than forcing a magic
  // number into the call just to satisfy a regex.
  const m = src.match(/Telemetry\.init\(\{\s*module:\s*'([^']+)',\s*gameName:\s*'([^']+)',\s*stepsTotal:\s*([A-Za-z_$][\w$]*|\d+)/);
  if (!m) { fail(`${page}: no Telemetry.init({ module, gameName, stepsTotal }) call found`); continue; }
  if (m[1] !== g.id) fail(`${page}: Telemetry module "${m[1]}" != registry id "${g.id}"`);
  if (m[2] !== g.name) fail(`${page}: Telemetry gameName "${m[2]}" != registry name "${g.name}"`);
  const steps = /^\d+$/.test(m[3]) ? Number(m[3]) : Number((src.match(new RegExp(`const ${m[3]} = (\\d+);`)) || [])[1]);
  if (!steps) fail(`${page}: Telemetry stepsTotal "${m[3]}" is not a number and no \`const ${m[3]} = N;\` was found`);
  if (!/src="\/js\/telemetry\.js"/.test(src)) fail(`${page}: calls Telemetry.init but never loads /js/telemetry.js`);
  if (!/src="\/js\/skill-routing\.js"/.test(src)) fail(`${page}: does not load /js/skill-routing.js — its end-screen destination would stay hardcoded`);
  // The retired collection must not come back, in a game or anywhere else.
  if (/'game_sessions'/.test(src)) fail(`${page}: still writes to the retired root-level game_sessions collection`);
}
if (/match \/game_sessions\//.test(read('firestore.rules'))) fail('firestore.rules: a game_sessions match block is back — that collection is retired');

// --- hubs (one per pack)
// Each hub renders its live lab cards and its "Jump to a Lab" entries from the registry
// filtered by pack, so there are no hardcoded card names left to cross-check. What is
// checked instead is that the wiring is still in place: the fetch, the two anchors the
// cards are inserted at, and the pack the hub filters to. Plus the things that stay
// hand-written on a hub — the pack's Challenge card, and a Coming Soon placeholder for any
// planned-but-unbuilt lab.
for (const [pack, cfg] of Object.entries(PACKS)) {
  const hub = read(cfg.hub).replace(/&amp;/g, '&');
  if (!/fetch\('\/data\/modules-registry\.json'/.test(hub)) fail(`${cfg.hub}: does not fetch /data/modules-registry.json — lab cards must come from the shared registry`);
  if (!new RegExp(`const PACK = '${pack}'`).test(hub)) fail(`${cfg.hub}: does not filter the registry to PACK = '${pack}'`);
  for (const id of ['lab-cards-anchor', 'lab-menu-anchor']) {
    if (!hub.includes(`id="${id}"`)) fail(`${cfg.hub}: missing #${id} — the registry-rendered cards have nowhere to be inserted`);
  }
  const packLabs = dashLabs.filter(l => l.pack === pack);
  if (!packLabs.length) fail(`registry: pack "${pack}" has no live labs`);
  for (const name of plannedByPack[pack]) {
    const isLive = packLabs.some(l => l.name === name);
    // A live lab's card is rendered from the registry, so its name is no longer expected in
    // the hub's markup at all — only a NOT-live one still needs a hand-written placeholder.
    const placeholder = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,400}?Coming Soon`).test(hub);
    if (isLive && placeholder) fail(`${cfg.hub}: "${name}" is live but still has a Coming Soon placeholder`);
    if (!isLive && !placeholder) fail(`${cfg.hub}: "${name}" is not live and has no Coming Soon placeholder`);
  }
  // The pack's Challenge is hand-written on the hub and must still be launchable from it.
  const ch = registry.find(r => r.id === cfg.challengeId);
  if (ch && !hub.includes(`'${ch.url}'`)) fail(`${cfg.hub}: does not launch the pack's Challenge at "${ch.url}"`);
  // Every remaining hand-written launch URL is trailing-slash form.
  for (const m of hub.matchAll(/launchLab\('[^']+',\s*'([^']+)'\)/g)) if (!/\/$/.test(m[1]) || /index\.html/.test(m[1])) fail(`${cfg.hub}: launch url "${m[1]}" is not the trailing-slash form`);
}

// --- badge counts vs the pack's Challenge SCENARIO_DATA
for (const [pack, cfg] of Object.entries(PACKS)) {
  const src = read(cfg.challengePage);
  const dataSrc = (src.match(/const SCENARIO_DATA = \[([\s\S]*?)\n\s*\];/) || [])[1] || '';
  const counts = {};
  for (const m of dataSrc.matchAll(/cat:\s*'([a-z_]+)'/g)) counts[m[1]] = (counts[m[1]] || 0) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const declared = Number((src.match(/const TOTAL_SCENARIOS = (\d+);/) || [])[1]);
  if (declared !== total) fail(`${cfg.challengePage}: TOTAL_SCENARIOS ${declared} != ${total} scenarios in SCENARIO_DATA`);
  const maxScore = Number((src.match(/const MAX_SCORE = (\d+);/) || [])[1]);
  if (maxScore !== total * 3) fail(`${cfg.challengePage}: MAX_SCORE ${maxScore} != ${total} x 3`);
  const counted = (src.match(/id="hud-score">0<\/span>\s*<span[^>]*>\/ (\d+)<\/span>/) || [])[1];
  if (counted && Number(counted) !== maxScore) fail(`${cfg.challengePage}: HUD reads "/ ${counted}" but MAX_SCORE is ${maxScore}`);
  for (const [labId, cat] of Object.entries(cfg.badgeCategory)) {
    const lab = dashLabs.find(l => l.id === labId);
    if (!lab) continue;
    const page = read(modulePages[labId]);
    const badge = (page.match(/<strong>(\d+) scenarios<\/strong>/) || [])[1];
    if (!badge) { fail(`${modulePages[labId]}: no "<strong>N scenarios</strong>" badge line found`); continue; }
    if (Number(badge) !== (counts[cat] || 0)) fail(`${modulePages[labId]}: badge says ${badge} scenarios but ${cfg.challengePage} has ${counts[cat] || 0} with cat '${cat}'`);
    const completedLine = (page.match(/(\d+) scenarios completed/) || [])[1];
    if (completedLine && Number(completedLine) !== (counts[cat] || 0)) fail(`${modulePages[labId]}: "${completedLine} scenarios completed" but the real count is ${counts[cat] || 0}`);
  }
}

// --- Challenge cards on the dashboard: every Challenge in the registry gets a standalone
// card at the same level, and its numbers must match the Challenge page it represents.
// (The Real World Ready Challenge shipped reachable only through its Lab Pack hub once.)
for (const [pack, cfg] of Object.entries(PACKS)) {
  const ch = registry.find(r => r.id === cfg.challengeId);
  if (!ch) { fail(`registry: no entry for challenge "${cfg.challengeId}"`); continue; }
  const threshold = byId[ch.id].badgeThreshold;
  const maxScore = byId[ch.id].maxScore;
  const page = read(cfg.challengePage);
  const pageThreshold = Number((page.match(/const BADGE_THRESHOLD = (\d+);/) || [])[1]);
  const pageMax = Number((page.match(/const MAX_SCORE = (\d+);/) || [])[1]);
  if (!threshold) fail(`registry: challenge "${ch.id}" has no badgeThreshold`);
  else if (threshold !== pageThreshold) fail(`registry: challenge "${ch.id}" badgeThreshold ${threshold} != ${cfg.challengePage} BADGE_THRESHOLD ${pageThreshold}`);
  if (!maxScore) fail(`registry: challenge "${ch.id}" has no maxScore`);
  else if (maxScore !== pageMax) fail(`registry: challenge "${ch.id}" maxScore ${maxScore} != ${cfg.challengePage} MAX_SCORE ${pageMax}`);
  // The standalone card: its own launchCourse call plus the elements the status loop writes.
  if (!dash.includes(`window.launchCourse('${ch.name}', '${ch.url}'`)) fail(`dashboard: no standalone Challenges-tab card launching "${ch.name}" at "${ch.url}"`);
  for (const id of [`${ch.id}-status-badge`, `${ch.id}-best-score`]) {
    if (!dash.includes(`id="${id}"`)) fail(`dashboard: challenge "${ch.id}" card is missing #${id} (CHALLENGE_CARDS writes it)`);
  }
  if (!dash.includes(`data-duration-for="${ch.id}"`)) fail(`dashboard: challenge "${ch.id}" card has no data-duration-for="${ch.id}"`);
}

// --- docs table
const doc = read('docs/insider-analytics.md');
const table = (doc.match(/Steps per module:[\s\S]*?\n\n(\|[\s\S]*?)\n\n/) || [])[1] || '';
const rows = [...table.matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|$/gm)].map(m => ({ name: m[1], unit: m[2], total: Number(m[3]) }));
if (!rows.length) fail('docs/insider-analytics.md: "Steps per module" table not found');
for (const c of courses) {
  const r = rows.find(x => x.name === c.name);
  if (!r) { fail(`docs/insider-analytics.md: no "Steps per module" row for "${c.name}"`); continue; }
  if (r.total !== c.stepsTotal) fail(`docs/insider-analytics.md: "${c.name}" total ${r.total} != Insider stepsTotal ${c.stepsTotal}`);
  if (r.unit !== c.stepLabel) fail(`docs/insider-analytics.md: "${c.name}" unit "${r.unit}" != Insider stepLabel "${c.stepLabel}"`);
}
for (const r of rows) if (!courses.find(c => c.name === r.name)) fail(`docs/insider-analytics.md: row "${r.name}" has no Insider COURSES entry`);

// --- Message HQ: loading message-hq.js with no navbar button wired to it is a silent no-op
// (Privacy & Security shipped this way once already, and Professional Brand repeated it —
// the checklist item existed but nothing enforced it). A module that never loads the script
// at all is out of scope here; one that loads it MUST also call openMessageModal() somewhere.
for (const [id, page] of Object.entries(modulePages)) {
  const src = read(page);
  const loadsMessageHQ = /src="\/js\/message-hq\.js"/.test(src);
  const callsOpenModal = /window\.openMessageModal\(\)/.test(src);
  if (loadsMessageHQ && !callsOpenModal) fail(`${page}: loads message-hq.js but no navbar button calls window.openMessageModal() — Message HQ is unreachable`);
  // The `const unsub = onAuthStateChanged(...)` TDZ bug — see the integration checklist.
  if (/const unsub = window\.AuthCore\.onAuthStateChanged/.test(src) && !/let unsub;/.test(src)) fail(`${page}: uses "const unsub = onAuthStateChanged(...)" — must be "let unsub; unsub = ..." (see docs/goodblock-integration-checklist.md)`);
  // Absolute production URLs on exits throw a student off a preview channel.
  if (/location\.href\s*=\s*["']https:\/\/www\.allgoodacademy\.com["']/.test(src)) fail(`${page}: exits to the absolute production URL — use '/' so preview channels stay on the preview`);
  // A "scenario" page label collides with the Challenge unit (every page is a Case).
  if (/<span[^>]*tracking-widest[^>]*>\s*Scenario \d/.test(src)) fail(`${page}: a page label reads "Scenario N" — page labels are "Case N"; "scenario" is reserved for Challenge items`);
  if (/tracking-widest[^>]*>Before We Start</.test(src)) fail(`${page}: intro label still reads "Before We Start" — every page is a Case, numbered from 1`);
}

// Mission Control renders the words a student saw from public/mission-control/module-data.js,
// which is generated from SCENARIO_DATA / CASE_TITLES / CASE_CHOICES. If those arrays are
// edited and the file isn't rebuilt, the dashboard keeps attributing the OLD sentence to a
// student's stored choiceIndex — wrong, and silently so. Rebuild rather than hand-edit.
try {
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'build-mission-control-data.js'), '--check'], { stdio: 'pipe' });
} catch (e) {
  fail('public/mission-control/module-data.js is stale or invalid — run: node scripts/build-mission-control-data.js'
    + ((e.stderr && e.stderr.toString().trim()) ? `\n     (${e.stderr.toString().trim().split('\n')[0]})` : ''));
}

// Printed BEFORE the pass/fail verdict and to stderr, so a warning cannot scroll off behind
// a green OK line or be swallowed by a CI step that only echoes the last line.
if (warnings.length) {
  const bar = '='.repeat(78);
  console.error(`\n${bar}\ncheck-modules: ${warnings.length} WARNING(S) — build not failed, but read these\n${bar}`);
  for (const w of warnings) console.error(` !  ${w}`);
  console.error(`${bar}\n`);
}
if (problems.length) {
  console.error(`check-modules: ${problems.length} problem(s)\n - ` + problems.join('\n - '));
  process.exit(1);
}
const internalTags = new Set(Object.keys(labTagIndex));
console.log(`check-modules: ${warnings.length ? `OK with ${warnings.length} warning(s) above` : 'OK'} — ${REGISTRY.length} registry entries (${games.length} games, ${dashLabs.length} live labs across ${Object.keys(PACKS).length} packs, ${registry.filter(r => r.category === 'challenge').length} Challenges), ${internalTags.size} internal skill tags routable, ${courses.length} Insider courses and ${rows.length} doc rows all agree with the registry.`);
