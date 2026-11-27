// Seeds the LOCAL Firebase emulators (never production) with a believable Mission Control
// class, for browser UAT of the drill-down, multiple classes and the Pro plan.
//
//   firebase emulators:start --only auth,firestore,storage --project allgood-academy
//   node scripts/uat/seed-emulator.mjs
//
// It refuses to run unless all three *_EMULATOR_HOST variables point at localhost, so it
// cannot write to the live project by accident. Every teacher and class code it creates is prefixed
// UAT, and every uid uat_ (student nicknames stay plain, as a real class's would). Choices are real: scenario indices and choice indices are taken
// from public/mission-control/module-data.js, so every label the page shows is one a real
// student would have seen.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { MODULE_DATA } from '../../public/mission-control/module-data.js';

process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= '127.0.0.1:9199';
for (const k of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[k])) throw new Error(`${k} must point at a local emulator`);
}

const APP = 'allgood-academy';
initializeApp({ projectId: APP, storageBucket: 'allgood-academy.firebasestorage.app' });
const db = getFirestore();
const auth = getAuth();
const A = (...p) => db.doc(['artifacts', APP, ...p].join('/'));
const NOW = Date.now();
const DAY = 86400000;
const ts = (ms) => Timestamp.fromMillis(ms);

// A deterministic pseudo-random sequence, so every run seeds the same class.
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

async function teacher(uid, email, name, extra = {}) {
  await auth.createUser({ uid, email, password: 'uat-password-1', displayName: name, emailVerified: true }).catch((e) => {
    if (!String(e.code).includes('already-exists')) throw e;
  });
  await A('users', uid).set({ role: 'teacher', displayName: name, email, teacherConsent: { acceptedAt: NOW }, ...extra });
}
async function classroom(code, teacherUid, teacherName, name, assigned = {}) {
  await A('classrooms', code).set({ teacherUid, teacherName, name, createdAt: ts(NOW - 30 * DAY), ...assigned });
}

const NAMES = ['Maya', 'Jordan', 'Sam', 'Alex', 'Priya', 'Diego', 'Ava', 'Noah', 'Zoe', 'Eli', 'Lena', 'Marcus', 'Ivy', 'Theo',
  'Nia', 'Owen', 'Ruby', 'Kai', 'Sofia', 'Leo', 'Tess', 'Omar', 'June', 'Finn', 'Rosa', 'Ben', 'Hana', 'Luca', 'Mira', 'Ezra',
  'Cleo', 'Felix', 'Iris'];

let evN = 0;
async function event(uid, module, stream, event, meta, t, sessionId = `s_${uid}_${module}`) {
  evN += 1;
  await A('events', `uat_e${evN}`).set({ uid, role: 'student', isGuest: true, module, gameName: module, stream, sessionId, event, step: null, meta, device: 'chromebook', entry: 'direct', ts: ts(t), clientTs: t });
}
async function session(uid, module, stream, { maxStep, stepsTotal, completed = false, activeMs, at, summary, gameName }) {
  const id = `uat_${uid}_${module}`;
  await A('sessions', id).set({ uid, role: 'student', isGuest: true, module, gameName: gameName || module, stream, sessionId: `s_${uid}_${module}`,
    stepsTotal, startedAt: ts(at - activeMs - 60000), lastSeenAt: ts(at), activeMs, maxStep, completed, device: pick(['chromebook', 'chromebook', 'phone', 'desktop']), entry: 'direct',
    ...(summary ? { summary } : {}) });
}

/* One student's El Mundial: `reached` Puertas answered (0 = joined, never opened). The class
   finds conocía / conocí (Puerta 4) hard. Shapes match what the story page writes: one
   `choice` event per Puerta (with `picks` for the ones with several blanks) and per fork, the
   session summary, module_progress and, when finished, a game_scores record. */
