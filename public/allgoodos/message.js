// "Message me here" on the Allgood OS landing page.
//
// Sends the visitor's note to the same place every other portal's messages go:
// artifacts/{appId}/messages, which is what the Insider dashboard's Inbox reads. The
// existing Firestore rule (create when senderUid == request.auth.uid) already covers it,
// so the visitor is signed in anonymously just for the send. No rule change.
//
// Two deliberate differences from /js/auth-core.js, which every learner page loads:
//   - A separate, NAMED Firebase app with in-memory auth. Anything else would share the
//     default app's persisted session with allgoodacademy.com, so a buy-sheet visitor
//     would arrive on the main site already signed in as a guest, and a student's saved
//     session on a shared device could be the uid this note is filed under.
//   - No user profile document is written. The sender is an adult business contact, not
//     a learner; Insider already treats a sender with no profile as an orphan and leaves
//     it out of every user count.
//
// Firebase is only fetched when the visitor actually sends, so the page itself still
// makes no third-party requests beyond Google Fonts.
const SOURCE = 'Allgood OS landing page';
const APP_ID = 'allgood-academy';
const CONFIG = {
  apiKey: 'AIzaSyAf2SO8xovrApl52udUUoR1n9WBnERr_ko',
  authDomain: 'allgood-academy.firebaseapp.com',
  projectId: 'allgood-academy',
  storageBucket: 'allgood-academy.firebasestorage.app',
  messagingSenderId: '978829044870',
  appId: '1:978829044870:web:6c780f64230a77ad0ab507',
};
const FB = 'https://www.gstatic.com/firebasejs/11.6.1/';

const open = document.getElementById('dm-open');
const form = document.getElementById('dm');
const status = document.getElementById('dm-status');
const sendBtn = form.querySelector('.send');

open.addEventListener('click', () => {
  const show = form.hidden;
  form.hidden = !show;
  open.setAttribute('aria-expanded', String(show));
  if (show) form.querySelector('#dm-name').focus();
});

let fb;
async function firebase() {
  if (fb) return fb;
  const [{ initializeApp }, { initializeAuth, inMemoryPersistence, signInAnonymously }, { getFirestore, collection, addDoc, serverTimestamp }] =
    await Promise.all([import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js')]);
  const app = initializeApp(CONFIG, 'allgoodos');
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });
  fb = { auth, db: getFirestore(app), signInAnonymously, collection, addDoc, serverTimestamp };
  return fb;
}

function say(text, isErr) {
  status.textContent = text;
  status.classList.toggle('err', !!isErr);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  const message = form.elements.message.value.trim();
  if (form.elements.website.value) return; // honeypot: a bot filled the hidden field
  if (!name) return say('Add your name.', true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return say('Add an email address so William can reply.', true);
  if (!message) return say('Add a short message.', true);

  sendBtn.disabled = true;
  say('Sending…');
  try {
    const { auth, db, signInAnonymously, collection, addDoc, serverTimestamp } = await firebase();
    const user = auth.currentUser || (await signInAnonymously(auth)).user;
    await addDoc(collection(db, 'artifacts', APP_ID, 'messages'), {
      senderUid: user.uid,
      senderName: name.slice(0, 100),
      senderEmail: email.slice(0, 200),
      message: message.slice(0, 4000),
      source: SOURCE,
      page: location.href.slice(0, 500),
      referrer: document.referrer.slice(0, 500) || null,
      timestamp: serverTimestamp(),
      isGuest: true,
    });
    form.innerHTML = '';
    const done = document.createElement('div');
    done.className = 'done';
    done.setAttribute('role', 'status');
    const b = document.createElement('b');
    b.textContent = 'Thanks, ' + name.split(/\s+/)[0] + '. It’s on its way to William.';
    done.append(b, 'He’ll reply to ' + email + '.');
    form.append(done);
  } catch (err) {
    console.warn('[allgoodos] message send failed', err);
    sendBtn.disabled = false;
    say('That didn’t send. Please email learning@allgoodacademy.com instead.', true);
  }
});
