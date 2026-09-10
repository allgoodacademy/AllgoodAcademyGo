// Firestore security-rules tests. Run against the Firestore emulator:
//   node tests/firestore-rules.test.mjs
// (scripts/run-rules-tests.sh starts the emulator and invokes this.)
//
// The case this file exists for is GUEST SELF-PROMOTION: rules #4 and #6 used to decide
// "is this person a teacher" by reading role and classroomCode off the requester's own
// profile document, which rule #2 let them write. One merge write turned any signed-in
// visitor — including an anonymous guest — into a teacher with a full classroom roster.
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, collection, collectionGroup, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const APP = 'allgood-academy';
const U = (db, uid) => doc(db, 'artifacts', APP, 'users', uid);
const CLASS = (db, code) => doc(db, 'artifacts', APP, 'classrooms', code);
const PROGRESS = (db, uid, slug) => doc(db, 'artifacts', APP, 'users', uid, 'module_progress', slug);

let passed = 0, failed = 0;
async function it(name, fn) {
  try { await fn(); console.log(`  ok   ${name}`); passed++; }
  catch (e) { console.log(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`); failed++; }
}

const env = await initializeTestEnvironment({
  projectId: 'allgood-rules-test',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
});

// Seed: a real teacher who owns classroom KM7QPD, and a student in it.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(CLASS(db, 'KM7QPD'), { teacherUid: 'teacher_1', teacherName: 'Ms Real', createdAt: 1 });
  await setDoc(U(db, 'teacher_1'), { role: 'teacher', classroomCode: 'KM7QPD', displayName: 'Ms Real', email: 't@school.org' });
  await setDoc(U(db, 'student_1'), { role: 'student', classroomCode: 'KM7QPD', displayName: 'Arctic Fox Trot', ageTier: 'under13', recruitCode: 'arctic-fox-trot' });
  await setDoc(PROGRESS(db, 'student_1', 'social-intelligence'), { highestUnlocked: 6 });
  await setDoc(U(db, 'guest_1'), { role: 'student', isGuest: true, displayName: 'Sunny Bear Glide' });
  // One doc in every collection Insider reads, so an allowed query returns a row rather
  // than being indistinguishable from a denied one.
  await setDoc(doc(db, 'artifacts', APP, 'messages', 'm1'), { senderUid: 'student_1', timestamp: 1 });
  await setDoc(doc(db, 'artifacts', APP, 'course_feedback', 'f1'), { uid: 'student_1', timestamp: 1, rating: 5 });
  await setDoc(doc(db, 'artifacts', APP, 'recruit_codes', 'arctic-fox-trot'), { uid: 'student_1' });
  await setDoc(doc(db, 'artifacts', APP, 'sessions', 's1'), { uid: 'student_1', module: 'social-intelligence', startedAt: 1 });
  await setDoc(doc(db, 'artifacts', APP, 'events', 'e1'), { uid: 'student_1', event: 'module_open', ts: 1 });
  await setDoc(doc(db, 'artifacts', APP, 'users', 'student_1', 'launches', 'l1'), { courseName: 'Digital Decisions' });
  await setDoc(doc(db, 'artifacts', APP, 'users', 'student_1', 'game_scores', 'g1'), { gameName: 'Social Intelligence', completed: true });
  await setDoc(doc(db, 'artifacts', APP, 'users', 'student_1', 'game_scores', 'g1', 'scenario_attempts', '0'), { score: 3 });
});

const guest = env.authenticatedContext('guest_1', { provider_id: 'anonymous' }).firestore();
const teacher = env.authenticatedContext('teacher_1', { email: 't@school.org' }).firestore();
const student = env.authenticatedContext('student_1').firestore();
const admin = env.authenticatedContext('admin_1', { email: 'balgood93@gmail.com' }).firestore();

console.log('\nTHE EXPLOIT — an anonymous guest must not become a teacher');
await it('guest CANNOT merge role:teacher + someone else\'s classroomCode onto its own profile', async () => {
  await assertFails(setDoc(U(guest, 'guest_1'), { role: 'teacher', classroomCode: 'KM7QPD' }, { merge: true }));
});
await it('guest CANNOT set role:teacher even for a classroom code that does not exist', async () => {
  await assertFails(setDoc(U(guest, 'guest_1'), { role: 'teacher', classroomCode: 'ZZZZZZ' }, { merge: true }));
});
await it('guest CANNOT read another student\'s profile', async () => {
  await assertFails(getDoc(U(guest, 'student_1')));
});
await it('guest CANNOT list the classroom roster', async () => {
  await assertFails(getDocs(query(collection(guest, 'artifacts', APP, 'users'),
    where('classroomCode', '==', 'KM7QPD'), where('role', '==', 'student'))));
});
await it('guest CANNOT read another student\'s module_progress', async () => {
  await assertFails(getDoc(PROGRESS(guest, 'student_1', 'social-intelligence')));
});
await it('guest CANNOT self-promote by writing role alone, without a classroomCode', async () => {
  await assertFails(setDoc(U(guest, 'guest_1'), { role: 'teacher' }, { merge: true }));
});

console.log('\nSTILL WORKS — the flows auth-core.js and the dashboard actually use');
await it('guest CAN write its own guest profile (guestStart shape)', async () => {
  await assertSucceeds(setDoc(U(guest, 'guest_1'),
    { displayName: 'Sunny Bear Glide', email: null, isGuest: true, role: 'student', guestCode: 'sunny-bear-glide' }, { merge: true }));
});
await it('guest CAN claim a recruit code (claimRecruitCode shape: ageTier + recruitCode)', async () => {
  await assertSucceeds(setDoc(U(guest, 'guest_1'),
    { displayName: 'Sunny Bear Glide', avatar: 'owl', email: null, isGuest: true, role: 'student', ageTier: 'under13', recruitCode: 'sunny-bear-glide' }, { merge: true }));
});
await it('guest CAN write its own module_progress', async () => {
  await assertSucceeds(setDoc(PROGRESS(guest, 'guest_1', 'social-intelligence'), { highestUnlocked: 3 }));
});
await it('student CAN join a real classroom by code', async () => {
  await assertSucceeds(setDoc(U(student, 'student_1'), { classroomCode: 'KM7QPD' }, { merge: true }));
});
await it('teacher CAN read a student profile in their own classroom', async () => {
  await assertSucceeds(getDoc(U(teacher, 'student_1')));
});
await it('teacher CAN list their own roster', async () => {
  await assertSucceeds(getDocs(query(collection(teacher, 'artifacts', APP, 'users'),
    where('classroomCode', '==', 'KM7QPD'), where('role', '==', 'student'))));
});
await it('teacher CAN read a student\'s module_progress in their own classroom', async () => {
  await assertSucceeds(getDoc(PROGRESS(teacher, 'student_1', 'social-intelligence')));
});

console.log('\nBECOME-A-TEACHER — allowed, but only classroom-first');
await it('user CAN become teacher of a classroom they just created (dashboard order)', async () => {
  await assertSucceeds(setDoc(CLASS(guest, 'NEWCODE'), { teacherUid: 'guest_1', teacherName: 'Sunny', createdAt: 2 }));
  await assertSucceeds(setDoc(U(guest, 'guest_1'), { role: 'teacher', classroomCode: 'NEWCODE' }, { merge: true }));
});
await it('...and that new teacher STILL cannot read the other classroom\'s roster', async () => {
  await assertFails(getDocs(query(collection(guest, 'artifacts', APP, 'users'),
    where('classroomCode', '==', 'KM7QPD'), where('role', '==', 'student'))));
  await assertFails(getDoc(U(guest, 'student_1')));
});
await it('user CANNOT hijack an existing classroom by overwriting its teacherUid', async () => {
  await assertFails(setDoc(CLASS(guest, 'KM7QPD'), { teacherUid: 'guest_1' }, { merge: true }));
});

console.log('\nCROSS-TENANT — a real teacher of one classroom is not a teacher of another');
await it('teacher_1 CANNOT read a student in a classroom they do not own', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(CLASS(db, 'OTHER1'), { teacherUid: 'teacher_2' });
    await setDoc(U(db, 'student_2'), { role: 'student', classroomCode: 'OTHER1', displayName: 'Bold Owl Dash' });
  });
  await assertFails(getDoc(U(teacher, 'student_2')));
});

// Insider (public/insider/index.html) is one Promise.all of ten reads. A source the rules
// deny does not fail loudly — safe() swallows it, the page renders with that source empty,
// and the amber strip is the only tell. `users` was denied for two days after the privilege
// fix split rule #2, because the admin's list grant had been riding on that rule's
// zero-segment {document=**} match. So assert every source, not just the interesting ones.
console.log('\nINSIDER — the admin allowlist can read every source loadEverything() asks for');
const INSIDER_SOURCES = {
  users: db => getDocs(collection(db, 'artifacts', APP, 'users')),
  classrooms: db => getDocs(collection(db, 'artifacts', APP, 'classrooms')),
  messages: db => getDocs(query(collection(db, 'artifacts', APP, 'messages'), orderBy('timestamp', 'desc'), limit(300))),
  course_feedback: db => getDocs(query(collection(db, 'artifacts', APP, 'course_feedback'), orderBy('timestamp', 'desc'), limit(1000))),
  launches: db => getDocs(collectionGroup(db, 'launches')),
  game_scores: db => getDocs(collectionGroup(db, 'game_scores')),
  scenario_attempts: db => getDocs(collectionGroup(db, 'scenario_attempts')),
  module_progress: db => getDocs(collectionGroup(db, 'module_progress')),
  sessions: db => getDocs(query(collection(db, 'artifacts', APP, 'sessions'), orderBy('startedAt', 'desc'), limit(5000))),
  events: db => getDocs(query(collection(db, 'artifacts', APP, 'events'), orderBy('ts', 'desc'), limit(3000))),
  recruit_codes: db => getDocs(collection(db, 'artifacts', APP, 'recruit_codes')),
};
for (const [name, read] of Object.entries(INSIDER_SOURCES)) {
  await it(`admin CAN read ${name}`, async () => { await assertSucceeds(read(admin)); });
}
await it('a signed-in non-admin CANNOT enumerate the users collection', async () => {
  await assertFails(getDocs(collection(guest, 'artifacts', APP, 'users')));
  await assertFails(getDocs(collection(teacher, 'artifacts', APP, 'users')));
});
await it('a signed-in non-admin CANNOT read the telemetry sources', async () => {
  await assertFails(getDocs(collection(guest, 'artifacts', APP, 'sessions')));
  await assertFails(getDocs(collection(guest, 'artifacts', APP, 'events')));
  await assertFails(getDocs(collectionGroup(guest, 'game_scores')));
});

await env.cleanup();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
