#!/usr/bin/env node
'use strict';

// Builds every Tailwind bundle in public/assets/css/ from the configs in tailwind/.
//
// Until this script existed, the bundles were built by hand on someone's laptop and
// the invocation lived nowhere in the repo. That is how the content globs came to
// scan .html only while two shared UI modules built their markup in JS strings:
// there was no checked-in build to notice, review, or correct. Run `npm run
// build:css` after touching markup, the shared JS modules, or tailwind/.
//
// Usage: node scripts/build-css.js [--check]
//   --check  rebuild into a temp dir and fail if committed output differs, so CI
//            (or a reviewer) can catch a bundle that was never rebuilt.

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join('public', 'assets', 'css');

const SHARED_BANNER =
    'Tailwind CSS v3.4.13 — built locally by `npm run build:css` (scripts/build-css.js), ' +
    'JIT-purged against the content globs in tailwind/. Removes the runtime ' +
    'cdn.tailwindcss.com dependency (district content filters block that CDN and it is a ' +
    'dev-only shim, not a production build). Content scanning covers public/js/**/*.js as ' +
    'well as markup: the shared modals in identity-gate.js and message-hq.js are built as ' +
    'JS strings, and scanning .html alone silently dropped every utility used only there. ' +
    'Do not hand-edit — regenerate.';

const BUNDLES = [
    {
        config: 'main.config.js',
        out: 'tailwind.min.css',
        banner:
            SHARED_BANNER +
            ' Site-wide bundle: dashboard, marketing pages, Mission Control, Lab Pack hubs ' +
            'and the Real World Ready GoodBlocks, with the shared Allgood/Jodi/RWR theme ' +
            'colors and fonts extended in.',
    },
    ...[
        ['digital-citizenship', 'Digital Citizenship'],
        ['privacy-security', 'Privacy & Security'],
        ['professional-brand', 'Professional Brand'],
        ['rwr-amber', 'Real World Ready (shared Lab Pack amber)'],
        ['room-to-think', 'Room to Think (shared Lab Pack wine)'],
    ].map(([slug, label]) => ({
        config: `${slug}.config.js`,
        out: `tailwind.${slug}.min.css`,
        banner:
            SHARED_BANNER +
            ` Scoped to ${label} markup, with the shared Allgood/Jodi/RWR theme colors plus ` +
            'the gb-accent-* identity triplet from the founder accent registry baked in.',
    })),
];

// A bare entry file; nothing in the bundles comes from custom CSS layers.
const ENTRY = path.join(os.tmpdir(), 'allgood-tailwind-entry.css');
fs.writeFileSync(ENTRY, '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');

const check = process.argv.includes('--check');
const destDir = check ? fs.mkdtempSync(path.join(os.tmpdir(), 'allgood-css-')) : path.join(ROOT, OUT_DIR);

let failed = 0;
for (const bundle of BUNDLES) {
    const dest = path.join(destDir, bundle.out);
    execFileSync(
        process.execPath,
        [
            path.join(ROOT, 'node_modules', 'tailwindcss', 'lib', 'cli.js'),
            '-c', path.join(ROOT, 'tailwind', bundle.config),
            '-i', ENTRY,
            '-o', dest,
            '--minify',
        ],
        { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] }
    );

    // Tailwind strips the banner during minification, so prepend it afterwards.
    const css = fs.readFileSync(dest, 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, '');
    fs.writeFileSync(dest, `/* ${bundle.banner} */\n${css}`);

    if (check) {
        const committed = path.join(ROOT, OUT_DIR, bundle.out);
        const current = fs.existsSync(committed) ? fs.readFileSync(committed, 'utf8') : '';
        if (current !== fs.readFileSync(dest, 'utf8')) {
            console.error(`✗ ${bundle.out} is out of date — run \`npm run build:css\` and commit the result.`);
            failed += 1;
        } else {
            console.log(`✓ ${bundle.out} up to date`);
        }
    } else {
        console.log(`✓ ${path.join(OUT_DIR, bundle.out)}`);
    }
}

if (failed) process.exit(1);
