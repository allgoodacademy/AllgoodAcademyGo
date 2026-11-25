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
  doc, getDoc, setDoc, deleteDoc, collection, collectionGroup, getDocs, query, where, orderBy, limit,
  writeBatch, Timestamp,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const APP = 'allgood-academy';
const U = (db, uid) => doc(db, 'artifacts', APP, 'users', uid);
const CLASS = (db, code) => doc(db, 'artifacts', APP, 'classrooms', code);
const PROGRESS = (db, uid, slug) => doc(db, 'artifacts', APP, 'users', uid, 'module_progress', slug);
const MEMBER = (db, code, uid) => doc(db, 'artifacts', APP, 'classroom_members', `${code}_${uid}`);
const PLAN = (db, uid) => doc(db, 'artifacts', APP, 'teacher_plans', uid);
const MARKER = (db, uid) => doc(db, 'artifacts', APP, 'teacher_free_class', uid);
// Mission Control's create-a-class write (since the Pro plan, 2026-11-25): the classroom and
// the teacher's free-class marker in ONE batch, so the class-create rule can see the marker
// with getAfter. A Pro teacher's later classes carry no marker (withMarker: false).
function createClass(db, uid, code, data, { withMarker = true } = {}) {
  const b = writeBatch(db);
  b.set(CLASS(db, code), { teacherUid: uid, createdAt: 2, ...data });
  if (withMarker) b.set(MARKER(db, uid), { firstClassCode: code, createdAt: 2 });
  return b.commit();
}

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
  await setDoc(doc(db, 'artifacts', APP, 'topic_selections', 't1'), { uid: 'student_1', timestamp: 1, category: 'Money', ageTier: 'under13' });
  await setDoc(doc(db, 'artifacts', APP, 'recruit_codes', 'arctic-fox-trot'), { uid: 'student_1' });
  await setDoc(doc(db, 'artifacts', APP, 'sessions', 's1'), { uid: 'student_1', module: 'social-intelligence', startedAt: 1 });
  await setDoc(doc(db, 'artifacts', APP, 'events', 'e1'), { uid: 'student_1', event: 'module_open', ts: 1 });
  await setDoc(doc(db, 'artifacts', APP, 'users', 'student_1', 'launches', 'l1'), { courseName: 'Digital Decisions' });
  await setDoc(doc(db, 'artifacts', APP, 'users', 'student_1', 'game_scores', 'g1'), { gameName: 'Social Intelligence', completed: true });
  await setDoc(doc(db, 'artifacts', APP, 'users', 'student_1', 'game_scores', 'g1', 'scenario_attempts', '0'), { score: 3 });

  // student_1 above is the LEGACY membership shape: a classroomCode on the profile and no
  // join-table document, because they joined before classroom_members existed. The two below
  // are the shapes joinClassroom() actually produces today, and the sessions grant has to
  // reach all three or time-on-task silently disappears for whoever is in the missing one.
  //
  //   member_1 — a normal modern join: classroom_members doc AND the mirrored classroomCode.
  //   multi_1  — the shape ONLY the join table can express: their profile classroomCode
  //              points at a second teacher's classroom (they joined that one later), so the
  //              legacy fallback cannot authorize teacher_1 and the join table must.
  await setDoc(CLASS(db, 'ZZ9XYZ'), { teacherUid: 'teacher_2', teacherName: 'Mr Other', createdAt: 1 });
  await setDoc(U(db, 'teacher_2'), { role: 'teacher', classroomCode: 'ZZ9XYZ', displayName: 'Mr Other', email: 'o@school.org' });
  await setDoc(U(db, 'member_1'), { role: 'student', classroomCode: 'KM7QPD', displayName: 'Nimble Otter Dash' });
  await setDoc(MEMBER(db, 'KM7QPD', 'member_1'), { classroomCode: 'KM7QPD', uid: 'member_1', joinedAt: 1 });
  await setDoc(doc(db, 'artifacts', APP, 'sessions', 's_member'), { uid: 'member_1', module: 'privacy-security', startedAt: 1, activeMs: 4000 });
  await setDoc(U(db, 'multi_1'), { role: 'student', classroomCode: 'ZZ9XYZ', displayName: 'Copper Heron Wave' });
  await setDoc(MEMBER(db, 'KM7QPD', 'multi_1'), { classroomCode: 'KM7QPD', uid: 'multi_1', joinedAt: 1 });
  await setDoc(doc(db, 'artifacts', APP, 'sessions', 's_multi'), { uid: 'multi_1', module: 'social-intelligence', startedAt: 1, activeMs: 7000 });
});

