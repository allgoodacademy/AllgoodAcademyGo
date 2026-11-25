#!/usr/bin/env node
'use strict';

// Writes the founder's job line from nav/founder.js into the homepage strip and the About
// page. Same shape as build-nav.js: one definition, generated output committed alongside
// it, and --check so CI fails when a page was hand-edited or never rebuilt.
//
// Usage: node scripts/build-founder.js [--check]

const fs = require('fs');
const path = require('path');
const { PAGES, begin, end, render } = require('../nav/founder.js');

const ROOT = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
const problems = [];

for (const page of PAGES) {
    const file = path.join(ROOT, page.file);
    const html = fs.readFileSync(file, 'utf8');
    const b = begin(page.region);
    const e = end(page.region);
    const start = html.indexOf(b);
    const stop = html.indexOf(e);
    if (start === -1 || stop === -1 || stop < start) {
        problems.push(`${page.file} — no generated founder region. Wrap it in ${b} / ${e}.`);
        continue;
    }
    const current = html.slice(start, stop + e.length);
    const next = render(page.region);
    if (current === next) continue;
    if (check) {
        problems.push(`${page.file} — founder ${page.region} is out of date (run \`npm run build:founder\`)`);
    } else {
        fs.writeFileSync(file, html.slice(0, start) + next + html.slice(stop + e.length));
        console.log(`build-founder: wrote ${page.file}`);
    }
}

if (problems.length) {
    console.error(problems.map((p) => `build-founder: ${p}`).join('\n'));
    process.exit(1);
}
if (check) console.log(`build-founder: ${PAGES.length} pages up to date`);
