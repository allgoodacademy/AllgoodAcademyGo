// Creating a class: shared by teacher sign-up on /mission-control/ (the first class) and the
// dashboard's "+ New class" (a Pro teacher's later classes, /mission-control/teacher.js).
// Moved unchanged from Mission Control's page script (2026-11-27).
import {
    doc, getDoc, setDoc, serverTimestamp, writeBatch,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// No 0/O/1/I, the commonest misreadings of a code on a board.
export function generateClassroomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

/* Creates a class and makes it the active one.
 *
 * The classroom and (for a teacher who has none yet) the free-class marker go in ONE batch:
 * firestore.rules lets a free teacher create a class only while no marker exists, and only
 * when that same write brings the marker into existence naming this class (getAfter). A Pro
 * teacher's later classes carry no marker. The profile is written after, as before: the
 * rules only let a uid point classroomCode at (or become teacher of) a class that already
 * exists and names them. `track` is the calling page's analytics hook. */
export async function createClass(user, name, { needMarker, track = () => {} }) {
    const { db, appId } = window.AuthCore;
    const meRef = doc(db, 'artifacts', appId, 'users', user.uid);
    const snap = await getDoc(meRef).catch(() => null);
    const teacherName = (snap && snap.exists() && snap.data().displayName) || user.displayName || 'Teacher';
    const code = generateClassroomCode();
    const batch = writeBatch(db);
    batch.set(doc(db, 'artifacts', appId, 'classrooms', code), {
        teacherUid: user.uid, teacherName, name: name || '', createdAt: serverTimestamp(),
    });
    if (needMarker) {
        batch.set(doc(db, 'artifacts', appId, 'teacher_free_class', user.uid), { firstClassCode: code, createdAt: serverTimestamp() });
    }
    await batch.commit();
    await setDoc(meRef, { role: 'teacher', classroomCode: code }, { merge: true });
    track('class_created');
    return code;
}