const guest = env.authenticatedContext('guest_1', { provider_id: 'anonymous' }).firestore();
const teacher = env.authenticatedContext('teacher_1', { email: 't@school.org' }).firestore();
const student = env.authenticatedContext('student_1').firestore();
const admin = env.authenticatedContext('admin_1', { email: 'balgood93@gmail.com', email_verified: true }).firestore();

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
await it('guest CAN write its own profile (startSession shape: a nickname, nothing else)', async () => {
  await assertSucceeds(setDoc(U(guest, 'guest_1'),
    { displayName: 'Swift Otter 42', email: null, isGuest: true, role: 'student', lastLogin: 1 }, { merge: true }));
});
await it('guest CAN write its own module_progress', async () => {
  await assertSucceeds(setDoc(PROGRESS(guest, 'guest_1', 'social-intelligence'), { highestUnlocked: 3 }));
});
await it('student CAN join a real classroom by code', async () => {
  await assertSucceeds(setDoc(U(student, 'student_1'), { classroomCode: 'KM7QPD' }, { merge: true }));
});
await it('an anonymous session CAN join with a class code + nickname (/join/ shape)', async () => {
  const nick = env.authenticatedContext('nick_1', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  await assertSucceeds(setDoc(MEMBER(nick, 'KM7QPD', 'nick_1'), { classroomCode: 'KM7QPD', uid: 'nick_1', joinedAt: 1 }));
  await assertSucceeds(setDoc(U(nick, 'nick_1'), { displayName: 'Maya', email: null, isGuest: true, role: 'student', classroomCode: 'KM7QPD' }, { merge: true }));
});
await it('...and CANNOT join a class code that does not exist', async () => {
  const nick = env.authenticatedContext('nick_2', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  await assertFails(setDoc(MEMBER(nick, 'NOPE99', 'nick_2'), { classroomCode: 'NOPE99', uid: 'nick_2', joinedAt: 1 }));
  await assertFails(setDoc(U(nick, 'nick_2'), { displayName: 'Maya', role: 'student', classroomCode: 'NOPE99' }, { merge: true }));
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

console.log('\nBECOME-A-TEACHER — a teacher sign-in (Google or email), never anonymous, classroom-first');
// Google signed in directly, and Google linked onto an earlier anonymous session (what
// AuthCore.teacherGoogleSignIn does when the browser already has one): both carry
// google.com in firebase.identities, which is what the rule reads.
const googleTeacher = env.authenticatedContext('gteach_1', { email: 'g@school.org', firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['1001'], email: ['g@school.org'] } } }).firestore();
const linkedTeacher = env.authenticatedContext('gteach_2', { email: 'l@school.org', firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['1002'] } } }).firestore();
const passwordUser = env.authenticatedContext('pw_1', { email: 'pw@school.org', firebase: { sign_in_provider: 'password', identities: { email: ['pw@school.org'] } } }).firestore();
await it('a Google-signed-in user CAN become teacher of a classroom they just created (Mission Control order)', async () => {
  await assertSucceeds(createClass(googleTeacher, 'gteach_1', 'NEWCODE', { teacherName: 'Ms Google' }));
  await assertSucceeds(setDoc(U(googleTeacher, 'gteach_1'), { role: 'teacher', classroomCode: 'NEWCODE' }, { merge: true }));
});
await it('...and so CAN an anonymous session that linked Google first', async () => {
  await assertSucceeds(createClass(linkedTeacher, 'gteach_2', 'LINK01', { teacherName: 'Mr Linked' }));
  await assertSucceeds(setDoc(U(linkedTeacher, 'gteach_2'), { role: 'teacher', classroomCode: 'LINK01' }, { merge: true }));
});
await it('...and that new teacher STILL cannot read the other classroom\'s roster', async () => {
  await assertFails(getDocs(query(collection(googleTeacher, 'artifacts', APP, 'users'),
    where('classroomCode', '==', 'KM7QPD'), where('role', '==', 'student'))));
  await assertFails(getDoc(U(googleTeacher, 'student_1')));
});
await it('an anonymous session CANNOT create a classroom', async () => {
  await assertFails(setDoc(CLASS(guest, 'ANON01'), { teacherUid: 'guest_1', teacherName: 'Sunny', createdAt: 2 }));
});
await it('an email/password teacher account CAN create a classroom and become its teacher', async () => {
  await assertSucceeds(createClass(passwordUser, 'pw_1', 'PASS01', { teacherName: 'Pw' }));
  await assertSucceeds(setDoc(U(passwordUser, 'pw_1'), { role: 'teacher', classroomCode: 'PASS01' }, { merge: true }));
});
await it('a token with some OTHER provider and no Google/email identity CANNOT create a classroom', async () => {
  const phoneOnly = env.authenticatedContext('ph_1', { firebase: { sign_in_provider: 'phone', identities: { phone: ['+15555550100'] } } }).firestore();
  await assertFails(setDoc(CLASS(phoneOnly, 'PHON01'), { teacherUid: 'ph_1', teacherName: 'Ph', createdAt: 2 }));
});
await it('an anonymous session CANNOT become teacher even of a classroom it owns', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(CLASS(ctx.firestore(), 'ANON02'), { teacherUid: 'guest_1', teacherName: 'Sunny', createdAt: 2 });
  });
  await assertFails(setDoc(U(guest, 'guest_1'), { role: 'teacher', classroomCode: 'ANON02' }, { merge: true }));
});
await it('an EXISTING teacher who never used Google still works: profile writes and assigning', async () => {
  // teacher_1's token has no google.com identity (they predate the teacher-sign-in rule).
  await assertSucceeds(setDoc(U(teacher, 'teacher_1'), { displayName: 'Ms Real', lastLogin: 2 }, { merge: true }));
  await assertSucceeds(setDoc(CLASS(teacher, 'KM7QPD'), { lastReviewedAt: 2 }, { merge: true }));
  await assertSucceeds(getDocs(query(collection(teacher, 'artifacts', APP, 'users'),
    where('classroomCode', '==', 'KM7QPD'), where('role', '==', 'student'))));
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

console.log('\nROSTER LIST — the query Mission Control actually loads with (rule #4 list path)');
// Why this section exists: `list` and `get` used to share one condition on rule #4, and that
// condition takes the `{userId}` path wildcard. On a LIST the rule is matched against the
// COLLECTION, so `{userId}` is unbound — null — and every branch raised a null-value error
// before returning a verdict. `list` was therefore denied for every teacher, Mission Control
// loads by listing the roster, and the page died with a full-page permission error in
// production. The suite did not catch it because it only ever tested per-document `get`,
// which was never broken. Everything below tests the QUERY.
const rosterQuery = (db, code) => getDocs(query(collection(db, 'artifacts', APP, 'users'),
  where('classroomCode', '==', code), where('role', '==', 'student')));

// A brand-new teacher with a freshly created classroom and ZERO students — the exact state
// the production failure was reported from. An empty result must come back as an empty
// result, not as a denial: there is no document for the rule to pass or fail on, so this is
// the one case a per-document condition can never be rescued by seeding data.
await it('a brand-new teacher with an EMPTY classroom CAN list their roster', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(CLASS(db, 'EMPTY1'), { teacherUid: 'teacher_empty', teacherName: 'Ms New', createdAt: 1 });
    await setDoc(U(db, 'teacher_empty'), { role: 'teacher', classroomCode: 'EMPTY1', displayName: 'Ms New' });
  });
  const newTeacher = env.authenticatedContext('teacher_empty', { email: 'new@school.org' }).firestore();
  const snap = await assertSucceeds(rosterQuery(newTeacher, 'EMPTY1'));
  if (snap.docs.length !== 0) throw new Error(`expected an empty roster, got ${snap.docs.length}`);
});

await it('a teacher WITH students lists them, and gets every member back', async () => {
  const snap = await assertSucceeds(rosterQuery(teacher, 'KM7QPD'));
  const uids = snap.docs.map((d) => d.id).sort();
  // student_1 (legacy: classroomCode only) and member_1 (modern: mirrored code + join doc)
  // both carry classroomCode KM7QPD on their profile, so both are reachable by this query.
  // multi_1 is deliberately NOT here — their profile code points at ZZ9XYZ — and is covered
  // by the join-table case below.
  for (const want of ['member_1', 'student_1']) {
    if (!uids.includes(want)) throw new Error(`roster missing ${want}: got ${uids.join(',')}`);
  }
});

// The list path reaches legacy/mirrored members only. Anyone the join table alone can
// express is discovered from classroom_members and read with a per-document get, where the
// wildcard IS bound — so the two paths together have to cover the whole roster, and this
// asserts the half the query cannot see is still reachable the other way.
await it('a join-table-only member is NOT in the query but IS readable by get', async () => {
  const snap = await assertSucceeds(rosterQuery(teacher, 'KM7QPD'));
  if (snap.docs.map((d) => d.id).includes('multi_1')) {
    throw new Error('multi_1 should not match a query on their own classroomCode');
  }
  await assertSucceeds(getDocs(query(collection(teacher, 'artifacts', APP, 'classroom_members'),
    where('classroomCode', '==', 'KM7QPD'))));
  await assertSucceeds(getDoc(U(teacher, 'multi_1')));
});

// The negative case, proven by a real denied query rather than asserted in a comment.
await it('a teacher CANNOT list the roster of a classroom they do not teach', async () => {
  await assertFails(rosterQuery(teacher, 'ZZ9XYZ'));
});
await it('the other classroom\'s teacher CANNOT list THIS roster either', async () => {
  const other = env.authenticatedContext('teacher_2', { email: 'o@school.org' }).firestore();
  await assertSucceeds(rosterQuery(other, 'ZZ9XYZ'));
  await assertFails(rosterQuery(other, 'KM7QPD'));
});
await it('a guest CANNOT list any roster, including one that exists', async () => {
  await assertFails(rosterQuery(guest, 'KM7QPD'));
});
await it('a student CANNOT list the roster of their own classroom', async () => {
  await assertFails(rosterQuery(student, 'KM7QPD'));
});

// "Rules are not filters": the grant is per returned document, so a query that widens past
// what the rule allows must fail outright rather than quietly returning the allowed subset.
await it('a teacher CANNOT drop the classroomCode filter and enumerate all students', async () => {
  await assertFails(getDocs(query(collection(teacher, 'artifacts', APP, 'users'),
    where('role', '==', 'student'))));
});
await it('a teacher CANNOT drop the role filter (their own teacher profile would come back)', async () => {
  await assertFails(getDocs(query(collection(teacher, 'artifacts', APP, 'users'),
    where('classroomCode', '==', 'KM7QPD'))));
});
await it('a teacher CANNOT list the users collection unfiltered', async () => {
  await assertFails(getDocs(collection(teacher, 'artifacts', APP, 'users')));
});

