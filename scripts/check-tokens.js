#!/usr/bin/env node
// Fails the build when the two files that define Allgood's brand values disagree.
//
// There are two, and there have to be two. tailwind/theme.js feeds the generated
// bundles in public/assets/css/, so it owns every value expressed as a utility class
// (text-allgood-secondary, font-heading, ...). What it cannot reach is hand-written CSS
// inside a page's <style> block, which is what public/assets/css/design-tokens.css
// covers. Same colors, two consumers, no way for either file to import the other.
//
// Until this script existed the pairing was a comment asking the next person to
// remember. Change the orange in one file and not the other and nothing complains: the
// utility classes and the custom properties just quietly render two different oranges,
// and the first report is someone noticing a button looks off.
//
// The contract is written in design-tokens.css itself. A token that mirrors a theme.js
// value is annotated with the key it mirrors:
//
//     --color-orange: #D34716;      /* theme.js allgood-primary */
//
// This script reads those annotations and enforces them, so declaring a new shared
// value is just a matter of annotating it. It also checks the reverse direction: a
// token carrying a value that theme.js already defines, but with no annotation saying
// so, is an undeclared pairing and fails too — that is how a second source of truth
// gets in without anyone deciding to add one.
//
// Finally it guards the two invariants the consolidation established, both of which
// regress silently the moment someone pastes a literal back in:
//   - no brand hex left in any page's <style> block
//   - no short font fallback chain (Georgia, serif / Verdana, sans-serif) anywhere
//
// No dependencies; run with `node scripts/check-tokens.js`. Exits 1 on any mismatch.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const TOKENS_CSS = 'public/assets/css/design-tokens.css';
const THEME_JS = 'tailwind/theme.js';

const problems = [];
const fail = (msg) => problems.push(msg);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const theme = require(path.join(root, THEME_JS));
const css = read(TOKENS_CSS);

// ---------------------------------------------------------------------------
// Parse design-tokens.css: every declaration inside :root, plus the theme.js key
// annotated beside it (if any). Comments are only stripped AFTER the annotations are
// read, since the annotation lives in a comment.
// ---------------------------------------------------------------------------
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/);
if (!rootBlock) {
  console.error(`check-tokens: could not find a :root block in ${TOKENS_CSS}`);
  process.exit(1);
}

const tokens = new Map(); // name -> { value, themeKey|null, line }
for (const [i, rawLine] of rootBlock[1].split('\n').entries()) {
  const decl = rawLine.match(/^\s*(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/);
  if (!decl) continue;
  const annotation = rawLine.match(/\/\*\s*theme\.js\s+([A-Za-z0-9-]+)\s*\*\//);
  tokens.set(decl[1], {
    value: decl[2].trim(),
    themeKey: annotation ? annotation[1] : null,
    line: i + 1,
  });
}
if (!tokens.size) {
  console.error(`check-tokens: parsed no custom properties from ${TOKENS_CSS}`);
  process.exit(1);
}

const norm = (v) => v.trim().toLowerCase();
// A font stack compares as its list of family names, so quoting and spacing differences
// between `Georgia, 'Times New Roman', serif` and ['Georgia','Times New Roman','serif']
// are not treated as drift. A missing or reordered fallback still is.
const fontList = (v) =>
  (Array.isArray(v) ? v : v.split(','))
    .map((f) => f.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
    .filter(Boolean);

// ---------------------------------------------------------------------------
// 1. Every annotated token matches the theme.js value it claims to mirror.
// ---------------------------------------------------------------------------
let checkedPairs = 0;
for (const [name, tok] of tokens) {
  if (!tok.themeKey) continue;
  const themeValue = theme.colors[tok.themeKey];
  if (themeValue === undefined) {
    fail(`${TOKENS_CSS} ${name} is annotated "theme.js ${tok.themeKey}", but ${THEME_JS} has no color named "${tok.themeKey}".`
      + ` Fix the annotation, or add the color to ${THEME_JS}.`);
    continue;
  }
  checkedPairs += 1;
  if (norm(themeValue) !== norm(tok.value)) {
    fail(`BRAND VALUE DISAGREEMENT on ${tok.themeKey}:\n`
      + `       ${THEME_JS}   '${tok.themeKey}' = ${themeValue}\n`
      + `       ${TOKENS_CSS}  ${name} = ${tok.value}\n`
      + `     These must be the same color. Update whichever file is wrong — the utility`
      + ` classes read ${THEME_JS} and hand-written CSS reads ${TOKENS_CSS}, so a`
      + ` mismatch renders two different colors on the same page.`);
  }
}

// ---------------------------------------------------------------------------
// 2. Fonts. theme.js owns font-heading/font-body; the tokens own the same stacks for
//    hand-written CSS.
// ---------------------------------------------------------------------------
for (const [tokenName, themeKey] of [['--font-display', 'heading'], ['--font-ui', 'body']]) {
  const tok = tokens.get(tokenName);
  const themeStack = theme.fontFamily && theme.fontFamily[themeKey];
  if (!tok) { fail(`${TOKENS_CSS} is missing ${tokenName}.`); continue; }
  if (!themeStack) { fail(`${THEME_JS} is missing fontFamily.${themeKey}.`); continue; }
  checkedPairs += 1;
  const a = fontList(tok.value), b = fontList(themeStack);
  if (a.join('|') !== b.join('|')) {
    fail(`FONT STACK DISAGREEMENT on ${themeKey}:\n`
      + `       ${THEME_JS}   fontFamily.${themeKey} = ${JSON.stringify(themeStack)}\n`
      + `       ${TOKENS_CSS}  ${tokenName} = ${tok.value}\n`
      + `     Same families, same order, in both files.`);
  }
}

// ---------------------------------------------------------------------------
// 3. Reverse direction: a token duplicating a theme.js value without declaring it.
// ---------------------------------------------------------------------------
const themeByValue = new Map();
for (const [key, value] of Object.entries(theme.colors)) {
  if (!themeByValue.has(norm(value))) themeByValue.set(norm(value), []);
  themeByValue.get(norm(value)).push(key);
}
for (const [name, tok] of tokens) {
  if (tok.themeKey) continue;
  const keys = themeByValue.get(norm(tok.value));
  if (keys) {
    fail(`${TOKENS_CSS} ${name} = ${tok.value} is the same value as ${THEME_JS} `
      + `'${keys.join("' / '")}', but carries no "/* theme.js <key> */" annotation, so nothing `
      + `keeps the two in step. Annotate it, or give the token a value of its own.`);
  }
}

// ---------------------------------------------------------------------------
// 4. Regression guards for the invariants the consolidation established.
// ---------------------------------------------------------------------------
const pages = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (rel.replace(/\\/g, '/') === 'public/assets/css') continue; // generated bundles
      walk(rel);
    } else if (/\.(html|js)$/.test(entry.name)) {
      pages.push(rel.replace(/\\/g, '/'));
    }
  }
})('public');

