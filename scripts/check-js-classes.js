#!/usr/bin/env node
// Fails when a Tailwind utility used inside a JS string is missing from a CSS bundle
// that a page loading that JS actually ships.
//
// This is the check that would have caught the Message HQ modal rendering behind the
// tablet screen. /js/message-hq.js and /js/identity-gate.js build their markup as
// strings; the bundles in public/assets/css/ are purged; and when the content globs
// scanned .html only, every class appearing nowhere but a .js file compiled to nothing.
// `z-[9999]` was in no bundle at all, the modal computed to z-index:auto, and it painted
// underneath .screen-container. Nothing failed — it just did not appear.
//
// The globs include public/js/**/*.js now, so the classes compile. This exists so that
// staying true is enforced rather than assumed: a future glob edit, a hand-edited bundle,
// or a bundle nobody rebuilt all show up here as a named missing class.
//
// Not wired into check-invariants.js on purpose — that script reports the live status of
// the open backlog, and this is a build-correctness check with a different audience.
// Run with `npm run check:js-classes`.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// Utilities whose effect is guaranteed by an inline style on the same element, or which
// are structural conventions rather than Tailwind. Listed explicitly so the exemption is
// a decision on the record, not a silent gap in the regex.
const NOT_TAILWIND = new Set([
  'hidden-modal', 'visible-modal', 'modal-transition', 'mission-file',
  'star-btn', 'status-active', 'status-ready', 'ready',
]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (e.name.endsWith('.js')) out.push(rel);
  }
  return out;
}

// This markup is assembled by concatenation, so a class attribute is routinely split
// across a JS expression:
//
//   'class="... border-l-4 ' + (unread ? 'border-allgood-primary' : 'border-gray-300') + '">'
//
// Scanning for class="..." naively both invents tokens that are really JS syntax
// ("(unread", "?", ":") and — the part that matters — MISSES the two real classes inside
// the ternary, which are exactly the conditional ones least likely to be seen by hand.
// So first splice each interpolation down to the string literals it could produce, which
// puts both branches into the attribute, then read the attributes off the result.
function normalize(src) {
  return src.replace(/'\s*\+\s*([^+]*?)\s*\+\s*'/g, (_m, expr) => {
    const lits = [...expr.matchAll(/'([^']*)'/g)].map((x) => x[1]);
    return lits.length ? ' ' + lits.join(' ') + ' ' : ' ';
  });
}

// Every class token this file could put on an element: literal class="..." attributes
// (post-normalisation, so both branches of a conditional count), plus
// classList.add/remove/toggle arguments — the send button swaps bg-emerald-600 in at
// runtime, and a class that only ever appears there is exactly the kind that goes missing.
function classesIn(src) {
  const found = new Set();
  for (const m of normalize(src).matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c) found.add(c);
  }
  for (const m of src.matchAll(/classList\.(?:add|remove|toggle)\(([^)]*)\)/g)) {
    for (const q of m[1].matchAll(/'([^']+)'/g)) found.add(q[1]);
  }
  // Anything still carrying JS punctuation is a fragment the normaliser could not
  // resolve, not a utility. Reported rather than dropped: a silently ignored token is
  // how a real missing class would hide.
  const out = [];
  for (const c of found) {
    if (NOT_TAILWIND.has(c)) continue;
    if (/^[a-z0-9]/.test(c) && !/['"+(?]/.test(c)) out.push(c);
    else if (!/^[?:]$/.test(c) && !/^\(/.test(c)) out.push(c);
  }
  return out;
}

// A class is present if its escaped selector appears in the bundle. Tailwind escapes
// : / . [ ] and a few others with a backslash; mirror that rather than guessing.
function selectorFor(cls) {
  return '.' + cls.replace(/([:\/.[\]()%,#!])/g, '\\$1');
}

const BUNDLES = {
  'tailwind.min.css': 'site-wide',
  'tailwind.digital-citizenship.min.css': 'Digital Citizenship',
  'tailwind.privacy-security.min.css': 'Privacy & Security',
  'tailwind.professional-brand.min.css': 'Professional Brand',
  'tailwind.rwr-amber.min.css': 'Real World Ready',
};

// Which bundle each page ships, so a class is only required where it can actually be used.
function bundleOf(html) {
  const m = html.match(/assets\/css\/(tailwind[a-z.-]*\.min\.css)/);
  return m ? m[1] : null;
}

function htmlFiles(dir, out = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) htmlFiles(rel, out);
    else if (e.name === 'index.html' || e.name.endsWith('.html')) out.push(rel);
  }
  return out;
}

const css = {};
for (const b of Object.keys(BUNDLES)) {
  const p = path.join('public/assets/css', b);
  if (!fs.existsSync(path.join(root, p))) { console.error(`missing bundle: ${p}`); process.exit(1); }
  css[b] = read(p);
}

const problems = [];
const jsFiles = walk('public/js');
const pages = htmlFiles('public');

for (const js of jsFiles) {
  const webPath = '/' + path.relative('public', js).split(path.sep).join('/');
  // Every page that loads this script, and the bundle each of them ships.
  const usedBundles = new Set();
  for (const page of pages) {
    const html = read(page);
    if (!html.includes(`src="${webPath}"`)) continue;
    const b = bundleOf(html);
    if (b && css[b] !== undefined) usedBundles.add(b);
  }
  if (!usedBundles.size) continue;

  const classes = classesIn(read(js));
  for (const cls of classes) {
    const sel = selectorFor(cls);
    for (const b of usedBundles) {
      if (!css[b].includes(sel)) {
        problems.push(`${webPath}: "${cls}" is not in ${b} (${BUNDLES[b]}) — a page loading this script would render without it`);
      }
    }
  }
}

if (problems.length) {
  console.error(`check-js-classes: ${problems.length} missing class/bundle pair(s)\n`);
  for (const p of problems) console.error('  - ' + p);
  console.error('\nRun `npm run build:css` and commit the rebuilt bundles, or back the class with an inline style.');
  process.exit(1);
}
console.log(`check-js-classes: OK — every class in ${jsFiles.length} JS file(s) is present in each bundle its pages ship.`);