// Document-access budget. The rule resolves classroomOwnedBy against the SAME classroom path
// for every document the query returns, and rules cache lookups per path within a request,
// so this is O(1) accesses however wide the roster is. A rule doing a get() per returned
// document would pass at 1 student and start failing somewhere past a handful — quietly, and
// only in the classrooms big enough to hit it, which is the failure mode rule #10b describes.
await it('a WIDE roster still lists — the grant is O(1) document accesses, not O(students)', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(CLASS(db, 'BIG001'), { teacherUid: 'teacher_big', teacherName: 'Mr Big', createdAt: 1 });
    await setDoc(U(db, 'teacher_big'), { role: 'teacher', classroomCode: 'BIG001', displayName: 'Mr Big' });
    for (let i = 0; i < 30; i++) {
      await setDoc(U(db, `big_${i}`), { role: 'student', classroomCode: 'BIG001', displayName: `Agent ${i}` });
    }
  });
  const bigTeacher = env.authenticatedContext('teacher_big', { email: 'big@school.org' }).firestore();
  const snap = await assertSucceeds(rosterQuery(bigTeacher, 'BIG001'));
  if (snap.docs.length !== 30) throw new Error(`expected 30 students, got ${snap.docs.length}`);
});

// The self-assertion that rule #2's hardening was about. A guest can put a classroomCode on
// their OWN profile (that is join-by-code), which lands them on that roster — and must still
// buy them nothing: they cannot read the roster, and they cannot read a classmate.
// Runs as its own uid rather than reusing guest_1: joining KM7QPD by code genuinely makes
// this account a member of that roster, and the shared guest context is asserted against
// elsewhere in this file.
await it('a student writing a classroomCode onto their own profile gains no read access', async () => {
  const joiner = env.authenticatedContext('joiner_1', { provider_id: 'anonymous' }).firestore();
  await assertSucceeds(setDoc(U(joiner, 'joiner_1'),
    { role: 'student', classroomCode: 'KM7QPD', displayName: 'Keen Lynx Turn' }, { merge: true }));
  await assertFails(rosterQuery(joiner, 'KM7QPD'));
  await assertFails(getDoc(U(joiner, 'student_1')));
});

console.log('\nPER-STUDENT EXTRAS — only the teacher assigns, only the student and teacher read (rule #6c)');
// Why this collection exists at all: the obvious design is a map on the classroom document,
// and rule #5 grants `get` there to ANY signed-in user (so a student can validate a code
// before joining). Per-student assignments there would be readable by every classmate. The
// tests below are what keep that boundary honest.
const ASSIGN = (db, code, uid) => doc(db, 'artifacts', APP, 'classroom_assignments', `${code}_${uid}`);
const assignmentsFor = (db, code) => getDocs(query(
  collection(db, 'artifacts', APP, 'classroom_assignments'), where('classroomCode', '==', code)));
const extrasDoc = (code, uid, modules = ['money-as-a-skill'], games = []) =>
  ({ classroomCode: code, uid, modules, games, updatedAt: 1 });

await it('a teacher CAN assign an extra module to one of their own students', async () => {
  await assertSucceeds(setDoc(ASSIGN(teacher, 'KM7QPD', 'student_1'), extrasDoc('KM7QPD', 'student_1')));
});
await it('...and re-saving it is an ordinary idempotent update, not a second create', async () => {
  await assertSucceeds(setDoc(ASSIGN(teacher, 'KM7QPD', 'student_1'),
    extrasDoc('KM7QPD', 'student_1', ['money-as-a-skill', 'reading-the-room'], ['money-moves']), { merge: true }));
});
await it('a teacher CAN read back one student\'s extras', async () => {
  const snap = await assertSucceeds(getDoc(ASSIGN(teacher, 'KM7QPD', 'student_1')));
  if (!snap.exists()) throw new Error('expected the assignment document to exist');
});
await it('a teacher CAN list every extra assignment in their own classroom', async () => {
  const snap = await assertSucceeds(assignmentsFor(teacher, 'KM7QPD'));
  if (!snap.docs.length) throw new Error('expected at least one assignment row');
});
await it('...and that list works for a classroom with NO extras assigned yet', async () => {
  // The rule #4 failure mode in miniature: a list whose condition touched the {assignmentId}
  // wildcard would error on null before returning a verdict, and an empty result is the case
  // seeding data can never rescue.
  const newTeacher = env.authenticatedContext('teacher_empty', { email: 'new@school.org' }).firestore();
  const snap = await assertSucceeds(assignmentsFor(newTeacher, 'EMPTY1'));
  if (snap.docs.length !== 0) throw new Error(`expected no rows, got ${snap.docs.length}`);
});

await it('the STUDENT can read their own extras', async () => {
  await assertSucceeds(getDoc(ASSIGN(student, 'KM7QPD', 'student_1')));
});
await it('a student CANNOT read a CLASSMATE\'s extras', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(ASSIGN(ctx.firestore(), 'KM7QPD', 'member_1'), extrasDoc('KM7QPD', 'member_1'));
  });
  await assertFails(getDoc(ASSIGN(student, 'KM7QPD', 'member_1')));
});
await it('a student CANNOT enumerate the classroom\'s assignments to see everyone\'s', async () => {
  await assertFails(assignmentsFor(student, 'KM7QPD'));
});
await it('a guest CANNOT read a student\'s extras, or list them', async () => {
  await assertFails(getDoc(ASSIGN(guest, 'KM7QPD', 'student_1')));
  await assertFails(assignmentsFor(guest, 'KM7QPD'));
});

// The write side is the mirror image of #6b: a membership is the student's act, an
// assignment is the teacher's and nobody else's.
await it('a student CANNOT assign work to THEMSELVES', async () => {
  await assertFails(setDoc(ASSIGN(student, 'KM7QPD', 'student_1'),
    extrasDoc('KM7QPD', 'student_1', ['ddc'])));
});
await it('a student CANNOT assign work to a CLASSMATE', async () => {
  await assertFails(setDoc(ASSIGN(student, 'KM7QPD', 'member_1'), extrasDoc('KM7QPD', 'member_1')));
});
await it('a guest CANNOT assign work to anyone', async () => {
  await assertFails(setDoc(ASSIGN(guest, 'KM7QPD', 'student_1'), extrasDoc('KM7QPD', 'student_1')));
});
await it('a teacher of ANOTHER classroom cannot assign into this one, or read its extras', async () => {
  const other = env.authenticatedContext('teacher_2', { email: 'o@school.org' }).firestore();
  await assertFails(setDoc(ASSIGN(other, 'KM7QPD', 'student_1'), extrasDoc('KM7QPD', 'student_1')));
  await assertFails(getDoc(ASSIGN(other, 'KM7QPD', 'student_1')));
  await assertFails(assignmentsFor(other, 'KM7QPD'));
});

// Shape constraints. The doc ID is pinned so a teacher cannot file one student's extras
// under another's ID, and the field list is closed so this document can never grow a field
// something else authorizes on.
await it('the document ID must match the classroomCode + uid it claims', async () => {
  await assertFails(setDoc(doc(teacher, 'artifacts', APP, 'classroom_assignments', 'KM7QPD_wrong'),
    extrasDoc('KM7QPD', 'student_1')));
});
await it('a field outside the allowed set is DENIED', async () => {
  await assertFails(setDoc(ASSIGN(teacher, 'KM7QPD', 'student_1'),
    { ...extrasDoc('KM7QPD', 'student_1'), role: 'teacher' }));
});
await it('modules and games must both be lists', async () => {
  await assertFails(setDoc(ASSIGN(teacher, 'KM7QPD', 'student_1'),
    { classroomCode: 'KM7QPD', uid: 'student_1', modules: 'money-as-a-skill', games: [], updatedAt: 1 }));
});
await it('an unbounded module list is DENIED', async () => {
  await assertFails(setDoc(ASSIGN(teacher, 'KM7QPD', 'student_1'),
    extrasDoc('KM7QPD', 'student_1', Array.from({ length: 101 }, (_, i) => `m${i}`))));
});
await it('a teacher CAN clear a student\'s extras by deleting the row', async () => {
  await assertSucceeds(deleteDoc(ASSIGN(teacher, 'KM7QPD', 'member_1')));
});
await it('a student CANNOT delete their own extras to unassign themselves', async () => {
  await assertFails(deleteDoc(ASSIGN(student, 'KM7QPD', 'student_1')));
});

