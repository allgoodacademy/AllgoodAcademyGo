#!/usr/bin/env node
// Asserts the invariants that have silently regressed or gone stale before, so the repo
// reports its own state instead of relying on a human re-reading it against Notion.
// Companion to check-modules.js (which checks list drift); this checks BEHAVIOUR drift.
//
// Each check maps to a real defect that reached production or sat mis-filed on the board:
//   1. completion-write coupling  — a student who skips the optional rating is never
//      recorded complete on the teacher's roster (5 of 7 GoodBlocks, 2026-09-11)
//   2. GA4 surface scope         — COPPA: the analytics library must never load
//      unconditionally on a page an under-13 Learner Recruit can reach
//   3. bundled CDN assets        — school firewalls block unpkg/cdn.tailwindcss
//   4. standards claim backing   — marketing must not assert a CASEL mapping that no
//      artifact in the repo supports
//   5. recruit-code close guard  — a child must not be able to dismiss their only copy
//      of their Recruit Code with an unguarded tap
//
// No dependencies; run with `node scripts/check-invariants.js`. Exits 1 on any violation.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

const problems = [];
const fail = (check, msg) => problems.push({ check, msg });

// Every shipped GoodBlock. Add a row when a lab ships.
const GOODBLOCKS = [
  'public/jsh/digital-decisions-lab/social-intelligence/index.html',
  'public/jsh/digital-decisions-lab/privacy-security/index.html',
  'public/jsh/digital-decisions-lab/digital-citizenship/index.html',
  'public/jsh/digital-decisions-lab/professional-brand/index.html',
  'public/jsh/real-world-ready-lab/money-as-a-skill/index.html',
  'public/jsh/real-world-ready-lab/conflict-has-a-winner/index.html',
  'public/jsh/real-world-ready-lab/reading-the-room/index.html',
];

// Pages an anonymous / under-13 session can reach. GA4 must never load unconditionally here.
const LEARNER_SURFACES = [
  ...GOODBLOCKS,
  'public/jsh/digital-decisions-lab/index.html',
  'public/jsh/real-world-ready-lab/index.html',
  'public/educational-games/digital-decisions/index.html',
  'public/educational-games/real-world-ready/index.html',
  'public/mission-control/index.html',
];

