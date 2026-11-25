// Firebase Storage security-rules tests: the paid facilitator guides (storage.rules).
// Run against the Storage + Firestore emulators together, because the rule reads the
// teacher's plan from Firestore (firestore.get):
//   ./scripts/run-rules-tests.sh
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { ref, getBytes, getMetadata, uploadString } from 'firebase/storage';
import { readFileSync } from 'node:fs';

const APP = 'allgood-academy';
const GUIDE = 'facilitator-guides/the-snowball.pdf';

let passed = 0, failed = 0;
async function it(name, fn) {
  try { await fn(); console.log(`  ok   ${name}`); passed++; }
  catch (e) { console.log(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`); failed++; }
}

const env = await initializeTestEnvironment({
  projectId: 'allgood-rules-test',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
  storage: { rules: readFileSync(new URL('../storage.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 9199 },
});

const DAY = 24 * 3600 * 1000;
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'artifacts', APP, 'teacher_plans', 'pro_t'), { plan: 'pro', proUntil: Timestamp.fromMillis(Date.now() + 365 * DAY), grantedBy: 'admin', note: '' });
  await setDoc(doc(db, 'artifacts', APP, 'teacher_plans', 'lapsed_t'), { plan: 'pro', proUntil: Timestamp.fromMillis(Date.now() - DAY), grantedBy: 'admin', note: '' });
  await setDoc(doc(db, 'artifacts', APP, 'teacher_plans', 'free_t'), { plan: 'free', proUntil: null, grantedBy: 'admin', note: '' });
  await uploadString(ref(ctx.storage(), GUIDE), '%PDF-1.4 test', 'raw', { contentType: 'application/pdf' });
  await uploadString(ref(ctx.storage(), 'other/thing.txt'), 'x');
});

const as = (uid) => env.authenticatedContext(uid, { email: `${uid}@school.org`, firebase: { sign_in_provider: 'google.com', identities: { 'google.com': [uid] } } }).storage();

console.log('\nFACILITATOR GUIDES — Pro teachers only');
await it('a Pro teacher CAN read a guide (download URL metadata and bytes)', async () => {
  await assertSucceeds(getMetadata(ref(as('pro_t'), GUIDE)));
  await assertSucceeds(getBytes(ref(as('pro_t'), GUIDE)));
});
await it('a FREE teacher CANNOT read a guide', async () => {
  await assertFails(getMetadata(ref(as('free_t'), GUIDE)));
  await assertFails(getBytes(ref(as('free_t'), GUIDE)));
});
await it('a teacher with NO plan document CANNOT read a guide', async () => {
  await assertFails(getBytes(ref(as('nobody_t'), GUIDE)));
});
await it('a teacher whose Pro has EXPIRED CANNOT read a guide', async () => {
  await assertFails(getBytes(ref(as('lapsed_t'), GUIDE)));
});
await it('someone SIGNED OUT CANNOT read a guide', async () => {
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), GUIDE)));
});
await it('an anonymous student session CANNOT read a guide', async () => {
  await assertFails(getBytes(ref(env.authenticatedContext('kid', { firebase: { sign_in_provider: 'anonymous' } }).storage(), GUIDE)));
});
await it('nobody — not even Pro — can UPLOAD or overwrite a guide from the client', async () => {
  await assertFails(uploadString(ref(as('pro_t'), GUIDE), 'x'));
  await assertFails(uploadString(ref(as('pro_t'), 'facilitator-guides/new.pdf'), 'x'));
});
await it('anything outside facilitator-guides/ is closed to everyone', async () => {
  await assertFails(getBytes(ref(as('pro_t'), 'other/thing.txt')));
  await assertFails(uploadString(ref(as('pro_t'), 'other/new.txt'), 'x'));
});

await env.cleanup();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