console.log('\nMISSION CONTROL — a teacher reads their own students\' telemetry sessions, nobody else\'s');
const SESSIONS = (db) => collection(db, 'artifacts', APP, 'sessions');
// The page queries one uid at a time on purpose: pinned to a single uid the rule's user and
// classroom lookups resolve the same two paths for every document returned, so the query
// stays inside the ten-document-access budget however many sessions that student has.
const sessionsFor = (db, uid) => getDocs(query(SESSIONS(db), where('uid', '==', uid)));

await it('teacher CAN read a session belonging to a student in their own classroom', async () => {
  await assertSucceeds(sessionsFor(teacher, 'student_1'));
});
await it('...and that read actually returns the row, not an empty allowed result', async () => {
  const snap = await sessionsFor(teacher, 'student_1');
  if (snap.empty) throw new Error('query allowed but returned nothing — the grant is not matching');
});
await it('teacher CAN read the sessions of a student who joined via classroom_members', async () => {
  // The legacy classroomCode fallback would also authorize this one, so it is the weaker of
  // the two modern cases — but it is the shape almost every real member has, and nothing
  // covered it before.
  const snap = await sessionsFor(teacher, 'member_1');
  if (snap.empty) throw new Error('query allowed but returned nothing — the join-table grant is not matching');
});
await it('teacher CAN read sessions of a member whose OWN classroomCode points elsewhere', async () => {
  // The case that isolates the join table: multi_1's profile says classroom ZZ9XYZ, which
  // teacher_1 does not own, so isLegacySingleClassroomStudent() must fail and the read can
  // only succeed through classroom_members. If this denies, a teacher loses time-on-task for
  // every agent who belongs to more than one Task Force.
  const snap = await sessionsFor(teacher, 'multi_1');
  if (snap.empty) throw new Error('query allowed but returned nothing — the join-table grant is not matching');
});
await it('the OTHER classroom\'s teacher CANNOT read those sessions without a membership', async () => {
  // teacher_2 owns ZZ9XYZ and multi_1's profile names that code, but multi_1 has no
  // classroom_members doc for it — so the join table denies and the legacy fallback is the
  // only thing that could allow it. Pins the blast radius of the fallback staying in place.
  await assertFails(sessionsFor(env.authenticatedContext('teacher_2', { email: 'o@school.org' }).firestore(), 'member_1'));
});
await it('teacher CAN still read a session with many documents for one student', async () => {
  // Guards the document-access budget: the rule must not re-resolve its lookups per row.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (let i = 0; i < 12; i++) {
      await setDoc(doc(db, 'artifacts', APP, 'sessions', `bulk_${i}`), { uid: 'student_1', module: 'privacy-security', startedAt: i, activeMs: 1000 });
    }
  });
  const snap = await sessionsFor(teacher, 'student_1');
  if (snap.size < 12) throw new Error(`expected at least 12 sessions, got ${snap.size}`);
});
await it('teacher CANNOT read sessions of a student in a classroom they do not own', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'artifacts', APP, 'sessions', 's_other'), { uid: 'student_2', module: 'digital-citizenship', startedAt: 1 });
  });
  await assertFails(sessionsFor(teacher, 'student_2'));
});
await it('teacher CANNOT enumerate the whole sessions collection', async () => {
  // The grant is per-student by construction; an unfiltered list must stay admin-only.
  await assertFails(getDocs(SESSIONS(teacher)));
});
await it('teacher CANNOT read another TEACHER\'s own sessions', async () => {
  // The rule requires the session owner to be role:'student', so a teacher's own module
  // visits are not readable by a peer even inside the same classroom.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'artifacts', APP, 'sessions', 's_teach'), { uid: 'teacher_1', module: 'ddc', startedAt: 1 });
  });
  await assertFails(sessionsFor(teacher, 'teacher_1'));
});
await it('a guest CANNOT read a student\'s sessions by pinning the uid', async () => {
  await assertFails(sessionsFor(guest, 'student_1'));
});
await it('a student CANNOT read a classmate\'s sessions', async () => {
  await assertFails(sessionsFor(student, 'student_2'));
});
await it('teacher still CANNOT write or delete a session', async () => {
  await assertFails(setDoc(doc(teacher, 'artifacts', APP, 'sessions', 's1'), { uid: 'student_1', activeMs: 999 }, { merge: true }));
});
console.log('\nRETIRED game_sessions — the four games write through the shared pipe now');
// The root-level `game_sessions` collection and its two match blocks were deleted when the
// games moved onto /js/telemetry.js. Nothing writes there any more, and the catch-all deny
// at the bottom of firestore.rules must be what answers anything that tries.
const GAME_SESSION = (db) => doc(db, 'game_sessions', 'anything');
await it('a signed-in student CANNOT create a game_sessions document any more', async () => {
  await assertFails(setDoc(GAME_SESSION(student), {
    game: 'read-the-signal', sessionId: 's', uid: 'student_1', scenariosPlayed: 10, correct: 7,
  }));
});
await it('a guest CANNOT create one either', async () => {
  await assertFails(setDoc(GAME_SESSION(guest), { game: 'money-moves', uid: 'guest_1' }));
});
await it('a teacher CANNOT read game_sessions (the old rule 11b grant is gone)', async () => {
  await assertFails(getDocs(query(collection(teacher, 'game_sessions'), where('uid', '==', 'student_1'))));
});
await it('a game session IS recordable at the shared path instead', async () => {
  // The replacement path, exercised the way telemetry.js writes it — including the
  // `summary` map the games attach, which is what Mission Control reads back.
  await assertSucceeds(setDoc(doc(student, 'artifacts', APP, 'sessions', 'game_s1'), {
    uid: 'student_1', module: 'read-the-signal', gameName: 'Read the Signal', startedAt: 1,
    summary: { game: 'read-the-signal', scenariosPlayed: 10, correct: 7, categories: { phishing: { played: 5, correct: 2 } } },
  }));
});
await it('...and a choice event carrying a skill tag is accepted by the events rule', async () => {
  await assertSucceeds(setDoc(doc(student, 'artifacts', APP, 'events', 'game_e1'), {
    uid: 'student_1', module: 'read-the-signal', gameName: 'Read the Signal',
    sessionId: 'game_s1', event: 'choice', step: 3,
    meta: { scenarioIndex: 2, correct: false, category: 'phishing' }, ts: 1, clientTs: 1,
  }));
});

await it('a Pattern Lab session and event are accepted, carrying the `stream` tag', async () => {
  // Ticket 5: Pattern Lab writes through the SAME pipe, tagged so Insider can exclude it.
  // Rule #11's hasOnly() allowlist is what decides whether a new top-level field is
  // writable at all — a `stream` missing from that list would be denied in production
  // with nothing but a console warning, and the calibration data would silently be zero.
  await assertSucceeds(setDoc(doc(student, 'artifacts', APP, 'sessions', 'pl_s1'), {
    uid: 'student_1', module: 'pattern-lab', gameName: 'Pattern Lab', stream: 'pattern-lab',
    startedAt: 1, stepsTotal: 9,
    summary: { stream: 'pattern-lab', grade: 6, itemsAnswered: 9, bySubtest: { 'number-series': { served: 1, correct: 1 } } },
  }));
  await assertSucceeds(setDoc(doc(student, 'artifacts', APP, 'events', 'pl_e1'), {
    uid: 'student_1', module: 'pattern-lab', gameName: 'Pattern Lab', stream: 'pattern-lab',
    sessionId: 'pl_s1', event: 'choice', step: 3,
    meta: { itemId: 'ns-04', subtest: 'number-series', level: 13, correct: false, chosen: 2, answer: 1 },
    ts: 1, clientTs: 1,
  }));
});

await it('teacher CAN read a classroom student\'s scenario_attempts (the drill-down)', async () => {
  // Rule #6 already covers this; asserted here because Mission Control's step-by-step
  // breakdown is unreadable without it, and #6 is the rule a future roster change is most
  // likely to touch.
  await assertSucceeds(getDocs(collection(teacher, 'artifacts', APP, 'users', 'student_1', 'game_scores', 'g1', 'scenario_attempts')));
});

