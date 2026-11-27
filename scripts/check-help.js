#!/usr/bin/env node
/* check-help.js: keeps the Help Center from going stale (storyboard:
 * claude/help-center-storyboard-v1.0.md, "Keeping it from going stale").
 *
 * Help is only useful if it matches the screen. This fails when:
 *   - an article names a button in **bold** that no longer exists anywhere in the dashboard's
 *     source (list it in the article's `dynamic` if the screen builds that label from parts);
 *   - a tour step or shortcut points at something (`check` strings) the source no longer has;
 *   - a success event help listens for is no longer announced (track('x') / agTrack('x'));
 *   - the data is inconsistent (unknown ids, groups, tours, shortcuts, duplicate ids);
 *   - the dashboard stops loading the engine or loses the Comms button the ? sits beside.
 *
 * Run: node scripts/check-help.js   (CI: .github/workflows/module-registry-check.yml)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let failures = 0;
const fail = (msg) => { failures += 1; console.error('✗ ' + msg); };

// help-data.js is an ES module for the browser; evaluate its constants without a bundler.
const dataSrc = read('public/help/help-data.js').replace(/^export const /gm, 'const ') +
    '\n;({ SUCCESS, GROUPS, ARTICLES, ON_VIEW, SHORTCUTS, TOURS });';
const { SUCCESS, GROUPS, ARTICLES, ON_VIEW, SHORTCUTS, TOURS } = vm.runInNewContext(dataSrc, {});

// Everything a teacher or student can see on the dashboard (and the sign-in/setup page).
const SOURCES = [
    'public/dashboard/index.html',
    'public/mission-control/index.html',
    ...fs.readdirSync(path.join(root, 'public/mission-control')).filter((f) => f.endsWith('.js')).map((f) => 'public/mission-control/' + f),
    ...fs.readdirSync(path.join(root, 'public/js')).filter((f) => f.endsWith('.js')).map((f) => 'public/js/' + f),
    'nav/nav.js',
];
const haystack = SOURCES.map(read).join('\n');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"');
const inSource = (needle) => haystack.includes(needle) || decode(haystack).includes(needle);

// --- the data hangs together ---
const ids = new Set();
for (const a of ARTICLES) {
    if (ids.has(a.id)) fail(`help-data: duplicate article id "${a.id}"`);
    ids.add(a.id);
    if (!/^[a-z0-9-]+$/.test(a.id)) fail(`help-data: article id "${a.id}" must be lowercase letters, digits and dashes`);
    if (a.who !== 'teacher' && a.who !== 'student') fail(`help-data: article "${a.id}" has who "${a.who}"`);
    if (!(GROUPS[a.who] || []).includes(a.group)) fail(`help-data: article "${a.id}" is in group "${a.group}", which isn't in GROUPS.${a.who}`);
    if (!Array.isArray(a.steps) || !a.steps.length) fail(`help-data: article "${a.id}" has no steps`);
    if (a.tour && !TOURS[a.tour]) fail(`help-data: article "${a.id}" points at unknown tour "${a.tour}"`);
    for (const s of a.shortcuts || []) if (!SHORTCUTS[s]) fail(`help-data: article "${a.id}" points at unknown shortcut "${s}"`);
    if (a.success && !Object.values(SUCCESS).includes(a.success)) fail(`help-data: article "${a.id}" has success "${a.success}", which no SUCCESS event maps to`);
}
for (const [who, views] of Object.entries(ON_VIEW)) {
    for (const [view, list] of Object.entries(views)) {
        for (const id of list) {
            const a = ARTICLES.find((x) => x.id === id);
            if (!a) fail(`help-data: ON_VIEW.${who}.${view} lists unknown article "${id}"`);
            else if (a.who !== who) fail(`help-data: ON_VIEW.${who}.${view} lists "${id}", which is for ${a.who}s`);
        }
        if (!inSource(`data-view="${view}"`) && !inSource(`data-view=\\"${view}\\"`)) fail(`help-data: ON_VIEW.${who} names view "${view}", which the dashboard doesn't have`);
    }
}
for (const [id, t] of Object.entries(TOURS)) {
    if (!ARTICLES.some((a) => a.id === t.article)) fail(`help-data: tour "${id}" belongs to unknown article "${t.article}"`);
    if (!ARTICLES.some((a) => a.tour === id)) fail(`help-data: tour "${id}" has no article with a Show me button for it`);
}

// --- help matches the screen ---
for (const a of ARTICLES) {
    const dynamic = new Set(a.dynamic || []);
    const text = a.steps.join(' ') + ' ' + (a.tip || '');
    for (const m of text.matchAll(/\*\*(.+?)\*\*/g)) {
        const label = m[1];
        if (dynamic.has(label)) continue;
        if (!inSource(label)) fail(`help article "${a.id}": **${label}** isn't on the dashboard any more (no source contains it). Update the article, or add it to "dynamic" if the screen builds it from parts.`);
    }
}
for (const [id, t] of Object.entries(TOURS)) {
    t.steps.forEach((st, i) => {
        for (const c of st.check || []) if (!inSource(c)) fail(`help tour "${id}" step ${i + 1}: the dashboard no longer has ${c} (the ring would have nothing to point at)`);
        if (!(st.check || []).length) fail(`help tour "${id}" step ${i + 1} has no \`check\`: list what its target needs in the source`);
        for (const label of (st.text.match(/\*\*(.+?)\*\*/g) || []).map((x) => x.slice(2, -2))) {
            const art = ARTICLES.find((a) => a.id === t.article) || {};
            if (!(art.dynamic || []).includes(label) && !inSource(label)) fail(`help tour "${id}" step ${i + 1}: **${label}** isn't on the dashboard any more`);
        }
    });
}
for (const [id, s] of Object.entries(SHORTCUTS)) {
    for (const c of s.check || []) if (!inSource(c)) fail(`help shortcut "${id}": the dashboard no longer has ${c}`);
}
for (const name of Object.keys(SUCCESS)) {
    if (!new RegExp(`(?:agTrack|track)\\('${name}'`).test(haystack)) fail(`help: success event "${name}" is never announced (no track('${name}') or agTrack('${name}') in the dashboard's source), so "Helped" would read zero`);
}

// --- the dashboard still runs it ---
const dash = read('public/dashboard/index.html');
if (!dash.includes('src="/help/help.js"')) fail('dashboard: no longer loads /help/help.js (the ? panel and tours)');
if (!dash.includes('href="/help/help.css"')) fail('dashboard: no longer loads /help/help.css');
if (!/class="comms"/.test(dash)) fail('dashboard: the Comms button (.me .comms) is gone, and the ? button is placed next to it');
if (!read('public/mission-control/teacher.js').includes("new CustomEvent('ag:track'")) fail("teacher.js: track() no longer announces ag:track, so the Help Center can't see assignments");

if (failures) { console.error(`\ncheck-help: ${failures} problem(s).`); process.exit(1); }
console.log(`check-help: OK — ${ARTICLES.length} articles, ${Object.keys(TOURS).length} tours, ${Object.keys(SHORTCUTS).length} shortcuts all match the dashboard.`);