async function mundial(uid, i, { finished, reached }) {
  if (!reached) return;
  const at = NOW - (1 + (i % 5)) * DAY - i * 600000;
  const sid = `s_${uid}_el-mundial`;
  const fork = ['plaza', 'metro', 'super'][i < 11 ? 0 : (i < 17 ? 1 : 2)];
  const choice = {}, conf = {}, done = {}, gates = {};
  let t = at - 25 * 60000;
  const flip = (p) => rnd() < p;
  const gate = async (n, score, choiceIndex, picks) => {
    done[n] = 1; conf[n] = score; gates[n] = score; t += 4 * 60000;
    await event(uid, 'el-mundial', 'espanol', 'choice', { scenarioIndex: n, choiceIndex, score, category: 'gate', ...(picks ? { picks } : {}) }, t, sid);
  };
  if (reached >= 1) { const k = flip(0.85) ? 'A' : (flip(0.6) ? 'B' : 'C'); choice[1] = k; await gate(1, k === 'A' ? 1 : 0, 'ABC'.indexOf(k)); }
  t += 60000;
  await event(uid, 'el-mundial', 'espanol', 'choice', { scenarioIndex: 'f1', choiceIndex: ['plaza', 'metro', 'super'].indexOf(fork), category: 'fork' }, t, sid);
  if (reached >= 2) { const k = flip(0.7) ? 'A' : 'B'; choice[2] = k; await gate(2, k === 'A' ? 1 : 0, 'AB'.indexOf(k)); }
  if (reached >= 3) {
    const v = { 1: flip(0.85) ? 'cantaban' : 'cantaron', 2: flip(0.92) ? 'falló' : 'fallaba', 3: flip(0.88) ? 'cantaban' : 'cantaron' };
    const right = (v[1] === 'cantaban') + (v[2] === 'falló') + (v[3] === 'cantaban');
    choice[3] = v; await gate(3, right === 3 ? 1 : 0, right, v);
  }
  if (reached >= 4) {
    // 13 of the 21 who get here say "hoy conocía": the count the report leads with.
    const v = { a: flip(0.75) ? 'conocía' : 'conocí', b: i % 21 < 13 ? 'conocía' : 'conocí' };
    const ok = v.a === 'conocía' && v.b === 'conocí';
    choice[4] = v; await gate(4, ok ? 1 : 0, (v.a === 'conocía') + (v.b === 'conocí'), v);
  }
  if (reached >= 5) {
    const v = { 51: flip(0.6) ? 'conocí' : 'conocía', 52: flip(0.7) ? 'tenía' : 'tuvo', 53: flip(0.5) ? 'fui' : 'era', 54: flip(0.8) ? 'llegamos' : 'llegábamos', 55: flip(0.65) ? 'llovía' : 'llovió' };
    const right = (v[51] === 'conocí') + (v[52] === 'tenía') + 1 + (v[54] === 'llegamos') + (v[55] === 'llovía');
    choice[5] = v; await gate(5, right >= 4 ? 1 : 0, right, v);
  }
  const score = Object.values(conf).reduce((a, b) => a + b, 0);
  await session(uid, 'el-mundial', 'espanol', { maxStep: finished ? 10 : Math.min(9, 2 + reached * 2), stepsTotal: 10, completed: finished, activeMs: (8 + reached * 4) * 60000, at: t + 120000, gameName: 'El Mundial',
    summary: { gates, path: { f1: fork }, mode: 'solo', ...(finished ? { score } : {}) } });
  // Embarque → Aduana (flag on only): everyone who opened it boarded; those who finished did
  // the Aduana too. The class grows most on conocía / conocí and least on the last skill.
  const EMB = [0.45, 0.5, 0.35, 0.2, 0.3], ADU = [0.8, 0.85, 0.75, 0.8, 0.5];
  const checks = { v: 1, form: i % 2 ? 'B' : 'A', emb: EMB.map((p) => (flip(p) ? 1 : 0)), adu: finished ? ADU.map((p) => (flip(p) ? 1 : 0)) : [], embDone: true, aduDone: finished };
  await A('users', uid, 'module_progress', 'el-mundial').set({ v: '1.9', finished, state: JSON.stringify({ done, choice, conf, path: { f1: fork } }), checks, lastUpdated: ts(t) });
  if (finished) await A('users', uid, 'game_scores', sid).set({ gameName: 'El Mundial', completed: true, score, finalScore: score, maxScore: 5, lastUpdated: ts(t) });
}
/* El Viaje, played without being assigned: all five Puertas, both turns of Puerta 4. */
async function viaje(uid, i) {
  const at = NOW - 2 * DAY - i * 300000;
  const sid = `s_${uid}_el-viaje`;
  let t = at - 30 * 60000;
  const gates = {};
  const gate = async (n, score, choiceIndex, picks) => { gates[n] = score; t += 4 * 60000; await event(uid, 'el-viaje', 'espanol', 'choice', { scenarioIndex: n, choiceIndex, score, category: 'gate', ...(picks ? { picks } : {}) }, t, sid); };
  const f1 = i % 3, f2 = (i + 1) % 3;
  await gate(1, i % 2, i % 2);
  await event(uid, 'el-viaje', 'espanol', 'choice', { scenarioIndex: 'f1', choiceIndex: f1, category: 'fork' }, t + 1000, sid);
  await gate(2, i % 4 === 1 ? 0 : 1, i % 4 === 1 ? 1 : 0);
  await gate(3, i % 3 === 0 ? 1 : 0, i % 3);
  await event(uid, 'el-viaje', 'espanol', 'choice', { scenarioIndex: 'f2', choiceIndex: f2, category: 'fork' }, t + 1000, sid);
  const b = i % 2 ? 't' : 'u';
  await gate(4, b === 't' ? 1 : 0, b === 't' ? 1 : 0, { a: 'u', b });
  await gate(5, i % 5 === 0 ? 0 : 1, i % 5 === 0 ? 0 : 1);
  const score = Object.values(gates).reduce((x, y) => x + y, 0);
  await session(uid, 'el-viaje', 'espanol', { maxStep: 12, stepsTotal: 12, completed: true, activeMs: 31 * 60000, at: t + 60000, gameName: 'El Viaje',
    summary: { gates, path: { f1: ['tienda', 'recepcion', 'valeria'][f1], f2: ['dia', 'proyecto', 'ciudad'][f2], f3: 'cabrito' }, mode: 'solo', score } });
  await A('users', uid, 'game_scores', sid).set({ gameName: 'El Viaje', completed: true, score, finalScore: score, maxScore: 5, lastUpdated: ts(t) });
}