// Insider (public/insider/index.html) is one Promise.all of ten reads. A source the rules
// deny does not fail loudly — safe() swallows it, the page renders with that source empty,
// and the amber strip is the only tell. `users` was denied for two days after the privilege
// fix split rule #2, because the admin's list grant had been riding on that rule's
// zero-segment {document=**} match. So assert every source, not just the interesting ones.
console.log('\nINSIDER — the admin allowlist can read every source loadEverything() asks for');
// TOPIC SELECTIONS (Comms pass one). Same shape as course_feedback: a student may file a
// selection for THEMSELVES and read none of them back. Not student-readable is the point,
// not an oversight — a list of what a child says they are bad at is a behavioural record
// about a minor, and nothing in the product reads it back to them.
console.log('\nTOPIC SELECTIONS — create for yourself, read by nobody but an admin');
const TOPICS = (db) => collection(db, 'artifacts', APP, 'topic_selections');
await it('a student CAN file a topic selection under their own uid', async () => {
  await assertSucceeds(setDoc(doc(TOPICS(student), 'mine'), { uid: 'student_1', category: 'Money', ageTier: 'under13', timestamp: 2 }));
});
await it('a student CANNOT file one under someone ELSE uid', async () => {
  await assertFails(setDoc(doc(TOPICS(student), 'forged'), { uid: 'teacher_1', category: 'Money', ageTier: null, timestamp: 2 }));
});
await it('a guest CANNOT file one under another uid either', async () => {
  await assertFails(setDoc(doc(TOPICS(guest), 'forged2'), { uid: 'student_1', category: 'Money', ageTier: null, timestamp: 2 }));
});
await it('a student CANNOT read back their OWN topic selection', async () => {
  await assertFails(getDoc(doc(TOPICS(student), 't1')));
});
await it('a student CANNOT enumerate topic selections', async () => {
  await assertFails(getDocs(TOPICS(student)));
});
await it('a TEACHER cannot read topic selections, even for their own student', async () => {
  await assertFails(getDocs(TOPICS(teacher)));
  await assertFails(getDoc(doc(TOPICS(teacher), 't1')));
});
await it('an admin CAN read a topic selection', async () => {
  await assertSucceeds(getDoc(doc(TOPICS(admin), 't1')));
});

const INSIDER_SOURCES = {
  users: db => getDocs(collection(db, 'artifacts', APP, 'users')),
  classrooms: db => getDocs(collection(db, 'artifacts', APP, 'classrooms')),
  messages: db => getDocs(query(collection(db, 'artifacts', APP, 'messages'), orderBy('timestamp', 'desc'), limit(300))),
  course_feedback: db => getDocs(query(collection(db, 'artifacts', APP, 'course_feedback'), orderBy('timestamp', 'desc'), limit(1000))),
  topic_selections: db => getDocs(query(collection(db, 'artifacts', APP, 'topic_selections'), orderBy('timestamp', 'desc'), limit(1000))),
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

// RECRUIT CODES (identity reset, 2026-11-23) — read-only until the 2027-06-30 sunset.
// The one thing the legacy restore needs is a single-document get by the exact code;
// nothing may create or change a code, and only the admin may enumerate them.
console.log('\nRECRUIT CODES — read-only: exact-code get only, no list, no writes');
const CODE = (db, code) => doc(db, 'artifacts', APP, 'recruit_codes', code);
const CODES = (db) => collection(db, 'artifacts', APP, 'recruit_codes');
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(CODE(db, 'arctic-fox-trot-4821'), { uid: 'recruit_new', displayName: 'Arctic Fox Trot 4821', avatar: 'owl', progress: { 'social-intelligence': { highestUnlocked: 4 } }, classroomCode: 'KM7QPD', createdAt: 1, updatedAt: 1 });
  await setDoc(CODE(db, 'sunny-bear-glide'), { uid: 'recruit_old', displayName: 'Sunny Bear Glide', avatar: 'bee', progress: {}, createdAt: 1, updatedAt: 1 });
});
const recruitNew = env.authenticatedContext('recruit_new', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const freshDevice = env.authenticatedContext('fresh_device', { firebase: { sign_in_provider: 'anonymous' } }).firestore();

await it('a signed-in session CAN get one code by its exact id (the restore read), new format', async () => {
  await assertSucceeds(getDoc(CODE(freshDevice, 'arctic-fox-trot-4821')));
});
await it('...and an OLD-format (word-word-word, no suffix) code too', async () => {
  await assertSucceeds(getDoc(CODE(freshDevice, 'sunny-bear-glide')));
});
await it('a signed-out visitor CANNOT get a code', async () => {
  await assertFails(getDoc(CODE(env.unauthenticatedContext().firestore(), 'sunny-bear-glide')));
});
await it('a non-admin CANNOT list the recruit_codes collection', async () => {
  await assertFails(getDocs(CODES(freshDevice)));
  await assertFails(getDocs(CODES(teacher)));
});
await it('a non-admin CANNOT query recruit_codes, even for codes that point at themselves', async () => {
  await assertFails(getDocs(query(CODES(recruitNew), where('uid', '==', 'recruit_new'))));
  await assertFails(getDocs(query(CODES(freshDevice), limit(1))));
});
await it('nobody CAN create a code any more, even naming themselves as its owner', async () => {
  await assertFails(setDoc(CODE(freshDevice, 'brave-owl-dash-1234'), { uid: 'fresh_device', displayName: 'Brave Owl Dash 1234', progress: {}, createdAt: 2, updatedAt: 2 }));
});
await it('the code\'s own owner CANNOT update it (no more progress mirroring)', async () => {
  await assertFails(setDoc(CODE(recruitNew, 'arctic-fox-trot-4821'),
    { progress: { 'social-intelligence': { highestUnlocked: 5 } }, updatedAt: 2 }, { merge: true }));
});
await it('another session CANNOT move a code\'s uid pointer (the old redemption write)', async () => {
  await assertFails(setDoc(CODE(freshDevice, 'sunny-bear-glide'), { uid: 'fresh_device', updatedAt: 3 }, { merge: true }));
});
await it('a non-admin CANNOT delete a code; the admin CAN (deletion requests)', async () => {
  await assertFails(deleteDoc(CODE(freshDevice, 'sunny-bear-glide')));
  await assertSucceeds(deleteDoc(CODE(admin, 'sunny-bear-glide')));
});

// THE RESTORE WRITES — what AuthCore.restoreFromRecruitCode / restoreFromAccount do with
// what they read: all of it lands under the CURRENT session's own uid, so it needs no rule
// beyond the ones a normal student already has.
console.log('\nLEGACY RESTORE — copies land under the current session only');
await it('a fresh session CAN copy restored progress into its own module_progress', async () => {
  await assertSucceeds(setDoc(PROGRESS(freshDevice, 'fresh_device', 'social-intelligence'), { highestUnlocked: 4, lastUpdated: 2 }));
});
await it('...rejoin the class the code pointed at, and take the restored name', async () => {
  await assertSucceeds(setDoc(MEMBER(freshDevice, 'KM7QPD', 'fresh_device'), { classroomCode: 'KM7QPD', uid: 'fresh_device', joinedAt: 2 }));
  await assertSucceeds(setDoc(U(freshDevice, 'fresh_device'),
    { displayName: 'Arctic Fox Trot 4821', email: null, isGuest: true, role: 'student', classroomCode: 'KM7QPD' }, { merge: true }));
});
await it('...but CANNOT write into the old account it restored from', async () => {
  await assertFails(setDoc(PROGRESS(freshDevice, 'student_1', 'social-intelligence'), { highestUnlocked: 1 }));
});

// STUDENT SAVE (2026-11-24) — a student who saves with a save code links an email/password
// credential at save.allgoodacademy.com onto their anonymous uid (public/js/student-save.js).
// That puts 'email' in the token's identities, so the rules must still treat them as a
// student: same uid, same progress, same class, and no way to become a teacher.
console.log('\nSTUDENT SAVE — a save code keeps the same student and is never a teacher sign-in');
const SAVE_EMAIL = 's0123456789abcdef0123456789abcdef01234567@save.allgoodacademy.com';
const saved = env.authenticatedContext('member_1', { email: SAVE_EMAIL, firebase: { sign_in_provider: 'password', identities: { email: [SAVE_EMAIL] } } }).firestore();
await it('a save-code session (same uid) CAN still write its own profile name and progress', async () => {
  await assertSucceeds(setDoc(U(saved, 'member_1'), { displayName: 'Maya' }, { merge: true }));
  await assertSucceeds(setDoc(PROGRESS(saved, 'member_1', 'privacy-security'), { highestUnlocked: 3 }, { merge: true }));
});
await it('...and keeps its class membership: its teacher can still read its profile', async () => {
  await assertSucceeds(getDoc(U(teacher, 'member_1')));
});
await it('a save-code session CANNOT create a classroom', async () => {
  await assertFails(setDoc(CLASS(saved, 'SAVE01'), { teacherUid: 'member_1', teacherName: 'Maya', createdAt: 2 }));
});
await it('a save-code session CANNOT become teacher even of a classroom it owns', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(CLASS(ctx.firestore(), 'SAVE02'), { teacherUid: 'member_1', teacherName: 'Maya', createdAt: 2 });
  });
  await assertFails(setDoc(U(saved, 'member_1'), { role: 'teacher', classroomCode: 'SAVE02' }, { merge: true }));
});
await it('a look-alike domain is NOT excluded (only save.allgoodacademy.com is)', async () => {
  const other = env.authenticatedContext('pw_2', { email: 'x@notsave.allgoodacademy.com.evil.org', firebase: { sign_in_provider: 'password', identities: { email: ['x@notsave.allgoodacademy.com.evil.org'] } } }).firestore();
  await assertSucceeds(createClass(other, 'pw_2', 'PASS02', { teacherName: 'Pw' }));
});

