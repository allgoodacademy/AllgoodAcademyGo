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
//   6. retention promise backing — a published deletion deadline must have a scheduled
//      job behind it. privacy.html promised a 90-day purge from the day it shipped and
//      nothing ever ran it (2026-09-11)
//   7. trademark disclaimer parity   — the CogAT disclaimer must be word for word identical
//      on both Pattern Lab pages and above the fold on the landing page, and neither page
//      may claim or imply a score improvement
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
  'public/jsh/room-to-think-lab/ten-voices-one-source/index.html',
  'public/jsh/room-to-think-lab/the-question-decides-the-answer/index.html',
  'public/jsh/room-to-think-lab/where-you-say-it/index.html',
  'public/jsh/room-to-think-lab/the-cost-of-later/index.html',
];

// Pages an anonymous / under-13 session can reach. GA4 must never load unconditionally here.
const LEARNER_SURFACES = [
  ...GOODBLOCKS,
  'public/jsh/digital-decisions-lab/index.html',
  'public/jsh/real-world-ready-lab/index.html',
  'public/educational-games/digital-decisions/index.html',
  'public/educational-games/real-world-ready/index.html',
  'public/educational-games/room-to-think/index.html',
  'public/jsh/room-to-think-lab/index.html',
  'public/mission-control/index.html',
  // Both Pattern Lab surfaces. Its audience is a parent, but the person answering the
  // questions is a 10-to-14-year-old, and the landing page is the first thing they see.
  // The other marketing pages load GA4; these two deliberately do not.
  'public/pattern-lab/index.html',
  'public/educational-games/pattern-lab/index.html',
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

// --- 6. A published retention promise needs a job behind it ---------------------
// Same failure as check 4, one domain over. Check 4 catches a marketing claim with no
// document behind it; this catches a PROMISE TO DELETE with no mechanism behind it.
// public/privacy.html has said since it shipped that under-13 telemetry is "permanently
// purged from our systems after 90 days of inactivity". scripts/prune-telemetry.js was
// written to do that and then referenced by nothing — no workflow, no npm script, no
// scheduled job of any kind — so it had never run even once. Nobody noticed because
// nothing was watching, which is the same reason every other check here exists.
//
// Policy is NOT "remove the promise". A promise to delete children's data is a
// compliance floor, not a marketing line. The fix is always to run the job.
const RETENTION_PAGES = ['public/privacy.html', 'public/privacy/index.html', 'public/about/index.html'];
// A deletion verb within ~120 characters of a duration. Deliberately narrow: prose about
// "deleting your account" with no timeframe is not a retention promise, and a duration with
// no deletion verb ("90 days of access") is not one either. Both halves, close together.
const RETENTION_CLAIM = /(purge[ds]?|delet(?:e|ed|ion)|erase[ds]?|retain(?:ed)?|remov(?:e|ed|al))[\s\S]{0,120}?\b\d+\s*(day|days|month|months|year|years)\b|\b\d+\s*(day|days|month|months|year|years)\b[\s\S]{0,120}?(purge[ds]?|delet(?:e|ed|ion)|erase[ds]?|retain(?:ed)?|remov(?:e|ed|al))/i;

const PRUNE_SCRIPT = 'scripts/prune-telemetry.js';

function workflowsReferencing(needle) {
  const dir = '.github/workflows';
  if (!exists(dir)) return [];
  return fs.readdirSync(path.join(root, dir))
    .filter((f) => /\.ya?ml$/.test(f))
    .filter((f) => read(path.join(dir, f)).includes(needle));
}

// A workflow only counts if it actually fires on its own. A prune wired to
// workflow_dispatch alone is still a job nobody runs.
function isScheduled(file) {
  const src = read(path.join('.github/workflows', file));
  return /^\s*schedule:/m.test(src);
}

{
  const promisePages = [];
  for (const file of RETENTION_PAGES) {
    if (!exists(file)) continue;
    const text = read(file).replace(/<[^>]*>/g, ' ');
    if (RETENTION_CLAIM.test(text)) promisePages.push(file);
  }

  const pkg = exists('package.json') ? JSON.parse(read('package.json')) : { scripts: {} };
  const npmRefs = Object.entries(pkg.scripts || {}).filter(([, cmd]) => cmd.includes(PRUNE_SCRIPT));
  const wfRefs = workflowsReferencing(PRUNE_SCRIPT)
    .concat(workflowsReferencing('prune:dry-run'))
    .filter((f, i, a) => a.indexOf(f) === i);
  const scheduledRefs = wfRefs.filter(isScheduled);

  if (promisePages.length && !scheduledRefs.length) {
    fail('retention',
      `${promisePages.join(', ')} promise${promisePages.length === 1 ? 's' : ''} a deletion ` +
      `deadline, but no SCHEDULED workflow exercises ${PRUNE_SCRIPT}. ` +
      (wfRefs.length
        ? `${wfRefs.join(', ')} reference${wfRefs.length === 1 ? 's' : ''} it but ${wfRefs.length === 1 ? 'has' : 'have'} no \`schedule:\` trigger, so it only runs when somebody remembers. `
        : `Nothing references it at all. `) +
      `A published promise to delete a child's data, with nothing running to honour it, is a ` +
      `promise the product is not keeping — and the only way anyone finds out is an audit or a ` +
      `parent asking. Add a scheduled workflow. Do not remove the promise to make this pass.`);
  }

  if (exists(PRUNE_SCRIPT) && !npmRefs.length && !wfRefs.length) {
    fail('retention',
      `${PRUNE_SCRIPT} exists but is referenced by no npm script and no workflow. It cannot be ` +
      `run without someone reconstructing the command and its credentials from the source. A ` +
      `retention job that is this hard to run is one that does not get run.`);
  }
}

// --- 7. The CogAT trademark disclaimer, and the absence of any efficacy claim -------
// Two separate obligations, both on the same two pages, both of which regress silently.
//
// PARITY. The disclaimer mirrors the one the largest operator in this category uses, and
// every clause is doing specific work: it identifies the mark's owner, disclaims
// sponsorship, disclaims endorsement, states that the questions are original, and
// disclaims predictive validity. Two copies of a legal paragraph drift — somebody tightens
// the prose on one page — and a half-disclaimed page is the one that gets screenshotted.
// So they are compared character for character, not merely both checked to exist.
//
// NO EFFICACY CLAIM. Nothing on either page may claim or imply a score improvement. That
// is the standing product principle about efficacy claims, and it is also the specific
// thing that would undermine the fair-use position the original questions rest on: a page
// that promises a better CogAT result is trading on the test's name, not just naming it.
{
  const PAGES = ['public/pattern-lab/index.html', 'public/educational-games/pattern-lab/index.html'];
  const DISCLAIMER_ID = 'cogat-disclaimer';
  const found = {};

  for (const file of PAGES) {
    if (!exists(file)) { fail('cogat', `${file} does not exist — both Pattern Lab pages must carry the disclaimer`); continue; }
    const src = read(file);
    const m = src.match(new RegExp(`id="${DISCLAIMER_ID}"[^>]*>([\\s\\S]*?)<\\/(?:p|div)>`));
    if (!m) {
      fail('cogat', `${file}: no element with id="${DISCLAIMER_ID}". Both Pattern Lab pages carry the same trademark disclaimer, and the id is how this check finds it.`);
      continue;
    }
    // Compare the words, not the whitespace an editor happened to leave.
    found[file] = m[1].replace(/\s+/g, ' ').trim();
  }

  const REQUIRED_CLAUSES = [
    'registered trademark of Riverside Assessments, LLC',
    'does not sponsor or endorse any Allgood Academy products or programs',
    'reviewed, certified, or approved by Riverside',
    'original practice materials only, not actual test questions',
    'not a predictor of official CogAT results',
  ];
  for (const [file, text] of Object.entries(found)) {
    for (const clause of REQUIRED_CLAUSES) {
      if (!text.includes(clause)) {
        fail('cogat', `${file}: the disclaimer is missing the clause "${clause}". Each clause does a specific job — do not reword it.`);
      }
    }
  }

  const texts = Object.entries(found);
  if (texts.length === 2 && texts[0][1] !== texts[1][1]) {
    fail('cogat',
      `the disclaimer is not identical on the two pages.\n` +
      `       ${texts[0][0]}\n         "${texts[0][1]}"\n` +
      `       ${texts[1][0]}\n         "${texts[1][1]}"\n` +
      `     Make them the same text. A half-disclaimed page is the one that gets screenshotted.`);
  }

  // Above the fold on the landing page: before any <section>, i.e. inside the hero, not in
  // a footer. A trademark disclaimer nobody scrolls to is a disclaimer nobody reads.
  const landing = exists(PAGES[0]) ? read(PAGES[0]) : '';
  if (landing) {
    const discIdx = landing.indexOf(`id="${DISCLAIMER_ID}"`);
    const firstSection = landing.indexOf('<section');
    if (discIdx !== -1 && firstSection !== -1 && discIdx > firstSection) {
      fail('cogat', `${PAGES[0]}: the disclaimer has moved below the first <section>. It must sit in the hero, visible without scrolling.`);
    }
    if (landing.toLowerCase().indexOf('<footer') !== -1 && discIdx > landing.toLowerCase().indexOf('<footer')) {
      fail('cogat', `${PAGES[0]}: the disclaimer is in the footer. It belongs above the fold.`);
    }
  }

  /* Teacher-facing vocabulary on the landing page.
     /pattern-lab/ is written for a parent who arrived from a search result. None of the
     words the rest of this site uses with teachers means anything to that reader, and all
     of them signal "this is a school product, not for me" — which is the one impression
     that loses the visit. Checked against the RENDERED text, with comments and tags
     stripped, so the page's own source comment explaining this rule does not trip it. */
  const TEACHER_WORDS = /\b(GoodBlocks?|Lab Packs?|Task Forces?|recruit codes?|Mission Control|Jodi's Schoolhouse)\b/i;
  if (exists(PAGES[0])) {
    const visible = read(PAGES[0])
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ');
    const hit = visible.match(TEACHER_WORDS);
    if (hit) {
      fail('cogat',
        `${PAGES[0]}: the landing copy says "${hit[0]}". This page is written for a parent who ` +
        `arrived from a search result, not for a teacher — none of this site's classroom ` +
        `vocabulary means anything to that reader, and all of it reads as "not for me".`);
    }
  }

  /* Score-improvement language. A verb of increase within a short distance of a result
     noun, unless it is negated ("does not raise", "cannot improve"), plus the outright
     promises that need no verb. Deliberately narrow: this is a guard against a marketing
     sentence arriving later, not a thesaurus. */
  const CLAIM = /(?<!\b(?:not|never|cannot|can't|doesn't|does not|won't|will not|no)\s{0,4})\b(raise|raises|boost|boosts|improve|improves|increase|increases|maximi[sz]e|maximi[sz]es|guarantee|guarantees)\b[^.<>]{0,60}?\b(score|scores|percentile|percentiles|result|results|ranking|placement)\b/i;
  const PROMISE = /\b(score guarantee|higher scores?|better scores?|guaranteed placement|raise your child'?s? score)\b/i;
  for (const file of PAGES) {
    if (!exists(file)) continue;
    // Strip tags and comments so a class name or a code comment cannot trip it, and so a
    // sentence split across two elements is still read as one sentence.
    const text = read(file).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    for (const re of [CLAIM, PROMISE]) {
      const hit = text.match(re);
      if (hit) {
        fail('cogat',
          `${file}: reads "${hit[0].trim()}". Nothing on either Pattern Lab page may claim or imply a ` +
          `score improvement — no "raise your child's score", no "improve CogAT results", no percentile ` +
          `promises. It is the standing principle about efficacy claims, and it is the specific claim ` +
          `that would undermine the fair-use position these original questions rest on.`);
      }
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
