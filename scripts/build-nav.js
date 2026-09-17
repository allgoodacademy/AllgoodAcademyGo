#!/usr/bin/env node
'use strict';

// Writes the shared nav from nav/nav.js into every page that carries it.
//
// Same shape as scripts/build-css.js: one definition in the repo, generated
// output committed alongside it, and a --check mode so CI fails when the two
// disagree. Hand-editing a nav in a page is the thing this exists to catch —
// that is how "Games" ended up on the homepage and nowhere else.
//
// Usage: node scripts/build-nav.js [--check]
//   --check  render and compare without writing, so CI (or a reviewer) can
//            catch a page whose nav was edited by hand or never rebuilt.

const fs = require('fs');
const path = require('path');
const { PAGES, BEGIN, END, renderNav } = require('../nav/nav.js');

const ROOT = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');

let changed = 0;
const problems = [];

for (const page of PAGES) {
    const file = path.join(ROOT, page.file);
    let html;
    try {
        html = fs.readFileSync(file, 'utf8');
    } catch (e) {
        problems.push(`${page.file} — cannot read (${e.code})`);
        continue;
    }

    const start = html.indexOf(BEGIN);
    const end = html.indexOf(END);
    if (start === -1 || end === -1) {
        // A page listed here with no markers is a page whose nav silently stopped
        // being generated. Fail loudly rather than skipping it.
        problems.push(
            `${page.file} — no generated region. Wrap its nav in ${BEGIN} / ${END}.`
        );
        continue;
    }
    if (end < start) {
        problems.push(`${page.file} — ${END} appears before ${BEGIN}.`);
        continue;
    }

    const current = html.slice(start, end + END.length);
    const next = renderNav(page);
    if (current === next) continue;

    changed++;
    if (check) {
        problems.push(`${page.file} — nav is out of date (run \`npm run build:nav\`)`);
    } else {
        fs.writeFileSync(file, html.slice(0, start) + next + html.slice(end + END.length));
        console.log(`build-nav: wrote ${page.file}`);
    }
}

if (problems.length) {
    console.error(`build-nav: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
}

console.log(
    check
        ? `build-nav: all ${PAGES.length} navs match nav/nav.js`
        : changed
          ? `build-nav: updated ${changed} of ${PAGES.length} page(s)`
          : `build-nav: all ${PAGES.length} navs already up to date`
);
