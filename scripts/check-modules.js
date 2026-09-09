#!/usr/bin/env node
// Cross-checks the hand-maintained module lists so they can't drift apart silently:
//   - MODULE_REGISTRY (+ its `pack` field), LAB_PACK_PLANNED / RWR_PACK_PLANNED in public/index.html
//   - COURSES in public/insider/index.html (Insider analytics)
//   - live cards / coming-soon placeholders on EACH Lab Pack hub:
//       public/jsh/digital-decisions-lab/index.html and public/jsh/real-world-ready-lab/index.html
//   - the "Steps per module" table in docs/insider-analytics.md
//   - each module page's Telemetry.init({ module, gameName, stepsTotal }) call
//   - each lab's completion-badge "N scenarios" figure vs the real category count in its
//     pack's Challenge SCENARIO_DATA (the Privacy & Security "9 vs 8" bug class)
// No dependencies; run with `node scripts/check-modules.js`. Exits 1 on any mismatch.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const problems = [];
const fail = (msg) => problems.push(msg);

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
};

// --- dashboard
const dash = read('public/index.html');
const registrySrc = (dash.match(/const MODULE_REGISTRY = \[([\s\S]*?)\n\s*\];/) || [])[1];
if (!registrySrc) fail('dashboard: MODULE_REGISTRY not found');
const registry = [];
for (const m of (registrySrc || '').matchAll(/\{\s*id:\s*'([^']+)',\s*name:\s*(?:'([^']*)'|"([^"]*)"),\s*category:\s*'([^']+)',\s*pack:\s*'([^']+)',\s*url:\s*'([^']+)',\s*gameNames:\s*\[([^\]]*)\]/g)) {
  registry.push({ id: m[1], name: m[2] ?? m[3], category: m[4], pack: m[5], url: m[6], gameNames: [...m[7].matchAll(/'([^']*)'/g)].map(x => x[1]) });
}
const entryCount = ((registrySrc || '').match(/\{\s*id:/g) || []).length;
if (entryCount !== registry.length) fail(`dashboard: ${entryCount} MODULE_REGISTRY entries but only ${registry.length} parsed — every entry needs id, name, category, pack, url, gameNames in that order`);
for (const r of registry) if (!PACKS[r.pack]) fail(`dashboard: "${r.id}" has unknown pack "${r.pack}"`);
const dashLabs = registry.filter(r => r.category === 'lab');
const plannedByPack = {};
for (const [pack, cfg] of Object.entries(PACKS)) {
  plannedByPack[pack] = [...((dash.match(new RegExp(`const ${cfg.plannedConst} = \\[([^\\]]*)\\]`)) || ['', ''])[1]).matchAll(/'([^']*)'/g)].map(x => x[1]);
  if (!plannedByPack[pack].length) fail(`dashboard: ${cfg.plannedConst} not found or empty`);
  if (!new RegExp(`'${pack}':\\s*\\{[^}]*planned:\\s*${cfg.plannedConst}`).test(dash)) fail(`dashboard: LAB_PACKS['${pack}'] does not use ${cfg.plannedConst}`);
}
for (const lab of dashLabs) {
  const cfg = PACKS[lab.pack]; if (!cfg) continue;
  if (!plannedByPack[lab.pack].includes(lab.name)) fail(`dashboard: live lab "${lab.name}" is not in ${cfg.plannedConst}`);
  if (!new RegExp(`^${cfg.hubPrefix.replace(/\//g, '\\/')}[a-z0-9-]+\\/$`).test(lab.url)) fail(`dashboard: lab "${lab.name}" url "${lab.url}" is not a trailing-slash directory path under ${cfg.hubPrefix}`);
  if (!fs.existsSync(path.join(root, 'public', lab.url, 'index.html'))) fail(`dashboard: lab "${lab.name}" url "${lab.url}" has no index.html`);
}
for (const r of registry) if (/^https?:\/\//.test(r.url)) fail(`dashboard: "${r.id}" url is absolute ("${r.url}") — module URLs must be site-relative so preview channels stay on the preview`);
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
  if (!c) { fail(`insider: no COURSES entry with id "${lab.id}" (dashboard has it)`); continue; }
  if (c.name !== lab.name) fail(`insider: "${lab.id}" name "${c.name}" != dashboard "${lab.name}"`);
  if (JSON.stringify(c.gameNames) !== JSON.stringify(lab.gameNames)) fail(`insider: "${lab.id}" gameNames ${JSON.stringify(c.gameNames)} != dashboard ${JSON.stringify(lab.gameNames)}`);
}
for (const c of insiderLabs) if (!dashLabs.find(l => l.id === c.id)) fail(`dashboard: no MODULE_REGISTRY entry with id "${c.id}" (Insider has it)`);
// Challenges: Insider must know every Challenge the dashboard lists, by the same gameName.
for (const ch of registry.filter(r => r.category === 'challenge')) {
  const c = courses.find(x => JSON.stringify(x.gameNames) === JSON.stringify(ch.gameNames) || x.gameNames.includes(ch.gameNames[0]));
  if (!c) fail(`insider: no COURSES entry for challenge "${ch.name}" (gameNames ${JSON.stringify(ch.gameNames)})`);
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

// --- hubs (one per pack)
for (const [pack, cfg] of Object.entries(PACKS)) {
  const hub = read(cfg.hub).replace(/&amp;/g, '&');
  const prefixRe = cfg.hubPrefix.replace(/\//g, '\\/');
  const hubLive = [...hub.matchAll(new RegExp(`launchLab\\('([^']+)',\\s*'(${prefixRe}[^']+)'\\)`, 'g'))].map(m => ({ name: m[1], url: m[2] }));
  const packLabs = dashLabs.filter(l => l.pack === pack);
  for (const lab of packLabs) {
    const cards = hubLive.filter(h => h.url === lab.url);
    if (!cards.length) fail(`${cfg.hub}: no live card launching "${lab.url}" (dashboard lists "${lab.name}" as live)`);
    else if (cards.length < 2) fail(`${cfg.hub}: "${lab.name}" is launched from only one place — needs both the card and the "Jump to a Lab" menu entry`);
    for (const card of cards) if (card.name !== lab.name) fail(`${cfg.hub}: card name "${card.name}" != dashboard "${lab.name}"`);
  }
  for (const h of hubLive) if (!packLabs.find(l => l.url === h.url)) fail(`dashboard: ${cfg.hub} launches "${h.url}" but MODULE_REGISTRY has no lab with that url`);
  for (const name of plannedByPack[pack]) {
    if (!hub.includes(name)) fail(`${cfg.hub}: planned lab "${name}" appears nowhere on the hub (needs a live card or a Coming Soon placeholder)`);
    const isLive = packLabs.some(l => l.name === name);
    const placeholder = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,400}?Coming Soon`).test(hub);
    if (isLive && placeholder) fail(`${cfg.hub}: "${name}" is live but still has a Coming Soon placeholder`);
    if (!isLive && !placeholder) fail(`${cfg.hub}: "${name}" is not live and has no Coming Soon placeholder`);
  }
  // The pack's Challenge must be launchable from its hub too.
  const ch = registry.find(r => r.id === cfg.challengeId);
  if (ch && !hub.includes(`'${ch.url}'`)) fail(`${cfg.hub}: does not launch the pack's Challenge at "${ch.url}"`);
  // Every hub launch URL is trailing-slash form.
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

if (problems.length) {
  console.error(`check-modules: ${problems.length} problem(s)\n - ` + problems.join('\n - '));
  process.exit(1);
}
const hubCards = Object.values(PACKS).reduce((n, cfg) => n + [...read(cfg.hub).matchAll(/launchLab\(/g)].length, 0);
console.log(`check-modules: OK — ${registry.length} dashboard modules (${dashLabs.length} live labs across ${Object.keys(PACKS).length} packs), ${courses.length} Insider courses, ${hubCards} hub launch points, ${rows.length} doc rows all agree.`);
