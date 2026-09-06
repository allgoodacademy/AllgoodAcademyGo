#!/usr/bin/env node
// Cross-checks the hand-maintained module lists so they can't drift apart silently:
//   - MODULE_REGISTRY + LAB_PACK_PLANNED in public/index.html (dashboard)
//   - COURSES in public/insider/index.html (Insider analytics)
//   - live cards / coming-soon placeholders in public/jsh/digital-decisions-lab/index.html (hub)
//   - the "Steps per module" table in docs/insider-analytics.md
//   - each module page's Telemetry.init({ gameName, stepsTotal }) call
// No dependencies; run with `node scripts/check-modules.js`. Exits 1 on any mismatch.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const problems = [];
const fail = (msg) => problems.push(msg);

// --- dashboard
const dash = read('public/index.html');
const registrySrc = (dash.match(/const MODULE_REGISTRY = \[([\s\S]*?)\n\s*\];/) || [])[1];
if (!registrySrc) fail('dashboard: MODULE_REGISTRY not found');
const registry = [];
for (const m of (registrySrc || '').matchAll(/\{\s*id:\s*'([^']+)',\s*name:\s*(?:'([^']*)'|"([^"]*)"),\s*category:\s*'([^']+)',\s*url:\s*'([^']+)',\s*gameNames:\s*\[([^\]]*)\]/g)) {
  registry.push({ id: m[1], name: m[2] ?? m[3], category: m[4], url: m[5], gameNames: [...m[6].matchAll(/'([^']*)'/g)].map(x => x[1]) });
}
const planned = [...((dash.match(/const LAB_PACK_PLANNED = \[([^\]]*)\]/) || ['', ''])[1]).matchAll(/'([^']*)'/g)].map(x => x[1]);
if (!planned.length) fail('dashboard: LAB_PACK_PLANNED not found or empty');
const dashLabs = registry.filter(r => r.category === 'lab');
for (const lab of dashLabs) {
  if (!planned.includes(lab.name)) fail(`dashboard: live lab "${lab.name}" is not in LAB_PACK_PLANNED`);
  if (!/^\/jsh\/digital-decisions-lab\/[a-z0-9-]+\/$/.test(lab.url)) fail(`dashboard: lab "${lab.name}" url "${lab.url}" is not a trailing-slash directory path`);
  if (!fs.existsSync(path.join(root, 'public', lab.url, 'index.html'))) fail(`dashboard: lab "${lab.name}" url "${lab.url}" has no index.html`);
}
if (/labpack-status-pill[^>]*>\s*Social Intelligence Live/.test(dash)) fail('dashboard: status pill still hardcodes "Social Intelligence Live"');

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

// --- each module page's Telemetry.init
const modulePages = { ...Object.fromEntries(dashLabs.map(l => [l.id, path.join('public', l.url, 'index.html')])),
  'digital-decisions': 'public/educational-games/digital-decisions/index.html',
  'jolenes-lemonade': 'public/educational-games/jolenes-lemonade-challenge/index.html' };
for (const c of courses) {
  const page = modulePages[c.id];
  if (!page) { fail(`insider: course "${c.id}" has no known page to check Telemetry.init against`); continue; }
  const src = read(page);
  const m = src.match(/Telemetry\.init\(\{\s*module:\s*'([^']+)',\s*gameName:\s*'([^']+)',\s*stepsTotal:\s*(\d+)/);
  if (!m) { fail(`${page}: no Telemetry.init({ module, gameName, stepsTotal }) call found`); continue; }
  if (m[1] !== c.id) fail(`${page}: Telemetry module "${m[1]}" != Insider id "${c.id}"`);
  if (!c.gameNames.includes(m[2])) fail(`${page}: Telemetry gameName "${m[2]}" not in Insider gameNames ${JSON.stringify(c.gameNames)}`);
  if (Number(m[3]) !== c.stepsTotal) fail(`${page}: Telemetry stepsTotal ${m[3]} != Insider stepsTotal ${c.stepsTotal}`);
}

// --- hub
const hub = read('public/jsh/digital-decisions-lab/index.html').replace(/&amp;/g, '&');
const hubLive = [...hub.matchAll(/launchLab\('([^']+)',\s*'(\/jsh\/digital-decisions-lab\/[^']+)'\)/g)].map(m => ({ name: m[1].replace(/&amp;/g, '&'), url: m[2] }));
for (const lab of dashLabs) {
  const card = hubLive.find(h => h.url === lab.url);
  if (!card) fail(`hub: no live card launching "${lab.url}" (dashboard lists "${lab.name}" as live)`);
  else if (card.name !== lab.name) fail(`hub: card name "${card.name}" != dashboard "${lab.name}"`);
}
for (const h of hubLive) if (!dashLabs.find(l => l.url === h.url)) fail(`dashboard: hub launches "${h.url}" but MODULE_REGISTRY has no lab with that url`);
for (const name of planned) {
  if (!hub.includes(name)) fail(`hub: planned lab "${name}" appears nowhere on the hub (needs a live card or a Coming Soon placeholder)`);
  const isLive = dashLabs.some(l => l.name === name);
  const placeholder = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,400}?Coming Soon`).test(hub);
  if (isLive && placeholder) fail(`hub: "${name}" is live but still has a Coming Soon placeholder`);
  if (!isLive && !placeholder) fail(`hub: "${name}" is not live and has no Coming Soon placeholder`);
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
for (const lab of dashLabs) {
  const page = modulePages[lab.id];
  if (!page) continue;
  const src = read(page);
  const loadsMessageHQ = /src="\/js\/message-hq\.js"/.test(src);
  const callsOpenModal = /window\.openMessageModal\(\)/.test(src);
  if (loadsMessageHQ && !callsOpenModal) fail(`${page}: loads message-hq.js but no navbar button calls window.openMessageModal() — Message HQ is unreachable`);
}

if (problems.length) {
  console.error(`check-modules: ${problems.length} problem(s)\n - ` + problems.join('\n - '));
  process.exit(1);
}
console.log(`check-modules: OK — ${registry.length} dashboard modules (${dashLabs.length} live labs of ${planned.length} planned), ${courses.length} Insider courses, ${hubLive.length} hub cards, ${rows.length} doc rows all agree.`);