// DISPLAY NAME LENGTH (Ticket 2) — displayName on the profile doc is otherwise
// unconstrained free text a student could put in front of their teacher in Mission
// Control. 60 chars is well over the longest real value (a recruit-code-derived name).
console.log('\nPROFILE displayName — length-capped, characters unrestricted');
await it('a normal displayName write still succeeds', async () => {
  await assertSucceeds(setDoc(U(guest, 'guest_1'), { displayName: 'Sunny Bear Glide' }, { merge: true }));
});
await it('a recruit-code-derived displayName (with the new numeric suffix) still succeeds', async () => {
  await assertSucceeds(setDoc(U(guest, 'guest_1'), { displayName: 'Arctic Fox Trot 4821' }, { merge: true }));
});
await it('a displayName over 60 characters is DENIED', async () => {
  await assertFails(setDoc(U(guest, 'guest_1'), { displayName: 'x'.repeat(61) }, { merge: true }));
});
await it('a displayName at exactly 60 characters succeeds', async () => {
  await assertSucceeds(setDoc(U(guest, 'guest_1'), { displayName: 'x'.repeat(60) }, { merge: true }));
});

// ═══════════════════════════════════════════════════════════════════════════════════════
// MISSION CONTROL PRO (2026-11-25): the drill-down's events grant, more than one class, the
// Pro plan and the free plan's one-class limit.
// ═══════════════════════════════════════════════════════════════════════════════════════
const EVENTS = (db) => collection(db, 'artifacts', APP, 'events');
const CLASSES = (db) => collection(db, 'artifacts', APP, 'classrooms');
const FUTURE = () => Timestamp.fromMillis(Date.now() + 365 * 24 * 3600 * 1000);
const PAST = () => Timestamp.fromMillis(Date.now() - 24 * 3600 * 1000);
const gIdent = (uid, email) => ({ email, firebase: { sign_in_provider: 'google.com', identities: { 'google.com': [uid], email: [email] } } });

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  // A student in teacher_2's class only.
  await setDoc(U(db, 'other_student'), { role: 'student', classroomCode: 'ZZ9XYZ', displayName: 'Quiet Lynx' });
  await setDoc(MEMBER(db, 'ZZ9XYZ', 'other_student'), { classroomCode: 'ZZ9XYZ', uid: 'other_student', joinedAt: 1 });
  for (const [id, uid] of [['ev_member', 'member_1'], ['ev_multi', 'multi_1'], ['ev_legacy', 'student_1'], ['ev_other', 'other_student']]) {
    await setDoc(doc(db, 'artifacts', APP, 'events', id), { uid, module: 'privacy-security', event: 'choice', meta: { scenarioIndex: 1, choiceIndex: 0, score: 3 }, ts: 1 });
  }
  // teacher_1 also owns a second class (as if created while on Pro).
  await setDoc(CLASS(db, 'KM7SEC'), { teacherUid: 'teacher_1', teacherName: 'Ms Real', createdAt: 3 });
});

console.log('\nEVENTS (11b) — a teacher reads their own students\' events, one student at a time');
await it('teacher CAN read a modern member\'s events (where uid == member)', async () => {
  await assertSucceeds(getDocs(query(EVENTS(teacher), where('uid', '==', 'member_1'))));
});
await it('teacher CAN read a multi-class member\'s events (join-table only)', async () => {
  await assertSucceeds(getDocs(query(EVENTS(teacher), where('uid', '==', 'multi_1'))));
});
await it('teacher CAN read a legacy single-field student\'s events', async () => {
  await assertSucceeds(getDocs(query(EVENTS(teacher), where('uid', '==', 'student_1'))));
});
await it('teacher CANNOT read events of a student in ANOTHER teacher\'s class', async () => {
  await assertFails(getDocs(query(EVENTS(teacher), where('uid', '==', 'other_student'))));
  await assertFails(getDoc(doc(teacher, 'artifacts', APP, 'events', 'ev_other')));
});
await it('the other teacher CANNOT read teacher_1\'s students\' events', async () => {
  const t2 = env.authenticatedContext('teacher_2', { email: 'o@school.org' }).firestore();
  await assertFails(getDocs(query(EVENTS(t2), where('uid', '==', 'member_1'))));
  await assertSucceeds(getDocs(query(EVENTS(t2), where('uid', '==', 'other_student'))));
});
await it('teacher CANNOT run an unfiltered (class-wide or whole-site) events query', async () => {
  await assertFails(getDocs(query(EVENTS(teacher), limit(5))));
});
await it('teacher CANNOT write, edit or delete a student\'s event', async () => {
  await assertFails(setDoc(doc(teacher, 'artifacts', APP, 'events', 'ev_member'), { uid: 'member_1', event: 'x' }));
  await assertFails(deleteDoc(doc(teacher, 'artifacts', APP, 'events', 'ev_member')));
});
await it('a student reads NOTHING new: not their own events, not a classmate\'s', async () => {
  const m = env.authenticatedContext('member_1').firestore();
  await assertFails(getDocs(query(EVENTS(m), where('uid', '==', 'member_1'))));
  await assertFails(getDocs(query(EVENTS(m), where('uid', '==', 'multi_1'))));
  await assertFails(getDoc(doc(m, 'artifacts', APP, 'events', 'ev_member')));
  await assertFails(getDoc(PLAN(m, 'teacher_1')));
  await assertFails(getDocs(query(CLASSES(m), where('teacherUid', '==', 'teacher_1'))));
});
await it('a STUDENT whose profile names their class is NOT their classmates\' teacher (pre-existing hole, closed)', async () => {
  // member_1's own profile says classroomCode KM7QPD. Before myTaughtClassroomCode() the
  // rules took that as "the class I teach" and opened every classmate to them.
  const m = env.authenticatedContext('member_1').firestore();
  await assertFails(getDoc(U(m, 'multi_1')));
  await assertFails(getDoc(PROGRESS(m, 'student_1', 'social-intelligence')));
  await assertFails(getDocs(query(collection(m, 'artifacts', APP, 'sessions'), where('uid', '==', 'multi_1'))));
});
await it('an anonymous guest CANNOT read any event', async () => {
  await assertFails(getDocs(query(EVENTS(guest), where('uid', '==', 'member_1'))));
});

