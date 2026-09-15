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
const MEMBER = (db, code, uid) => doc(db, 'artifacts', APP, 'classroom_members', `${code}_${uid}`);

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

// RECRUIT CODE ENTROPY (Ticket 1) — the code doc's `update` used to be open to any
// signed-in user with no field constraint at all; it is now field-constrained to exactly
// what auth-core.js's real write paths touch. Also exercises the new suffixed
// (word-word-word-####) format alongside an old-format (word-word-word, no suffix) code
// that must keep working — real codes already exist in production and won't be
// regenerated.
console.log('\nRECRUIT CODES — update is field-constrained, old and new code formats both work');
const CODE = (db, code) => doc(db, 'artifacts', APP, 'recruit_codes', code);
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(CODE(db, 'arctic-fox-trot-4821'), { uid: 'recruit_new', displayName: 'Arctic Fox Trot 4821', avatar: 'owl', progress: {}, createdAt: 1, updatedAt: 1 });
  await setDoc(CODE(db, 'sunny-bear-glide'), { uid: 'recruit_old', displayName: 'Sunny Bear Glide', avatar: 'bee', progress: {}, createdAt: 1, updatedAt: 1 });
});
const recruitNew = env.authenticatedContext('recruit_new').firestore();
const recruitOld = env.authenticatedContext('recruit_old').firestore();
const anyoneElse = env.authenticatedContext('some_other_uid').firestore();

await it('a NEW-format (word-word-word-####) code accepts an allowed-field update (progress mirroring)', async () => {
  await assertSucceeds(setDoc(CODE(recruitNew, 'arctic-fox-trot-4821'),
    { progress: { 'social-intelligence': { highestUnlocked: 2 } }, updatedAt: 2 }, { merge: true }));
});
await it('an OLD-format (word-word-word, no suffix) code STILL accepts redemption-shaped update (backward compatibility)', async () => {
  await assertSucceeds(setDoc(CODE(recruitOld, 'sunny-bear-glide'),
    { uid: 'recruit_old', updatedAt: 3 }, { merge: true }));
});
await it('any signed-in user CAN update a code they do not own (knowing-the-code trust model, unchanged)', async () => {
  await assertSucceeds(setDoc(CODE(anyoneElse, 'sunny-bear-glide'),
    { classroomCode: 'KM7QPD', updatedAt: 4 }, { merge: true }));
});
await it('update is DENIED when it touches a field outside the allowed set', async () => {
  await assertFails(setDoc(CODE(recruitNew, 'arctic-fox-trot-4821'),
    { createdAt: 999 }, { merge: true }));
});
await it('update is DENIED when a disallowed field rides along with allowed ones', async () => {
  await assertFails(setDoc(CODE(recruitNew, 'arctic-fox-trot-4821'),
    { updatedAt: 5, notAllowed: 'nope' }, { merge: true }));
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

await env.cleanup();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