// Extracts the body of `window.NAME = ... };` so we can ask what a function actually calls.
function fnBody(src, name) {
  const start = src.indexOf(`window.${name} =`);
  if (start === -1) return null;
  const open = src.indexOf('{', start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  return null;
}

// --- 1. The completion write must not depend on the optional star rating -----------
// Correct shape: logModuleCompletion() fires on REACHING the final Case. Any path that
// shows the badge must therefore already have logged completion.
for (const file of GOODBLOCKS) {
  if (!exists(file)) { fail('completion', `${file} is listed as a GoodBlock but does not exist`); continue; }
  const src = read(file);
  if (!src.includes('logModuleCompletion')) { fail('completion', `${file}: no logModuleCompletion() at all`); continue; }

  const rating = fnBody(src, 'finalizeCaseRating');
  const reveal = fnBody(src, 'revealCompletion');

  if (rating && rating.includes('logModuleCompletion')) {
    fail('completion',
      `${file}: logModuleCompletion() is called from inside finalizeCaseRating(), which ` +
      `early-returns without a star rating. A student who skips the rating is never recorded ` +
      `complete. Move the call to the final-Case branch of advanceFromPage() ` +
      `(see social-intelligence/index.html for the correct shape).`);
  }
  // The skip path shows the badge. If completion is not logged on page advance, the skip
  // path must log it itself — otherwise "Skip" silently discards the roster write.
  const logsOnAdvance = /pageNum === TOTAL_PAGES - 1 && window\.logModuleCompletion/.test(src);
  if (reveal && !logsOnAdvance && !reveal.includes('logModuleCompletion')) {
    fail('completion',
      `${file}: revealCompletion() (the "Skip — show me the badge" path) shows the badge and ` +
      `offers save, but completion is logged neither on page advance nor here. This path ` +
      `awards a badge for a run the teacher will never see as finished.`);
  }
}

// --- 2. GA4 must never load unconditionally on a learner-reachable surface ----------
const GTAG_LIB = 'googletagmanager.com/gtag/js';
for (const file of LEARNER_SURFACES) {
  if (!exists(file)) continue;
  const src = read(file);
  if (src.includes(GTAG_LIB)) {
    fail('ga4',
      `${file}: loads the GA4 library. This surface is reachable by an anonymous / under-13 ` +
      `Learner Recruit. GA4 is permitted only on the signed-out marketing pages and on ` +
      `/dashboard/ behind the ag_account gate.`);
  }
}
if (exists('public/dashboard/index.html')) {
  const dash = read('public/dashboard/index.html');
  if (dash.includes(GTAG_LIB)) {
    const idx = dash.indexOf(GTAG_LIB);
    const preceding = dash.slice(Math.max(0, idx - 900), idx);
    if (!preceding.includes("ag_account")) {
      fail('ga4',
        `public/dashboard/index.html: the GA4 library is loaded without an ag_account gate ` +
        `immediately preceding it. Only a confirmed 13+ account may trigger analytics.`);
    }
  }
}

// --- 3. No third-party CDN for layout or icons (school firewalls) ------------------
const CDN = [/unpkg\.com/, /cdn\.tailwindcss\.com/];
function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(html|js)$/.test(e.name) && !/\.min\.js$/.test(e.name)) out.push(rel);
  }
  return out;
}
for (const file of walk('public')) {
  const src = read(file);
  for (const re of CDN) {
    // A prose mention on a teacher-facing page explaining what we no longer load is fine;
    // an actual script/link tag is not.
    const tagRe = new RegExp(`(src|href)=["'][^"']*${re.source}`, 'i');
    if (tagRe.test(src)) fail('cdn', `${file}: loads an asset from ${re.source} — must be bundled locally.`);
  }
}

// --- 4. A standards claim in marketing needs a signed-off artifact behind it -------
// Policy is NOT "remove the claim" — it is "the claim must be true and evidenced."
// Every GoodBlock named in a marketing standards table must appear in a coverage map
// that is signed off (not DRAFT) and actually names a CASEL competency for it.
const GOODBLOCK_NAMES = [
  'Social Intelligence', 'Privacy & Security', 'Digital Citizenship', 'Professional Brand',
  'Money as a Skill', 'Conflict Has a Winner', 'Reading the Room',
];
const claimPages = ['public/for-teachers/index.html', 'public/index.html', 'public/about/index.html'];
const claimingPages = claimPages.filter((p) => exists(p) && /CASEL/.test(read(p)));

// A coverage map is in exactly one of three states, read from its Status line:
//   DRAFT          — not evidence yet. Hard fail.
//   awaiting       — written and evidenced, but no human has signed it. Fail, reported as
//                    the outstanding sign-off rather than as missing documentation.
//   signed         — a named reviewer has signed it off. The only state that clears.
// The middle state was added 2026-09-11. Without it this check treated "not marked DRAFT"
// as "signed off", so authoring the maps alone would have flipped it green and reported a
// marketing claim as backed by a document nobody had reviewed — the precise failure mode
// this script exists to catch, reproduced inside the script.
function mapStatus(text) {
  const line = (text.match(/^\s*\*\*Status:\*\*(.*)$/mi) || text.match(/^\s*Status:(.*)$/mi) || [])[1];
  if (line == null) return 'unknown';
  if (/DRAFT/i.test(line)) return 'draft';
  if (/awaiting sign-?off/i.test(line)) return 'awaiting';
  if (/signed[- ]?off/i.test(line)) return 'signed';
  return 'unknown';
}

