// build-bank.js — generates + validates the Pattern Lab item bank
//
// NOT part of any build. Nothing in the repo runs this, and the shipped game does not read
// its output: public/educational-games/pattern-lab/index.html embeds all 297 items inline,
// on purpose, so the page works behind a school content filter with no extra requests.
// This file exists so the bank can be EXTENDED later — add a rule template here, re-run,
// re-validate, and paste the result back into the page's `const BANK`.
//
// bank.json beside this file is the bank the shipped page carries, extracted from the page
// itself so the two can be diffed. As of this commit a clean run of this script reproduces
// it byte for byte and its own validator passes every check — the RNG is seeded, so the
// output is reproducible. That equality is the useful property: it is what lets anyone
// confirm the 297 items embedded in the page are the 297 this validator vouched for.
// Change a rule template and it stops holding, which is the point at which the page's
// `const BANK` has to be re-pasted rather than assumed.
//
//   node scripts/pattern-lab/build-bank.js
const fs = require('fs');
const path = require('path');
const LEVELS = [11, 12, 13];
const out = [];
let seq = {};
const nid = p => { seq[p] = (seq[p] || 0) + 1; return `${p}-${String(seq[p]).padStart(2, '0')}`; };
const uniq = a => [...new Set(a)];
const shuf = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
// deterministic rng so builds are reproducible
let _s = 12345; const rnd = () => (_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

// ============ QUANTITATIVE ============

// --- Number Series ---
function numberSeries() {
  const specs = [
    // L11: single arithmetic / simple geometric
    { lvl: 11, make: () => { const a = ri(2, 9), d = ri(2, 9); const t = [a]; for (let i = 0; i < 5; i++) t.push(t[i] + d); return { t, mech: `A constant step of +${d} between every term. When each gap is the same, the rule is a single addition.` }; } },
    { lvl: 11, make: () => { const a = ri(2, 5), m = ri(2, 3); const t = [a]; for (let i = 0; i < 4; i++) t.push(t[i] * m); return { t, mech: `Each term is the one before it times ${m}. Gaps that grow fast usually mean multiplication, not addition.` }; } },
    { lvl: 11, make: () => { const a = ri(40, 90), d = ri(3, 9); const t = [a]; for (let i = 0; i < 5; i++) t.push(t[i] - d); return { t, mech: `A constant step of \u2212${d}. A falling series still has one rule \u2014 check the gap before assuming it's complicated.` }; } },
    // L12: alternating two operations
    { lvl: 12, make: () => { const a = ri(3, 8), m = 2, d = ri(1, 4); const t = [a]; for (let i = 0; i < 5; i++) t.push(i % 2 === 0 ? t[i] * m : t[i] - d); return { t, mech: `Two operations taking turns: \u00d7${m}, then \u2212${d}. When single-step differences don't work, check if two rules alternate.` }; } },
    { lvl: 12, make: () => { const a = ri(2, 6), p = ri(5, 9), q = ri(2, 4); const t = [a]; for (let i = 0; i < 5; i++) t.push(i % 2 === 0 ? t[i] + p : t[i] - q); return { t, mech: `Alternating +${p} and \u2212${q}. The series moves forward overall, but in two different sized steps.` }; } },
    { lvl: 12, make: () => { const a = ri(2, 5); const t = [a]; for (let i = 0; i < 5; i++) t.push(i % 2 === 0 ? t[i] * 3 : t[i] + 2); return { t, mech: `\u00d73 then +2, repeating. Mixed operations are common at this level \u2014 test the first two gaps separately.` }; } },
    // L13: second differences / compound
    { lvl: 13, make: () => { const a = ri(1, 4), d0 = ri(2, 5), step = ri(2, 4); const t = [a]; let d = d0; for (let i = 0; i < 5; i++) { t.push(t[i] + d); d += step; } return { t, mech: `The gaps themselves grow by ${step} each time. When differences aren't constant, look at the gaps between the gaps.` }; } },
    { lvl: 13, make: () => { const a = ri(1, 3), b = ri(2, 5); const t = [a, b]; for (let i = 0; i < 4; i++) t.push(t[t.length - 1] + t[t.length - 2]); return { t, mech: `Each term is the sum of the two before it. When a series grows faster than addition but slower than doubling, test the sum rule.` }; } },
    { lvl: 13, make: () => { const a = ri(2, 4); const t = [a]; for (let i = 0; i < 5; i++) t.push(t[i] * 2 + 1); return { t, mech: `Double, then add 1 \u2014 a compound rule applied every step. Test \u00d72 first, then see what's left over.` }; } },
    { lvl: 13, make: () => { const a = ri(2, 5); const t = []; for (let i = 0; i < 6; i++) t.push(a + i * i); return { t, mech: `The gaps are 1, 3, 5, 7 \u2014 consecutive odd numbers, which means square numbers are being added.` }; } },
  ];
  const per = { 11: 11, 12: 11, 13: 11 };
  LEVELS.forEach(L => {
    const pool = specs.filter(s => s.lvl === L);
    const seen = new Set();
    let guard = 0;
    while ((out.filter(o => o.sub === 'number-series' && o.lvl === L).length) < per[L] && guard++ < 400) {
      const sp = pool[ri(0, pool.length - 1)];
      const { t, mech } = sp.make();
      if (t.some(v => v < 0 || v > 999 || !Number.isInteger(v))) continue;
      const key = t.join(',');
      if (seen.has(key)) continue; seen.add(key);
      const ans = t[t.length - 1];
      out.push({ id: nid('N-S'), sub: 'number-series', lvl: L, type: 'num',
        series: t.slice(0, -1).map(String).concat('?'), ans: String(ans), mech });
    }
  });
}

// --- Number Analogies ---
function numberAnalogies() {
  const ops = {
    11: [
      { f: (x, k) => x * k, k: () => ri(2, 5), d: k => `\u00d7${k}`, mech: k => `\u00d7${k} in both pairs. Test multiplication before addition \u2014 a difference that fits one pair often fails the other.` },
      { f: (x, k) => x + k, k: () => ri(4, 15), d: k => `+${k}`, mech: k => `+${k} in both pairs. Check the gap in the first pair, then confirm it holds in the second.` },
      { f: (x, k) => x - k, k: () => ri(3, 9), d: k => `\u2212${k}`, mech: k => `\u2212${k} in both pairs. A shrinking pair still follows one consistent rule.` },
    ],
    12: [
      { f: (x, k) => x / 2 - k, k: () => ri(1, 3), d: k => `\u00f72 then \u2212${k}`, mech: k => `Halve, then subtract ${k}. Two-step rules are common here \u2014 if one operation doesn't fit both pairs, try a pair of them.`, need: x => x % 2 === 0 },
      { f: (x, k) => x * 2 + k, k: () => ri(1, 5), d: k => `\u00d72 then +${k}`, mech: k => `Double, then add ${k}. Test doubling first and see what's left over.` },
      { f: (x, k) => x * 3 - k, k: () => ri(2, 6), d: k => `\u00d73 then \u2212${k}`, mech: k => `Triple, then subtract ${k}. When \u00d73 overshoots consistently, look for a subtraction after it.` },
    ],
    13: [
      { f: (x) => x * x, k: () => 0, d: () => 'squared', mech: () => `Each number is squared. When the second value grows much faster than the first, test squaring.`, need: x => x <= 12 },
      { f: (x, k) => (x + k) * 2, k: () => ri(1, 4), d: k => `+${k} then \u00d72`, mech: k => `Add ${k}, then double. Order matters \u2014 doubling first gives a different result.` },
      { f: (x, k) => x * x - k, k: () => ri(1, 5), d: k => `squared then \u2212${k}`, mech: k => `Square it, then subtract ${k}. Two-step rules built on squares appear at this level.`, need: x => x <= 10 },
    ],
  };
  LEVELS.forEach(L => {
    const seen = new Set(); let guard = 0;
    while (out.filter(o => o.sub === 'number-analogies' && o.lvl === L).length < 11 && guard++ < 600) {
      const op = ops[L][ri(0, ops[L].length - 1)];
      const k = op.k();
      const pick = () => { for (let i = 0; i < 40; i++) { const x = ri(2, 14); if ((!op.need || op.need(x)) && Number.isInteger(op.f(x, k)) && op.f(x, k) > 0) return x; } return null; };
      const a = pick(), b = pick(), c = pick();
      if (a == null || b == null || c == null) continue;
      if (new Set([a, b, c]).size < 3) continue;
      const A = op.f(a, k), B = op.f(b, k), C = op.f(c, k);
      const key = `${a},${b},${c},${k},${op.d(k)}`;
      if (seen.has(key)) continue; seen.add(key);
      // distractors: plausible wrong rules
      const cands = uniq([C + ri(2, 5), C - ri(2, 5), c * 2, c + (A - a), Math.round(C * 1.5)])
        .filter(v => v !== C && v > 0 && Number.isInteger(v)).slice(0, 3);
      if (cands.length < 3) continue;
      const opts = shuf([C, ...cands], rnd).map(String);
      out.push({ id: nid('N-A'), sub: 'number-analogies', lvl: L, type: 'mc',
        stem: `<span class="hl">[${a} \u2192 ${A}]</span> &nbsp;and&nbsp; <span class="hl">[${b} \u2192 ${B}]</span><br>so &nbsp;<span class="hl">[${c} \u2192 ?]</span>`,
        opts, ans: opts.indexOf(String(C)), mech: op.mech(k) });
    }
  });
}

// --- Number Puzzles ---
function numberPuzzles() {
  const forms = {
    11: [
      () => { const b = ri(2, 12), r = ri(3, 9), t = b + r; return { stem: `<span class="hl">\u2610</span> + ${r} = ${t + ri(1, 6)} \u2212 ${ri(1, 6)}`, ans: b, mech: `Solve the side without the box first, then work backwards.`, build: true }; },
      () => { const b = ri(3, 15), a = ri(2, 9); return { stem: `<span class="hl">\u2610</span> + ${a} = ${b + a}`, ans: b, mech: `A single step: subtract ${a} from both sides to leave the box alone.` }; },
      () => { const b = ri(4, 18), a = ri(2, 9); return { stem: `<span class="hl">\u2610</span> \u2212 ${a} = ${b - a}`, ans: b, mech: `The box is larger than the result shown, so add ${a} back to recover its original value.` }; },
    ],
    12: [
      () => { const b = ri(2, 9), m = ri(2, 5), a = ri(1, 9); return { stem: `${m} \u00d7 <span class="hl">\u2610</span> + ${a} = ${m * b + a}`, ans: b, mech: `Undo in reverse order: subtract ${a} first, then divide by ${m}.` }; },
      () => { const b = ri(2, 9), m = ri(2, 6), t = m * b; return { stem: `<span class="hl">\u2610</span> \u00d7 ${m} = ${t}`, ans: b, mech: `The box is multiplied, so divide to undo it: ${t} \u00f7 ${m} gives the answer.` }; },
      () => { const b = ri(2, 10), a = ri(2, 6), c = ri(1, 5); return { stem: `<span class="hl">\u2610</span> + ${a} = ${b + a + c} \u2212 ${c}`, ans: b, mech: `Simplify the right-hand side completely before doing anything with the box.` }; },
    ],
    13: [
      () => { const t = ri(2, 6), b = ri(2, 9), m = ri(3, 6); return { stem: `If <span class="hl">\u25b2</span> = ${t}, then &nbsp; ${m} \u00d7 <span class="hl">\u25b2</span> \u2212 <span class="hl">\u2610</span> = ${m * t - b}`, ans: b, mech: `Substitute the known symbol before solving. ${m} \u00d7 ${t} = ${m * t}.` }; },
      () => { const t = ri(2, 5), b = ri(2, 8), a = ri(2, 4); return { stem: `If <span class="hl">\u25b2</span> = ${t}, then &nbsp; <span class="hl">\u2610</span> + <span class="hl">\u25b2</span> \u00d7 ${a} = ${b + t * a}`, ans: b, mech: `Multiplication happens before addition. ${t} \u00d7 ${a} = ${t * a}, then solve for the box.` }; },
      () => { const b = ri(2, 8), m = ri(2, 4), a = ri(2, 6); return { stem: `${m} \u00d7 (<span class="hl">\u2610</span> + ${a}) = ${m * (b + a)}`, ans: b, mech: `Divide both sides by ${m} first, then subtract ${a}. Brackets come apart from the outside in.` }; },
    ],
  };
  LEVELS.forEach(L => {
    const seen = new Set(); let guard = 0;
    while (out.filter(o => o.sub === 'number-puzzles' && o.lvl === L).length < 11 && guard++ < 600) {
      const f = forms[L][ri(0, forms[L].length - 1)];
      const r = f();
      if (r.build) continue; // skip the malformed template
      if (!Number.isInteger(r.ans) || r.ans <= 0) continue;
      if (seen.has(r.stem)) continue; seen.add(r.stem);
      out.push({ id: nid('N-P'), sub: 'number-puzzles', lvl: L, type: 'num', stem: r.stem, ans: String(r.ans), mech: r.mech });
    }
  });
}

// ============ NONVERBAL ============
const C = ['T', 'O', 'G'];
const SHAPES = ['sq', 'tri', 'cir', 'dia', 'pent', 'hex'];

function figureMatrices() {
  const gens = {
    11: [
      // color per row, shape per column
      () => { const cs = shuf(C, rnd), sh = shuf(SHAPES, rnd).slice(0, 3);
        const cells = []; cs.forEach(c => sh.forEach(s => cells.push(`F.${s}(${c},1)`)));
        const ansS = cells.pop();
        return { cells: [...cells, null], ans: ansS,
          distr: [`F.${sh[1]}(${cs[2]},1)`, `F.${sh[2]}(${cs[1]},1)`, `F.${sh[2]}(${cs[2]},0)`],
          mech: `Color stays the same across each row; the shape changes down the columns. Two rules, one per direction.` }; },
      // shape per row, color per column
      () => { const cs = shuf(C, rnd), sh = shuf(SHAPES, rnd).slice(0, 3);
        const cells = []; sh.forEach(s => cs.forEach(c => cells.push(`F.${s}(${c},1)`)));
        const ansS = cells.pop();
        return { cells: [...cells, null], ans: ansS,
          distr: [`F.${sh[2]}(${cs[0]},1)`, `F.${sh[1]}(${cs[2]},1)`, `F.${sh[2]}(${cs[2]},0)`],
          mech: `Each row keeps one shape; the color changes in the same order across every row.` }; },
    ],
    12: [
      // color per row, rotation per column (arrows)
      () => { const cs = shuf(C, rnd); const cells = [];
        cs.forEach(c => [0, 90, 180].forEach(r => cells.push(`F.arr(${c},${r})`)));
        const ansS = cells.pop();
        return { cells: [...cells, null], ans: ansS,
          distr: [`F.arr(${cs[2]},270)`, `F.arr(${cs[1]},180)`, `F.arr(${cs[2]},0)`],
          mech: `Two rules at once: color is constant along each row, rotation advances 90\u00b0 across it. Track them separately.` }; },
      // count increases across, row start increases down
      () => { const cs = shuf(C, rnd); const cells = [];
        cs.forEach((c, r) => [0, 1, 2].forEach(i => cells.push(`F.dots(${c},${1 + r + i})`)));
        const ansS = cells.pop();
        return { cells: [...cells, null], ans: ansS,
          distr: [`F.dots(${cs[2]},6)`, `F.dots(${cs[2]},4)`, `F.dots(${cs[1]},5)`],
          mech: `Count increases by 1 across each row, and each row starts one higher than the last. Two dimensions moving together.` }; },
    ],
    13: [
      // rotation advances across AND each row offset (L-shape)
      () => { const cs = shuf(C, rnd); const cells = [];
        cs.forEach((c, r) => [0, 1, 2].forEach(i => cells.push(`F.ell(${c},${((r + i) * 90) % 360})`)));
        const ansS = cells.pop();
        return { cells: [...cells, null], ans: ansS,
          distr: [`F.ell(${cs[2]},90)`, `F.ell(${cs[2]},180)`, `F.ell(${cs[1]},0)`],
          mech: `Rotation advances 90\u00b0 across each row and each row starts 90\u00b0 further along. Past 270\u00b0 it wraps back to 0\u00b0.` }; },
      // pac rotation two-rule
      () => { const cs = shuf(C, rnd); const cells = [];
        cs.forEach((c, r) => [0, 1, 2].forEach(i => cells.push(`F.pac(${c},${((r * 2 + i) * 90) % 360})`)));
        const ansS = cells.pop();
        return { cells: [...cells, null], ans: ansS,
          distr: [`F.pac(${cs[2]},0)`, `F.pac(${cs[2]},90)`, `F.cir(${cs[2]},1)`],
          mech: `The missing quarter rotates 90\u00b0 across each row, and each row starts two steps further on than the last.` }; },
      // striped squares rotating
      () => { const cs = shuf(C, rnd); const cells = [];
        cs.forEach((c, r) => [0, 1, 2].forEach(i => cells.push(`F.stripe(${c},${((r + i) * 45) % 180})`)));
        const ansS = cells.pop();
        return { cells: [...cells, null], ans: ansS,
          distr: [`F.stripe(${cs[2]},0)`, `F.stripe(${cs[2]},45)`, `F.stripe(${cs[1]},90)`],
          mech: `The stripes rotate 45\u00b0 at each step across a row, and each row picks up where the previous one's angle left off.` }; },
    ],
  };
  LEVELS.forEach(L => {
    const seen = new Set(); let guard = 0;
    while (out.filter(o => o.sub === 'figure-matrices' && o.lvl === L).length < 11 && guard++ < 600) {
      const g = gens[L][ri(0, gens[L].length - 1)]();
      const key = g.cells.join('|') + g.ans;
      if (seen.has(key)) continue; seen.add(key);
      const d = uniq(g.distr).filter(x => x !== g.ans).slice(0, 3);
      if (d.length < 3) continue;
      const opts = shuf([g.ans, ...d], rnd);
      out.push({ id: nid('F-M'), sub: 'figure-matrices', lvl: L, type: 'matrix',
        cells: g.cells, opts, ans: opts.indexOf(g.ans), mech: g.mech });
    }
  });
}

function figureClassification() {
  const gens = {
    11: [
      () => { const c = C[ri(0, 2)], sh = shuf(SHAPES, rnd);
        return { given: sh.slice(0, 3).map(s => `F.${s}(${c},1)`), ans: `F.${sh[3]}(${c},1)`,
          distr: [`F.${sh[3]}(${c},0)`, `F.${sh[4]}(${C.filter(x => x !== c)[0]},1)`, `F.${sh[0]}(${c},0)`],
          mech: `All three are solid-filled and the same color. The shape itself varies \u2014 so shape isn't the rule.` }; },
      () => { const c = C[ri(0, 2)], sh = shuf(SHAPES, rnd);
        return { given: sh.slice(0, 3).map(s => `F.${s}(${c},0)`), ans: `F.${sh[3]}(${c},0)`,
          distr: [`F.${sh[3]}(${c},1)`, `F.${sh[4]}(${C.filter(x => x !== c)[0]},0)`, `F.${sh[1]}(${c},1)`],
          mech: `Every figure is an outline, never filled, and all in one color. Two attributes have to hold at once.` }; },
    ],
    12: [
      () => { const cs = shuf(C, rnd); const ev = shuf([2, 4, 6, 8], rnd);
        return { given: [`F.dots(${cs[0]},${ev[0]})`, `F.dots(${cs[1]},${ev[1]})`, `F.dots(${cs[2]},${ev[2]})`],
          ans: `F.dots(${cs[0]},${ev[3]})`,
          distr: [`F.dots(${cs[0]},${ev[0] + 1})`, `F.dots(${cs[1]},${ev[1] + 1})`, `F.dots(${cs[2]},5)`],
          mech: `Every group has an even number of dots. Color changes each time, so color can't be what binds them.` }; },
      () => { const c = C[ri(0, 2)], rots = shuf([0, 90, 180, 270], rnd);
        return { given: rots.slice(0, 3).map(r => `F.arr(${c},${r})`), ans: `F.arr(${c},${rots[3]})`,
          distr: [`F.arr(${C.filter(x => x !== c)[0]},${rots[3]})`, `F.cir(${c},1)`, `F.dia(${c},1)`],
          mech: `All are the same arrow in the same color, just pointing different ways. Rotation is allowed to vary; everything else isn't.` }; },
    ],
    13: [
      () => { const cs = shuf(C, rnd), ns = shuf([2, 3, 4, 5], rnd);
        return { given: [`F.sqdots(${cs[0]},${ns[0]})`, `F.sqdots(${cs[1]},${ns[1]})`, `F.sqdots(${cs[2]},${ns[2]})`],
          ans: `F.sqdots(${cs[0]},${ns[3]})`,
          distr: [`F.dots(${cs[1]},${ns[3]})`, `F.cir(${cs[0]},0)`, `F.sq(${cs[2]},0)`],
          mech: `Every figure is a square outline with dots inside it. The count and color both vary \u2014 the container is what binds them.` }; },
      () => { const cs = shuf(C, rnd), rots = shuf([0, 90, 180, 270], rnd);
        return { given: rots.slice(0, 3).map((r, i) => `F.pac(${cs[i]},${r})`), ans: `F.pac(${cs[0]},${rots[3]})`,
          distr: [`F.cir(${cs[0]},1)`, `F.cir(${cs[1]},0)`, `F.dia(${cs[2]},1)`],
          mech: `Each is a circle with one quarter removed, at a different rotation. A whole circle fails the defining feature.` }; },
      () => { const c = C[ri(0, 2)], rots = shuf([0, 45, 90, 135], rnd);
        return { given: rots.slice(0, 3).map(r => `F.stripe(${c},${r})`), ans: `F.stripe(${c},${rots[3]})`,
          distr: [`F.sq(${c},0)`, `F.stripe(${C.filter(x => x !== c)[0]},${rots[3]})`, `F.sq(${c},1)`],
          mech: `Striped squares in one color. A plain square outline has the shape but not the stripes \u2014 both matter.` }; },
    ],
  };
  LEVELS.forEach(L => {
    const seen = new Set(); let guard = 0;
    while (out.filter(o => o.sub === 'figure-classification' && o.lvl === L).length < 11 && guard++ < 600) {
      const g = gens[L][ri(0, gens[L].length - 1)]();
      const key = g.given.join('|') + g.ans;
      if (seen.has(key)) continue; seen.add(key);
      const d = uniq(g.distr).filter(x => x !== g.ans && !g.given.includes(x)).slice(0, 3);
      if (d.length < 3) continue;
      const opts = shuf([g.ans, ...d], rnd);
      out.push({ id: nid('F-C'), sub: 'figure-classification', lvl: L, type: 'figclass',
        given: g.given, opts, ans: opts.indexOf(g.ans), mech: g.mech });
    }
  });
}

function paperFolding() {
  // mirror across fold: v -> x' = 100-x ; h -> y' = 100-y
  const mir = (h, f) => f === 'v' ? [100 - h[0], h[1]] : [h[0], 100 - h[1]];
  const key = hs => JSON.stringify(hs.map(h => h.map(Math.round)).sort());
  const cfg = {
    11: { n: 1 }, 12: { n: 2 }, 13: { n: 3 },
  };
  LEVELS.forEach(L => {
    const seen = new Set(); let guard = 0;
    while (out.filter(o => o.sub === 'paper-folding' && o.lvl === L).length < 11 && guard++ < 800) {
      const f = rnd() < 0.5 ? 'v' : 'h';
      const n = cfg[L].n;
      const holes = [];
      for (let i = 0; i < n; i++) {
        // punch on the folded (visible) half only
        const x = f === 'v' ? ri(22, 44) : ri(22, 78);
        const y = f === 'v' ? ri(22, 78) : ri(22, 44);
        holes.push([x, y]);
      }
      if (new Set(holes.map(h => h.join(','))).size < n) continue;
      const full = [...holes, ...holes.map(h => mir(h, f))];
      const k = key(full);
      if (seen.has(k)) continue; seen.add(k);
      const S = hs => `F.sheet(${JSON.stringify(hs)})`;
      const distr = uniq([
        S(holes),                                   // forgot to unfold
        S(holes.map(h => mir(h, f))),               // only the mirror
        S([...holes, mir(holes[0], f === 'v' ? 'h' : 'v')]), // mirrored wrong axis
      ]).filter(x => x !== S(full)).slice(0, 3);
      if (distr.length < 3) continue;
      const opts = shuf([S(full), ...distr], rnd);
      const mech = n === 1
        ? `One punch through folded paper makes two holes \u2014 the original and its mirror across the fold line.`
        : f === 'v'
          ? `A vertical fold mirrors left to right. Each of the ${n} punches becomes two, giving ${n * 2}.`
          : `A horizontal fold mirrors top to bottom \u2014 not left to right. Match the mirror direction to the fold line.`;
      out.push({ id: nid('P-F'), sub: 'paper-folding', lvl: L, type: 'fold',
        fold: f, punched: holes, opts, ans: opts.indexOf(S(full)), mech });
    }
  });
}

// ============ VERBAL (authored) ============
const VERBAL = require('./verbal-items.js');
function verbal() { VERBAL.forEach(v => out.push(v)); }

// ============ RUN + VALIDATE ============
numberSeries(); numberAnalogies(); numberPuzzles();
figureMatrices(); figureClassification(); paperFolding();
verbal();

const errs = [];
const SUBIDS = ['verbal-analogies', 'verbal-classification', 'sentence-completion',
  'number-series', 'number-analogies', 'number-puzzles',
  'figure-matrices', 'figure-classification', 'paper-folding'];

out.forEach(q => {
  if (!SUBIDS.includes(q.sub)) errs.push(`${q.id}: bad sub ${q.sub}`);
  if (!LEVELS.includes(q.lvl)) errs.push(`${q.id}: bad level`);
  if (!q.mech || q.mech.length < 25) errs.push(`${q.id}: weak mechanism`);
  if (q.type === 'num') {
    if (!/^\d+$/.test(String(q.ans))) errs.push(`${q.id}: non-numeric answer`);
  } else {
    if (!Array.isArray(q.opts) || q.opts.length !== 4) errs.push(`${q.id}: needs 4 options`);
    if (!(q.ans >= 0 && q.ans < 4)) errs.push(`${q.id}: answer index out of range`);
    if (new Set(q.opts).size !== q.opts.length) errs.push(`${q.id}: duplicate options`);
  }
  if (q.type === 'matrix') {
    if (q.cells.length !== 9) errs.push(`${q.id}: grid must be 9 cells`);
    if (q.cells.filter(c => c === null).length !== 1) errs.push(`${q.id}: exactly one blank`);
    if (q.cells.includes(q.opts[q.ans])) errs.push(`${q.id}: answer already visible in grid`);
  }
  if (q.type === 'figclass') {
    if (q.given.length !== 3) errs.push(`${q.id}: needs 3 given figures`);
    if (q.given.includes(q.opts[q.ans])) errs.push(`${q.id}: answer duplicates a given figure`);
  }
  if (q.type === 'fold') {
    const mir = (h, f) => f === 'v' ? [100 - h[0], h[1]] : [h[0], 100 - h[1]];
    const expect = [...q.punched, ...q.punched.map(h => mir(h, q.fold))];
    const got = JSON.parse(q.opts[q.ans].replace('F.sheet(', '').replace(/\)$/, ''));
    const norm = a => JSON.stringify(a.map(x => x.map(Math.round)).sort());
    if (norm(expect) !== norm(got)) errs.push(`${q.id}: unfold result doesn't match the mirror rule`);
  }
});