// 4a. Brand hex inside a <style> block. These are the values that now have tokens, so a
// literal reappearing means a page stopped using them.
const GUARDED = new Map();
for (const name of ['--color-teal', '--color-orange', '--color-cream', '--color-dark']) {
  const tok = tokens.get(name);
  if (tok && /^#[0-9a-fA-F]{6}$/.test(tok.value)) GUARDED.set(tok.value.toLowerCase(), name);
}
const hexRe = /#[0-9a-fA-F]{6}\b/g;
for (const page of pages) {
  const text = read(page);
  for (const block of text.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []) {
    for (const hex of block.match(hexRe) || []) {
      const name = GUARDED.get(hex.toLowerCase());
      if (name) {
        const line = text.slice(0, text.indexOf(block) + block.indexOf(hex)).split('\n').length;
        fail(`${page}:${line} has the literal ${hex} in a <style> block. `
          + `Use var(${name}) — that is what ${TOKENS_CSS} is for.`);
      }
    }
  }
}

// 4b. Short font fallback chains. Matching stops at a quote, so a stack led by a quoted
// family ('Inter', Verdana, sans-serif) is correctly not treated as the short chain.
const SHORT_CHAINS = ['georgia,serif', 'verdana,sans-serif'];
const declRe = /font-family\s*:\s*([^;}"'<]*)/g;
for (const page of [...pages, THEME_JS]) {
  const text = read(page);
  let m;
  while ((m = declRe.exec(text)) !== null) {
    const compact = m[1].replace(/\s+/g, '').toLowerCase();
    if (SHORT_CHAINS.includes(compact)) {
      const line = text.slice(0, m.index).split('\n').length;
      const want = compact.startsWith('georgia') ? '--font-display' : '--font-ui';
      fail(`${page}:${line} uses the short fallback chain "${m[1].trim()}". `
        + `Use the full chain from ${TOKENS_CSS} ${want}: ${tokens.get(want).value}`);
    }
  }
  declRe.lastIndex = 0;
}

if (problems.length) {
  console.error(`check-tokens: ${problems.length} problem(s)\n - ` + problems.join('\n - '));
  process.exit(1);
}
console.log(`check-tokens: OK — ${checkedPairs} shared value(s) agree between ${THEME_JS} and `
  + `${TOKENS_CSS} (${tokens.size} tokens defined), no brand literal in any <style> block `
  + `across ${pages.length} pages, and no short font fallback chain anywhere.`);