console.log('\nCLASS LIST — a teacher lists only their own classes');
await it('teacher CAN list classrooms where teacherUid == their own uid', async () => {
  const snap = await assertSucceeds(getDocs(query(CLASSES(teacher), where('teacherUid', '==', 'teacher_1'))));
  if (snap.size < 2) throw new Error(`expected both of teacher_1's classes, got ${snap.size}`);
});
await it('teacher CANNOT list another teacher\'s classes', async () => {
  await assertFails(getDocs(query(CLASSES(teacher), where('teacherUid', '==', 'teacher_2'))));
});
await it('teacher CANNOT list every classroom', async () => {
  await assertFails(getDocs(query(CLASSES(teacher), limit(10))));
});

console.log('\nACTIVE CLASS — users/{uid}.classroomCode can only name a class this teacher owns');
await it('teacher CAN switch their active class to another class they own', async () => {
  await assertSucceeds(setDoc(U(teacher, 'teacher_1'), { classroomCode: 'KM7SEC' }, { merge: true }));
});
await it('...and every join-table grant follows it: the old class\'s join-table-only member is out of reach', async () => {
  // multi_1 is in KM7QPD by join table only (their profile names ZZ9XYZ), so nothing but the
  // active class reaches them. (A legacy student whose own profile names one of this
  // teacher's classes stays readable through the legacy fallback whichever class is active:
  // they are still this teacher's student.)
  await assertFails(getDocs(query(EVENTS(teacher), where('uid', '==', 'multi_1'))));
  await assertFails(getDoc(U(teacher, 'multi_1')));
});
await it('teacher CAN switch back', async () => {
  await assertSucceeds(setDoc(U(teacher, 'teacher_1'), { classroomCode: 'KM7QPD' }, { merge: true }));
  await assertSucceeds(getDoc(U(teacher, 'multi_1')));
});
await it('teacher CANNOT point their active class at ANOTHER teacher\'s class', async () => {
  await assertFails(setDoc(U(teacher, 'teacher_1'), { classroomCode: 'ZZ9XYZ' }, { merge: true }));
});
await it('...nor by dropping to role student in the same write', async () => {
  await assertFails(setDoc(U(teacher, 'teacher_1'), { role: 'student', classroomCode: 'ZZ9XYZ' }, { merge: true }));
});
await it('a STUDENT can still join any class that exists (unchanged)', async () => {
  await assertSucceeds(setDoc(U(student, 'student_1'), { classroomCode: 'ZZ9XYZ' }, { merge: true }));
  await assertSucceeds(setDoc(U(student, 'student_1'), { classroomCode: 'KM7QPD' }, { merge: true }));
});

console.log('\nTEACHER PLANS (13) — only the admin grants Pro; a teacher reads their own');
const freeT = env.authenticatedContext('free_1', gIdent('2001', 'free@school.org')).firestore();
const proT = env.authenticatedContext('pro_1', gIdent('2002', 'pro@school.org')).firestore();
await it('a teacher CANNOT grant themselves Pro', async () => {
  await assertFails(setDoc(PLAN(freeT, 'free_1'), { plan: 'pro', proUntil: FUTURE(), grantedBy: 'me', note: '' }));
});
await it('the admin CAN grant Pro with an end date', async () => {
  await assertSucceeds(setDoc(PLAN(admin, 'pro_1'), { plan: 'pro', proUntil: FUTURE(), grantedBy: 'balgood93@gmail.com', note: 'UAT', updatedAt: 1 }));
});
await it('the admin CANNOT write a plan value other than free/pro, or an unknown field', async () => {
  await assertFails(setDoc(PLAN(admin, 'pro_2'), { plan: 'platinum', proUntil: FUTURE(), grantedBy: 'x', note: '' }));
  await assertFails(setDoc(PLAN(admin, 'pro_2'), { plan: 'pro', proUntil: FUTURE(), grantedBy: 'x', note: '', isAdmin: true }));
});
await it('a teacher CAN read their own plan, and CANNOT read anyone else\'s', async () => {
  await assertSucceeds(getDoc(PLAN(proT, 'pro_1')));
  await assertFails(getDoc(PLAN(freeT, 'pro_1')));
});
await it('a teacher CANNOT edit or delete their plan once granted', async () => {
  await assertFails(setDoc(PLAN(proT, 'pro_1'), { proUntil: Timestamp.fromMillis(Date.now() + 9e12) }, { merge: true }));
  await assertFails(deleteDoc(PLAN(proT, 'pro_1')));
});
await it('only the admin can list plans (Insider\'s Pro teachers list)', async () => {
  await assertSucceeds(getDocs(collection(admin, 'artifacts', APP, 'teacher_plans')));
  await assertFails(getDocs(collection(proT, 'artifacts', APP, 'teacher_plans')));
});

console.log('\nFREE PLAN — one class, enforced in the rules');
await it('a free teacher CAN create their first class (with its marker, one batch)', async () => {
  await assertSucceeds(createClass(freeT, 'free_1', 'FREE01', { teacherName: 'Ms Free' }));
  await assertSucceeds(setDoc(U(freeT, 'free_1'), { role: 'teacher', classroomCode: 'FREE01' }, { merge: true }));
});
await it('a free teacher\'s SECOND create is DENIED (with or without a marker)', async () => {
  await assertFails(createClass(freeT, 'free_1', 'FREE02', { teacherName: 'Ms Free' }));
  await assertFails(createClass(freeT, 'free_1', 'FREE03', { teacherName: 'Ms Free' }, { withMarker: false }));
});
await it('...still DENIED after editing their own profile (clearing the class, re-asserting teacher)', async () => {
  await assertSucceeds(setDoc(U(freeT, 'free_1'), { classroomCode: '__none__' }, { merge: true }));
  await assertSucceeds(setDoc(U(freeT, 'free_1'), { proUntil: 9e15, plan: 'pro', classroomCount: 0 }, { merge: true }));
  await assertFails(createClass(freeT, 'free_1', 'FREE04', { teacherName: 'Ms Free' }));
  await assertFails(createClass(freeT, 'free_1', 'FREE05', { teacherName: 'Ms Free' }, { withMarker: false }));
  await assertSucceeds(setDoc(U(freeT, 'free_1'), { classroomCode: 'FREE01' }, { merge: true }));
});
await it('a teacher CANNOT delete, edit or replace their free-class marker', async () => {
  await assertFails(deleteDoc(MARKER(freeT, 'free_1')));
  await assertFails(setDoc(MARKER(freeT, 'free_1'), { firstClassCode: 'FREE01', createdAt: 9 }));
});
await it('a first class with NO marker is DENIED (the marker is what records it)', async () => {
  const fresh = env.authenticatedContext('free_2', gIdent('2003', 'f2@school.org')).firestore();
  await assertFails(createClass(fresh, 'free_2', 'FRE201', { teacherName: 'X' }, { withMarker: false }));
});
await it('a marker naming somebody else\'s class is DENIED', async () => {
  const fresh = env.authenticatedContext('free_3', gIdent('2004', 'f3@school.org')).firestore();
  await assertFails(setDoc(MARKER(fresh, 'free_3'), { firstClassCode: 'KM7QPD', createdAt: 1 }));
});
await it('a teacher whose class predates the plan CAN backfill their own marker, and only for their class', async () => {
  await assertFails(setDoc(MARKER(teacher, 'teacher_1'), { firstClassCode: 'ZZ9XYZ', createdAt: 1 }));
  await assertSucceeds(setDoc(MARKER(teacher, 'teacher_1'), { firstClassCode: 'KM7QPD', createdAt: 1 }));
});
await it('assigning still works on a free teacher\'s own class, including simulations', async () => {
  await assertSucceeds(setDoc(CLASS(freeT, 'FREE01'), { assignedModules: ['ddc'], assignedGames: [], assignedSims: ['water-cycle'] }, { merge: true }));
});