async function student(code, uid, name, i, { legacyOnly = false } = {}) {
  await A('users', uid).set({ role: 'student', isGuest: true, displayName: name, classroomCode: code });
  if (!legacyOnly) await A('classroom_members', `${code}_${uid}`).set({ classroomCode: code, uid, joinedAt: ts(NOW - 20 * DAY + i * 3600000) });
}

/* One student's activity across the assigned work. `skill` 0..1 sets how far and how well. */
async function activity(uid, i, skill) {
  const ps = MODULE_DATA['privacy-security'];
  const ddc = MODULE_DATA.ddc;
  const lastAt = NOW - Math.floor((1 - skill) * 10 * DAY) - i * 600000;
  if (skill < 0.08) return;   // joined, never opened anything

  // Privacy & Security (a lab): how far they got, and their Case choices.
  const psStep = Math.max(1, Math.min(ps.stepsTotal, Math.round(skill * ps.stepsTotal + rnd() * 1.5)));
  const psDone = psStep >= ps.stepsTotal;
  await session(uid, ps.slug, 'core', { maxStep: psStep, stepsTotal: ps.stepsTotal, completed: psDone, activeMs: 4 * 60000 + psStep * 90000, at: lastAt, gameName: ps.name });
  await A('users', uid, 'module_progress', ps.slug).set({ highestUnlocked: psStep - 1, lastUpdated: ts(lastAt) });
  const gsRef = A('users', uid, 'game_scores', `uat_ps_${uid}`);
  await gsRef.set({ gameName: ps.name, lastUpdated: ts(lastAt), ...(psDone ? { completed: true } : {}) });
  let t = lastAt - 10 * 60000;
  for (let step = 1; step < Math.min(psStep, ps.stepsTotal - 1); step++) {
    const opts = ps.steps[step].choices;
    if (!opts) continue;
    if (step === 1) {
      // The Scam Sort grades five messages one by one.
      for (let k = 0; k < 5; k++) {
        const right = rnd() < 0.45 + skill * 0.5;
        t += 20000;
        const meta = { scenarioIndex: 1, choiceIndex: right ? 0 : 1, score: right ? 3 : 0, attemptKey: `scenario_1_m${k}` };
        await event(uid, ps.slug, 'core', 'choice', meta, t);
        await gsRef.collection('scenario_attempts').doc(meta.attemptKey).set({ ...meta, timestamp: ts(t) });
      }
    } else {
      const good = rnd() < 0.35 + skill * 0.6;
      t += 60000;
      const meta = { scenarioIndex: step, choiceIndex: 0, score: good ? 3 : 2 };
      await event(uid, ps.slug, 'core', 'choice', meta, t);
      await gsRef.collection('scenario_attempts').doc(`scenario_${step}`).set({ ...meta, timestamp: ts(t) });
    }
  }

  // The Digital Decisions Challenge: scenarios answered, with real option scores.
  const answered = Math.round(skill * skill * ddc.stepsTotal);
  if (answered) {
    const ddcRef = A('users', uid, 'game_scores', `uat_ddc_${uid}`);
    await ddcRef.set({ gameName: 'Digital Decisions Challenge', lastUpdated: ts(lastAt), ...(answered >= ddc.stepsTotal ? { completed: true, percentage: 80 } : {}) });
    await session(uid, ddc.slug, 'core', { maxStep: answered, stepsTotal: ddc.stepsTotal, completed: answered >= ddc.stepsTotal, activeMs: answered * 40000, at: lastAt, gameName: 'Digital Decisions Challenge' });
    for (let k = 0; k < answered; k++) {
      const opts = ddc.steps[k].choices;
      // Scenarios 4 and 9 (index 3 and 8) are the ones this class finds hard.
      const hard = k === 3 || k === 8;
      const r = rnd();
      const want = r < (hard ? 0.3 : 0.6) + skill * 0.2 ? 3 : (r < 0.85 ? 1 : 0);
      const ci = opts.findIndex((o) => o.score === want);
      t += 30000;
      const meta = { scenarioIndex: k + 1, choiceIndex: ci, score: opts[ci].score, effectiveness: opts[ci].effectiveness };
      await event(uid, ddc.slug, 'core', 'choice', meta, t);
      await ddcRef.collection('scenario_attempts').doc(`scenario_${k + 1}`).set({ ...meta, timestamp: ts(t) });
    }
  }

  // Read the Signal (a game): one round, with its summary on the session.
  if (rnd() < 0.85) {
    const correct = Math.max(1, Math.min(10, Math.round(3 + skill * 7 + (rnd() - 0.5) * 3)));
    await session(uid, 'read-the-signal', 'core', { maxStep: 10, stepsTotal: 10, completed: true, activeMs: 6 * 60000, at: lastAt - DAY, gameName: 'Read the Signal',
      summary: { scenariosPlayed: 10, correct, categories: { phishing: { played: 4, correct: Math.min(4, Math.round(correct * 0.4)) }, privacy: { played: 6, correct: Math.min(6, correct - Math.round(correct * 0.4)) } } } });
  }

  // Where rain comes from (a simulation): its own stream, predictions, and Present mode.
  if (rnd() < 0.7) {
    const wcStep = Math.max(1, Math.min(6, Math.round(skill * 6 + rnd())));
    await session(uid, 'water-cycle', 'water-cycle', { maxStep: wcStep, stepsTotal: 6, completed: wcStep >= 6, activeMs: wcStep * 2 * 60000, at: lastAt, gameName: 'Water Cycle' });
    for (let st = 2; st <= Math.min(wcStep, 5); st++) {
      t += 40000;
      const matched = rnd() < (st === 2 ? 0.35 : 0.55 + skill * 0.3);
      await event(uid, 'water-cycle', 'water-cycle', 'wc_prediction', { step: st, choiceId: matched ? 'a' : 'b', mode: i % 9 === 0 ? 'class' : 'solo' }, t);
      await event(uid, 'water-cycle', 'water-cycle', 'wc_reveal', { step: st, matched }, t + 5000);
    }
  }
}

