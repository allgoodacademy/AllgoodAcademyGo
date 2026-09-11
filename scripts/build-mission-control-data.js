#!/usr/bin/env node
// Generates public/mission-control/module-data.js — the step titles and choice text Mission
// Control needs to turn a stored scenario_attempts document back into the words a student
// actually saw on screen.
//
// Nothing here is authored by hand. Every value is extracted from the module that owns it:
//
//   SCENARIO_DATA  in public/educational-games/digital-decisions/index.html  (the Challenge)
//   CASE_TITLES    in each lab's index.html                                  (step names)
//   CASE_CHOICES   in each lab's index.html                                  (choice text)
//   Telemetry.init({ stepsTotal })                                           (how many steps)
//
// That matters because choice text drifts: a scenario gets reworded, an option is reordered,
// and a dashboard holding its own copy starts confidently attributing the wrong sentence to a
// student. Run this after touching any of those arrays; scripts/check-modules.js fails if the
// generated file is stale.
//
// No dependencies. Run with `node scripts/build-mission-control-data.js`.
//   --check   exit 1 instead of writing if the file on disk is out of date
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// Pulls one array literal out of a source file by walking brackets from `const NAME = [`,
// so nested arrays/objects and any brackets inside strings don't end it early.
function extractArrayLiteral(src, name, where) {
  const start = src.indexOf(`const ${name} = [`);
  if (start === -1) throw new Error(`${where}: const ${name} = [ not found`);
  const open = src.indexOf('[', start);
  let depth = 0, inStr = null, esc = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === '\\') esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  throw new Error(`${where}: const ${name} = [ is never closed`);
}

// The extracted text is a plain data literal from a file this repo controls, so evaluating it
// is how it becomes data. Nothing user-supplied reaches here.
function evalArray(literal, where) {
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`return (${literal});`)();
  } catch (e) {
    throw new Error(`${where}: array literal did not parse — ${e.message}`);
  }
}

function stepsTotalOf(src, where) {
  const m = src.match(/Telemetry\.init\(\{[^}]*stepsTotal:\s*(\d+)/);
  if (!m) throw new Error(`${where}: Telemetry.init({ ... stepsTotal }) not found`);
  return Number(m[1]);
}

function gameNameOf(src, where) {
  const m = src.match(/Telemetry\.init\(\{[^}]*gameName:\s*'([^']+)'/);
  if (!m) throw new Error(`${where}: Telemetry.init({ ... gameName }) not found`);
  return m[1];
}

function moduleSlugOf(src, where) {
  const m = src.match(/Telemetry\.init\(\{\s*module:\s*'([^']+)'/);
  if (!m) throw new Error(`${where}: Telemetry.init({ module }) not found`);
  return m[1];
}

// --- the Challenge -----------------------------------------------------------------------
// Each scenario is one step. DDC writes scenarioIndex 1-BASED (see logScenarioAttempt), which
// is the one place the two shapes differ, so it is recorded rather than assumed downstream.
const DDC_FILE = 'public/educational-games/digital-decisions/index.html';
const ddcSrc = read(DDC_FILE);
const scenarios = evalArray(extractArrayLiteral(ddcSrc, 'SCENARIO_DATA', DDC_FILE), DDC_FILE);

const ddc = {
  id: 'ddc',
  name: 'Digital Decisions',
  slug: moduleSlugOf(ddcSrc, DDC_FILE),
  gameNames: [gameNameOf(ddcSrc, DDC_FILE)],
  kind: 'challenge',
  indexBase: 1,
  stepsTotal: stepsTotalOf(ddcSrc, DDC_FILE),
  steps: scenarios.map((s) => ({
    title: s.title,
    category: s.cat,
    choices: s.choices.map((c) => ({ text: c.text, score: c.score, effectiveness: c.effectiveness })),
  })),
};
if (ddc.steps.length !== ddc.stepsTotal) {
  throw new Error(`${DDC_FILE}: SCENARIO_DATA has ${ddc.steps.length} scenarios but Telemetry.init says stepsTotal ${ddc.stepsTotal}`);
}

// --- the labs ----------------------------------------------------------------------------
// Labs write scenarioIndex 0-BASED: it is the same pageIndex markReady() takes, so Case N
// lands at index N-1. A null entry in CASE_CHOICES is a Case with nothing to grade (the intro
// montage and the handoff), and stays null here rather than becoming an empty option list.
const LAB_IDS = ['social-intelligence', 'privacy-security', 'professional-brand', 'digital-citizenship'];
const LAB_NAMES = {
  'social-intelligence': 'Social Intelligence',
  'privacy-security': 'Privacy & Security',
  'professional-brand': 'Professional Brand',
  'digital-citizenship': 'Digital Citizenship',
};

const labs = LAB_IDS.map((id) => {
  const file = `public/jsh/digital-decisions-lab/${id}/index.html`;
  const src = read(file);
  const titles = evalArray(extractArrayLiteral(src, 'CASE_TITLES', file), file);
  const choices = evalArray(extractArrayLiteral(src, 'CASE_CHOICES', file), file);
  const stepsTotal = stepsTotalOf(src, file);

  if (titles.length !== stepsTotal) {
    throw new Error(`${file}: CASE_TITLES has ${titles.length} entries but Telemetry.init says stepsTotal ${stepsTotal}`);
  }
  if (choices.length !== stepsTotal) {
    throw new Error(`${file}: CASE_CHOICES has ${choices.length} entries but Telemetry.init says stepsTotal ${stepsTotal} — every Case needs an entry, null for the ungraded ones`);
  }

  return {
    id,
    name: LAB_NAMES[id],
    slug: moduleSlugOf(src, file),
    gameNames: [gameNameOf(src, file)],
    kind: 'lab',
    indexBase: 0,
    stepsTotal,
    steps: titles.map((title, i) => ({
      title,
      category: null,
      choices: choices[i] ? choices[i].map((text) => ({ text, score: null, effectiveness: null })) : null,
    })),
  };
});

// --- emit --------------------------------------------------------------------------------
const modules = {};
for (const m of [ddc, ...labs]) modules[m.id] = m;

const out = `// GENERATED FILE — DO NOT EDIT BY HAND.
// Produced by scripts/build-mission-control-data.js from the modules themselves:
// SCENARIO_DATA in the Digital Decisions Challenge, and CASE_TITLES / CASE_CHOICES in each
// lab. Edit those arrays and re-run the script; \`node scripts/check-modules.js\` fails if
// this file has drifted from them.
//
// indexBase records how each module numbers the scenarioIndex it writes to
// scenario_attempts: the Challenge is 1-based, every lab is 0-based.
export const MODULE_DATA = ${JSON.stringify(modules, null, 2)};

export default MODULE_DATA;
`;

const OUT_FILE = 'public/mission-control/module-data.js';
const outPath = path.join(root, OUT_FILE);

if (process.argv.includes('--check')) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';
  if (current !== out) {
    console.error(`${OUT_FILE} is out of date — run: node scripts/build-mission-control-data.js`);
    process.exit(1);
  }
  console.log(`${OUT_FILE} is up to date.`);
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out);
  const graded = Object.values(modules).reduce((n, m) => n + m.steps.filter((s) => s.choices).length, 0);
  console.log(`Wrote ${OUT_FILE} — ${Object.keys(modules).length} modules, ${graded} graded steps.`);
}