console.log('\nPRO — any number of classes; when it lapses, extras go read-only and nothing is deleted');
await it('a Pro teacher CAN create a first, second and third class', async () => {
  await assertSucceeds(createClass(proT, 'pro_1', 'PRO001', { teacherName: 'Mr Pro' }));
  await assertSucceeds(setDoc(U(proT, 'pro_1'), { role: 'teacher', classroomCode: 'PRO001' }, { merge: true }));
  await assertSucceeds(createClass(proT, 'pro_1', 'PRO002', { teacherName: 'Mr Pro' }, { withMarker: false }));
  await assertSucceeds(createClass(proT, 'pro_1', 'PRO003', { teacherName: 'Mr Pro' }, { withMarker: false }));
});
await it('...and switch between them', async () => {
  await assertSucceeds(setDoc(U(proT, 'pro_1'), { classroomCode: 'PRO003' }, { merge: true }));
  await assertSucceeds(setDoc(U(proT, 'pro_1'), { classroomCode: 'PRO002' }, { merge: true }));
});
await it('...and assign to an extra class, class-wide and per student', async () => {
  await assertSucceeds(setDoc(CLASS(proT, 'PRO002'), { assignedSims: ['snowball'] }, { merge: true }));
  await assertSucceeds(setDoc(ASSIGN(proT, 'PRO002', 'kid_9'), { classroomCode: 'PRO002', uid: 'kid_9', modules: [], games: [], sims: ['snowball'], updatedAt: 1 }));
});
await it('per-student extras reject a malformed sims field', async () => {
  await assertFails(setDoc(ASSIGN(proT, 'PRO002', 'kid_8'), { classroomCode: 'PRO002', uid: 'kid_8', modules: [], games: [], sims: 'snowball', updatedAt: 1 }));
});
await it('when Pro EXPIRES: the extra classes are still readable and listable', async () => {
  await assertSucceeds(setDoc(PLAN(admin, 'pro_1'), { plan: 'pro', proUntil: PAST(), grantedBy: 'balgood93@gmail.com', note: 'lapsed', updatedAt: 2 }));
  await assertSucceeds(getDoc(CLASS(proT, 'PRO002')));
  const snap = await assertSucceeds(getDocs(query(CLASSES(proT), where('teacherUid', '==', 'pro_1'))));
  if (snap.size !== 3) throw new Error(`expected all 3 classes still there, got ${snap.size}`);
  await assertSucceeds(setDoc(U(proT, 'pro_1'), { classroomCode: 'PRO003' }, { merge: true }));
});
await it('...but read-only: assigning to an extra class is DENIED', async () => {
  await assertFails(setDoc(CLASS(proT, 'PRO002'), { assignedSims: [] }, { merge: true }));
  await assertFails(setDoc(ASSIGN(proT, 'PRO002', 'kid_9'), { classroomCode: 'PRO002', uid: 'kid_9', modules: ['ddc'], games: [], updatedAt: 2 }));
  await assertFails(deleteDoc(CLASS(proT, 'PRO002')));
});
await it('...the free class keeps working', async () => {
  await assertSucceeds(setDoc(CLASS(proT, 'PRO001'), { assignedModules: ['ddc'] }, { merge: true }));
});
await it('...and a new class is DENIED until Pro is renewed', async () => {
  await assertFails(createClass(proT, 'pro_1', 'PRO004', { teacherName: 'Mr Pro' }, { withMarker: false }));
  await assertSucceeds(setDoc(PLAN(admin, 'pro_1'), { plan: 'pro', proUntil: FUTURE(), grantedBy: 'balgood93@gmail.com', note: 'renewed', updatedAt: 3 }));
  await assertSucceeds(setDoc(CLASS(proT, 'PRO002'), { assignedSims: [] }, { merge: true }));
});

console.log('\nSTRIPE (15) — only the webhook function writes; the admin may read unmatched payments');
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'artifacts', APP, 'stripe_events', 'evt_1'), { type: 'checkout.session.completed', uid: 'pro_1', result: 'pro_extended' });
  await setDoc(doc(db, 'artifacts', APP, 'stripe_customers', 'cus_1'), { uid: 'pro_1' });
  await setDoc(doc(db, 'artifacts', APP, 'stripe_unmatched', 'evt_2'), { email: 'x@y.org', amount: 4900, reason: 'no_account' });
});
const STRIPE = (db, c, id) => doc(db, 'artifacts', APP, c, id);
await it('a teacher CANNOT read stripe_events, stripe_customers or stripe_unmatched (get or list)', async () => {
  for (const c of ['stripe_events', 'stripe_customers', 'stripe_unmatched']) {
    await assertFails(getDoc(STRIPE(proT, c, c === 'stripe_events' ? 'evt_1' : c === 'stripe_customers' ? 'cus_1' : 'evt_2')));
    await assertFails(getDocs(collection(proT, 'artifacts', APP, c)));
  }
});
await it('a teacher CANNOT write any Stripe collection', async () => {
  await assertFails(setDoc(STRIPE(proT, 'stripe_events', 'evt_fake'), { uid: 'pro_1' }));
  await assertFails(setDoc(STRIPE(proT, 'stripe_customers', 'cus_fake'), { uid: 'pro_1' }));
  await assertFails(setDoc(STRIPE(proT, 'stripe_unmatched', 'evt_fake'), { email: 'a@b.org' }));
});
await it('a teacher CANNOT write teacher_plans (not even to extend a plan they have)', async () => {
  await assertFails(setDoc(PLAN(proT, 'pro_1'), { plan: 'pro', proUntil: FUTURE(), grantedBy: 'stripe', note: 'Stripe cs_fake', updatedAt: 1 }));
  await assertFails(setDoc(PLAN(freeT, 'free_1'), { plan: 'pro', proUntil: FUTURE(), grantedBy: 'stripe', note: 'Stripe cs_fake', updatedAt: 1 }));
});
await it('an anonymous student CANNOT read any Stripe collection', async () => {
  const anon = env.authenticatedContext('anon_s', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  await assertFails(getDocs(collection(anon, 'artifacts', APP, 'stripe_unmatched')));
  await assertFails(getDoc(STRIPE(anon, 'stripe_customers', 'cus_1')));
});
await it('the admin CAN read stripe_unmatched (Insider) but CANNOT write it, nor read the other two', async () => {
  await assertSucceeds(getDocs(collection(admin, 'artifacts', APP, 'stripe_unmatched')));
  await assertFails(setDoc(STRIPE(admin, 'stripe_unmatched', 'evt_3'), { email: 'a@b.org' }));
  await assertFails(deleteDoc(STRIPE(admin, 'stripe_unmatched', 'evt_2')));
  await assertFails(getDocs(collection(admin, 'artifacts', APP, 'stripe_events')));
  await assertFails(getDocs(collection(admin, 'artifacts', APP, 'stripe_customers')));
});

// PRODUCT UPDATES + WEEKLY REPORT (2026-11-25). Teacher email choices live on the teacher's
// own profile: writable by them, by nobody else.
await it('a teacher CAN set productUpdates and weeklyReport on their own profile', async () => {
  await assertSucceeds(setDoc(U(teacher, 'teacher_1'), { productUpdates: { optedIn: true, source: 'setup', updatedAt: 1 }, weeklyReport: false }, { merge: true }));
});
await it('nobody else CAN set productUpdates on a teacher profile (not a student, not another teacher)', async () => {
  const other = env.authenticatedContext('student_1').firestore();
  await assertFails(setDoc(U(other, 'teacher_1'), { productUpdates: { optedIn: true, source: 'setup', updatedAt: 1 } }, { merge: true }));
  const anon = env.authenticatedContext('anon_pu', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  await assertFails(setDoc(U(anon, 'teacher_1'), { productUpdates: { optedIn: true, source: 'settings', updatedAt: 1 } }, { merge: true }));
});

await env.cleanup();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
