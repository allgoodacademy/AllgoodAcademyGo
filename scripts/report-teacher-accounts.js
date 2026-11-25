#!/usr/bin/env node
// Read-only report: how many REAL teachers have Mission Control accounts, and which of them
// can be emailed. Writes nothing to Firestore or Auth.
//
//   node scripts/report-teacher-accounts.js
//
// Needs firebase-admin (install with `npm install firebase-admin --no-save`) and a service
// account via GOOGLE_APPLICATION_CREDENTIALS, the same as delete-guest-accounts.js. Can also be
// run from GitHub: Actions → "Teacher accounts report" → Run workflow.
//
// Output:
//   - a summary on the console (counts only, no email addresses), safe to paste anywhere;
//   - per-account detail in reports/teacher-accounts.csv, which is gitignored and must never
//     be committed. Pass --no-csv to skip it (the GitHub workflow does).
//
// "Likely test" accounts: allgoodacademy.com addresses, the two admin addresses in
// firestore.rules, and any teacher with no students on any roster and no student activity.
// save.allgoodacademy.com addresses (student save codes) are never teachers and are skipped.
//
// Product updates: only productUpdates.optedIn === true counts as opted in. A teacher with
// no productUpdates field has NOT been asked yet and is not opted in.

const fs = require('node:fs');
const path = require('node:path');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const APP_ID = 'allgood-academy';
const ACTIVE_DAYS = 90;
const ADMIN_EMAILS = new Set(['learning@allgoodacademy.com', 'balgood93@gmail.com']);

const toMs = (v) => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : v ? Date.parse(v) || 0 : 0);
const day = (ms) => (ms ? new Date(ms).toISOString().slice(0, 10) : '');
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

async function main() {
  const writeCsv = !process.argv.includes('--no-csv');
  initializeApp({ credential: applicationDefault(), projectId: APP_ID });
  const db = getFirestore();
  const auth = getAuth();
  const base = db.collection('artifacts').doc(APP_ID);

  const teachersSnap = await base.collection('users').where('role', '==', 'teacher').get();
  const classesSnap = await base.collection('classrooms').get();
  const classesByTeacher = new Map();
  for (const c of classesSnap.docs) {
    const t = c.data().teacherUid;
    if (!t) continue;
    if (!classesByTeacher.has(t)) classesByTeacher.set(t, []);
    classesByTeacher.get(t).push(c.id);
  }
  const plansSnap = await base.collection('teacher_plans').get();
  const plans = new Map(plansSnap.docs.map((d) => [d.id, d.data()]));
  const since = Date.now() - ACTIVE_DAYS * 86400000;

  const rows = [];
  for (const t of teachersSnap.docs) {
    const uid = t.id;
    const me = t.data();
    let user = null;
    try { user = await auth.getUser(uid); } catch (e) { /* profile without an Auth user */ }
    const email = (user && user.email) || me.email || '';
    if (/@save\.allgoodacademy\.com$/i.test(email)) continue;
    const providers = user ? user.providerData.map((p) => p.providerId) : [];
    const provider = providers.includes('google.com') ? 'google.com' : providers.includes('password') ? 'email' : user ? 'anonymous' : 'none';
    const codes = new Set(classesByTeacher.get(uid) || []);
    if (me.classroomCode) codes.add(me.classroomCode);

    const students = new Set();
    for (const code of codes) {
      const m = await base.collection('classroom_members').where('classroomCode', '==', code).get();
      m.docs.forEach((d) => d.data().uid && students.add(d.data().uid));
      const legacy = await base.collection('users').where('classroomCode', '==', code).where('role', '==', 'student').get();
      legacy.docs.forEach((d) => students.add(d.id));
    }
    let activeStudents = 0;
    for (const s of students) {
      const q = await base.collection('sessions').where('uid', '==', s).where('startedAt', '>=', since).limit(1).get().catch(() => null);
      if (q && !q.empty) activeStudents++;
    }
    const plan = plans.get(uid);
    const pro = plan && plan.plan === 'pro' && toMs(plan.proUntil) > Date.now();
    const updates = me.productUpdates && me.productUpdates.optedIn === true ? 'opted in'
      : me.productUpdates ? 'opted out' : 'not asked';
    const test = /@allgoodacademy\.com$/i.test(email) || ADMIN_EMAILS.has(email.toLowerCase())
      || (students.size === 0);
    rows.push({
      uid, email, provider,
      created: user ? day(Date.parse(user.metadata.creationTime)) : '',
      lastSignIn: user && user.metadata.lastSignInTime ? day(Date.parse(user.metadata.lastSignInTime)) : '',
      classes: codes.size, students: students.size, activeStudents,
      plan: pro ? 'pro' : 'free', productUpdates: updates, likelyTest: test ? 'yes' : 'no',
    });
  }

  const real = rows.filter((r) => r.likelyTest === 'no');
  const count = (list, f) => list.filter(f).length;
  console.log('Teacher accounts (read-only report)\n');
  console.log(`  All teacher accounts:                 ${rows.length}`);
  console.log(`    by sign-in: Google ${count(rows, (r) => r.provider === 'google.com')}, email ${count(rows, (r) => r.provider === 'email')}, anonymous/none ${count(rows, (r) => r.provider === 'anonymous' || r.provider === 'none')}`);
  console.log(`  Likely founder/test accounts:         ${rows.length - real.length}`);
  console.log(`  Likely real teachers:                 ${real.length}`);
  console.log(`    with students active in ${ACTIVE_DAYS} days: ${count(real, (r) => r.activeStudents > 0)}`);
  console.log(`    on Pro:                            ${count(real, (r) => r.plan === 'pro')}`);
  console.log(`    product updates: opted in ${count(real, (r) => r.productUpdates === 'opted in')}, opted out ${count(real, (r) => r.productUpdates === 'opted out')}, not asked ${count(real, (r) => r.productUpdates === 'not asked')}`);

  if (writeCsv) {
    const out = path.join(__dirname, '..', 'reports', 'teacher-accounts.csv');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const cols = Object.keys(rows[0] || { uid: '' });
    fs.writeFileSync(out, [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n');
    console.log(`\nDetail (with emails, never commit): ${path.relative(process.cwd(), out)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