async function main() {
  // ── UAT-Free: a free teacher, one class, 33 students (3 over the free plan's 30) ──
  await teacher('uat_t_free', 'uat-free@example.com', 'UAT Ms Free', { classroomCode: 'UATFR1' });
  await classroom('UATFR1', 'uat_t_free', 'UAT Ms Free', 'UAT Period 3 · Digital Citizenship', {
    assignedModules: ['privacy-security', 'ddc', 'money-as-a-skill'], assignedGames: ['read-the-signal'], assignedSims: ['water-cycle'],
  });
  await A('teacher_free_class', 'uat_t_free').set({ firstClassCode: 'UATFR1', createdAt: ts(NOW - 30 * DAY) });
  for (let i = 0; i < NAMES.length; i++) {
    const uid = `uat_s${String(i).padStart(2, '0')}`;
    await student('UATFR1', uid, NAMES[i], i);
    const skill = i === 5 ? 0 : (i === 13 ? 0.12 : 0.2 + rnd() * 0.8);
    await activity(uid, i, skill);
  }
  // One student with extras on top of the class set.
  await A('classroom_assignments', 'UATFR1_uat_s09').set({ classroomCode: 'UATFR1', uid: 'uat_s09', modules: ['social-intelligence'], games: [], sims: [], updatedAt: NOW });

  // ── UAT-Pro: Pro until next year, two classes ──
  await teacher('uat_t_pro', 'uat-pro@example.com', 'UAT Mr Pro', { classroomCode: 'UATPR1' });
  await A('teacher_plans', 'uat_t_pro').set({ plan: 'pro', proUntil: ts(NOW + 300 * DAY), grantedBy: 'uat-seed', note: 'UAT', updatedAt: ts(NOW) });
  await classroom('UATPR1', 'uat_t_pro', 'UAT Mr Pro', 'UAT Period 1', { assignedModules: ['ddc'], assignedGames: [], assignedSims: ['snowball'] });
  await classroom('UATPR2', 'uat_t_pro', 'UAT Mr Pro', 'UAT Period 2', { assignedModules: ['privacy-security'], assignedGames: [], assignedSims: [] });
  await A('teacher_free_class', 'uat_t_pro').set({ firstClassCode: 'UATPR1', createdAt: ts(NOW - 30 * DAY) });
  for (let i = 0; i < 4; i++) { await student('UATPR1', `uat_p1_${i}`, NAMES[i], i); await activity(`uat_p1_${i}`, i, 0.5 + i * 0.1); }
  for (let i = 0; i < 3; i++) { await student('UATPR2', `uat_p2_${i}`, NAMES[i + 10], i); await activity(`uat_p2_${i}`, i, 0.4 + i * 0.2); }

  // ── UAT-Lapsed: Pro ended yesterday; active class is the EXTRA one (read-only) ──
  await teacher('uat_t_lapsed', 'uat-lapsed@example.com', 'UAT Dr Lapsed', { classroomCode: 'UATEX2' });
  await A('teacher_plans', 'uat_t_lapsed').set({ plan: 'pro', proUntil: ts(NOW - DAY), grantedBy: 'uat-seed', note: 'UAT lapsed', updatedAt: ts(NOW) });
  await classroom('UATEX1', 'uat_t_lapsed', 'UAT Dr Lapsed', 'UAT Homeroom', { assignedModules: ['ddc'], assignedGames: [], assignedSims: [] });
  await classroom('UATEX2', 'uat_t_lapsed', 'UAT Dr Lapsed', 'UAT Advisory', { assignedModules: ['privacy-security'], assignedGames: [], assignedSims: [] });
  await A('teacher_free_class', 'uat_t_lapsed').set({ firstClassCode: 'UATEX1', createdAt: ts(NOW - 30 * DAY) });
  for (let i = 0; i < 3; i++) { await student('UATEX2', `uat_x_${i}`, NAMES[i + 20], i); await activity(`uat_x_${i}`, i, 0.6); }

  // ── UAT-Legacy: a teacher from before the plan — no marker, legacy single-field students ──
  await teacher('uat_t_legacy', 'uat-legacy@example.com', 'UAT Mrs Legacy', { classroomCode: 'UATLG1' });
  await A('classrooms', 'UATLG1').set({ teacherUid: 'uat_t_legacy', teacherName: 'UAT Mrs Legacy', createdAt: ts(NOW - 90 * DAY), assignedModules: ['privacy-security'] });
  for (let i = 0; i < 3; i++) { await student('UATLG1', `uat_l_${i}`, NAMES[i + 5], i, { legacyOnly: true }); await activity(`uat_l_${i}`, i, 0.5); }

  // ── UAT-Español (2026-11-27): 22 students on El Mundial (assigned), some on El Viaje (played,
  //    not assigned), and a 3-student class, which shows counts instead of percentages ──
  await teacher('uat_t_es', 'uat-es@example.com', 'UAT Sra Ruiz', { classroomCode: 'UATES1' });
  await A('teacher_plans', 'uat_t_es').set({ plan: 'pro', proUntil: ts(NOW + 300 * DAY), grantedBy: 'uat-seed', note: 'UAT', updatedAt: ts(NOW) });
  await classroom('UATES1', 'uat_t_es', 'UAT Sra Ruiz', 'UAT Español 3', { assignedModules: ['privacy-security'], assignedGames: [], assignedSims: ['el-mundial'] });
  await classroom('UATES2', 'uat_t_es', 'UAT Sra Ruiz', 'UAT Español club', { assignedModules: [], assignedGames: [], assignedSims: ['el-mundial'] });
  await A('teacher_free_class', 'uat_t_es').set({ firstClassCode: 'UATES1', createdAt: ts(NOW - 30 * DAY) });
  for (let i = 0; i < 22; i++) {
    const uid = `uat_es_${i}`;
    await student('UATES1', uid, NAMES[i], i);
    await mundial(uid, i, { finished: i < 18, reached: i < 18 ? 5 : (i < 21 ? 4 : 0) });
    if (i % 3 === 0) await viaje(uid, i);
  }
  for (let i = 0; i < 3; i++) { const uid = `uat_es3_${i}`; await student('UATES2', uid, NAMES[i + 24], i); await mundial(uid, i, { finished: i < 2, reached: i < 2 ? 5 : 2 }); }

  // ── A brand-new free teacher with no class yet (for the setup screen) ──
  await auth.createUser({ uid: 'uat_t_new', email: 'uat-new@example.com', password: 'uat-password-1', displayName: 'UAT New', emailVerified: true }).catch(() => {});

  // ── One paid guide uploaded; the other three are not, so a Pro teacher sees "Coming soon" ──
  await getStorage().bucket().file('facilitator-guides/the-snowball.pdf').save(Buffer.from('%PDF-1.4\n% UAT test guide\n'), { contentType: 'application/pdf' });

  console.log(`seeded: 4 teachers, 6 classes, ${NAMES.length + 13} students, ${evN} events`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