if (claimingPages.length) {
  const docsDir = 'docs/goodblocks';
  const evidenced = [];   // maps that name CASEL and are not DRAFT
  const awaiting = [];    // ...of those, the ones no human has signed yet
  if (exists(docsDir)) {
    for (const f of fs.readdirSync(path.join(root, docsDir))) {
      if (!/coverage-map/.test(f)) continue;
      const d = read(path.join(docsDir, f));
      const status = mapStatus(d);
      if (status === 'draft') {
        fail('standards', `${docsDir}/${f} is still marked DRAFT while marketing asserts a CASEL mapping. Sign it off or the claim is unbacked.`);
        continue;
      }
      if (status === 'unknown') {
        fail('standards',
          `${docsDir}/${f} has no readable Status line. A coverage map with no stated status ` +
          `cannot be told apart from a signed-off one, so it is not counted as evidence. Use ` +
          `"**Status:** DRAFT", "**Status:** Awaiting sign-off — <reviewers>", or a signed-off status.`);
        continue;
      }
      if (!/CASEL/i.test(d)) continue;
      evidenced.push({ file: f, text: d });
      if (status === 'awaiting') awaiting.push(f);
    }
  }
  if (!evidenced.length) {
    fail('standards',
      `${claimingPages.join(', ')} assert a CASEL mapping, but no coverage map in ` +
      `${docsDir} names CASEL. Write the maps — do not remove the claim without a founder decision.`);
  } else {
    const all = evidenced.map((m) => m.text).join('\n');
    for (const name of GOODBLOCK_NAMES) {
      const shipped = GOODBLOCKS.some((g) => g.includes(name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')));
      if (!shipped) continue;
      if (!all.includes(name)) {
        fail('standards',
          `"${name}" is claimed in a marketing standards table but has no entry in any ` +
          `coverage map. Every claimed row needs evidence behind it.`);
      }
    }
    // Evidence exists and covers every claimed row; the human step is what is outstanding.
    // This is deliberately still a violation: a claim backed only by an unreviewed document
    // is not yet a backed claim. It clears when a reviewer edits the Status line — not by
    // anything Claude Code or CI can do on its own.
    if (awaiting.length) {
      fail('standards',
        `awaiting sign-off — ${awaiting.map((f) => `${docsDir}/${f}`).join(', ')} ` +
        `${awaiting.length === 1 ? 'is' : 'are'} written and evidenced but not yet signed off by ` +
        `the Instructional Designer / Curriculum & Learning Science. Marketing asserts the CASEL ` +
        `mapping today, so the claim stands on a document no reviewer has accepted. This is the ` +
        `human step and is not closable in code.`);
    }
  }
}

// --- 5. The Recruit Code panel must not be dismissable without a guard -------------
if (exists('public/js/identity-gate.js')) {
  const gate = read('public/js/identity-gate.js');
  const closeIdx = gate.indexOf("getElementById('ag-btn-close').onclick");
  if (closeIdx !== -1) {
    const handler = gate.slice(closeIdx, closeIdx + 500);
    if (!/ag-recruit-new/.test(handler) && !/confirm/i.test(handler)) {
      fail('recruit-code',
        `public/js/identity-gate.js: the shared close button calls resolveAndClose() with no ` +
        `check for the ag-recruit-new panel and no confirmation. A child can dismiss the only ` +
        `copy of their Recruit Code and lose their work permanently.`);
    }
  }
}

// --- Report -----------------------------------------------------------------------
if (!problems.length) {
  console.log('check-invariants: all invariants hold.');
  process.exit(0);
}
const byCheck = problems.reduce((m, p) => ((m[p.check] = m[p.check] || []).push(p.msg), m), {});
console.error(`check-invariants: ${problems.length} violation(s)\n`);
for (const [check, msgs] of Object.entries(byCheck)) {
  console.error(`[${check}]`);
  for (const m of msgs) console.error(`  - ${m}`);
  console.error('');
}
process.exit(1);