// answer must not be recoverable by surface pattern-matching the stem
out.filter(q => q.type === 'mc' && (q.sub.startsWith('verbal') || q.sub === 'sentence-completion')).forEach(q => {
  const stem = q.stem.toLowerCase().replace(/<[^>]+>/g, '');
  const ans = String(q.opts[q.ans]).toLowerCase();
  if (ans.length >= 4 && stem.includes(ans)) errs.push(`${q.id}: answer "${ans}" appears inside the stem \u2014 answerable by surface match`);
});

const ids = out.map(o => o.id);
if (new Set(ids).size !== ids.length) errs.push('duplicate ids present');

// coverage
const cov = {};
out.forEach(q => { cov[q.sub] = cov[q.sub] || {}; cov[q.sub][q.lvl] = (cov[q.sub][q.lvl] || 0) + 1; });

console.log('TOTAL ITEMS:', out.length);
console.log('\nCoverage (subtest x level):');
SUBIDS.forEach(s => console.log('  ' + s.padEnd(24), LEVELS.map(l => `L${l}:${String((cov[s] || {})[l] || 0).padStart(2)}`).join('  ')));
console.log('\nVALIDATION:', errs.length ? `${errs.length} ERRORS` : 'all checks passed');
errs.slice(0, 20).forEach(e => console.log('  ✗', e));

// Beside this script, not in whatever directory it happened to be run from.
fs.writeFileSync(path.join(__dirname, 'bank.json'), JSON.stringify(out, null, 0));
console.log('\nwrote bank.json');
