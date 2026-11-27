// Shared "join a Task Force by its code" logic, and the list of what that Task Force has
// assigned. One copy, used by:
//   - /join/ (public/join/index.html) — the permanent join page printed on classroom walls
//     and in the TPT facilitation guide.
//   - /dashboard/ — the "Assigned to me" list.
//
// Before this file existed the only join logic was window.joinClassroom inline in the
// dashboard, five clicks deep, and the wall poster told students a lesson would ask for the
// code — none did (UAT 2026-09-27, §4). Moving it here is what lets /join/ exist without a
// second copy of the membership rules drifting away from the first.
//
// Requires /js/auth-core.js to have loaded first (window.AuthCore), same as every page.
// Joining is a class code plus a nickname — the only thing a student is ever asked.
//
// Data model — unchanged by this file, see firestore.rules #5, #6b, #6c:
//   classrooms/{code}                  get: any signed-in user (so a code can be checked)
//   classroom_members/{code}_{uid}     the membership; deterministic id, so joining twice is
//                                      the same document, never a second roster row
//   users/{uid}.classroomCode          legacy single-class mirror, students only
//   classroom_assignments/{code}_{uid} per-student extras on top of the class-wide set

import {
    doc, getDoc, getDocs, setDoc, collection, query, where, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { loadRegistry } from '/js/skill-routing.js';
import { effectiveAssignment, extrasFromDoc, GAME_MINUTES, SIM_MINUTES } from '/mission-control/derive.js';

const { db, appId, auth } = window.AuthCore;

// Codes come off a whiteboard, a projector or a phone keyboard that capitalises the first
// letter and inserts spaces. Case, spaces and dashes never matter.
export function normalizeClassCode(raw) {
    return String(raw || '').toUpperCase().replace(/[\s\-_.]/g, '');
}

// The same shape firestore.rules #6b accepts for a membership's classroomCode. Anything
// else can never be a real code, so it is answered without a network round trip.
const CODE_SHAPE = /^[A-Z0-9]{1,64}$/;

// The name a student is shown for a class. Mirrors how Mission Control titles the class
// for its teacher (and on the printed poster), so both sides of the room read the same
// words. `name` is honoured first for when classes can be named; nothing sets it yet.
export function classroomDisplayName(data) {
    if (!data) return 'Task Force';
    if (data.name) return String(data.name);
    return data.teacherName ? `${data.teacherName} — Task Force` : 'Task Force';
}

// Friendly, plain-language errors — a student reads these, not an engineer. Generated
// codes never contain O, 0, I or 1 (see generateClassroomCode on the dashboard), which is
// the commonest misreading of a code on a board, so say so when it would help.
function notFoundMessage(code) {
    const ambiguous = /[O0I1]/.test(code);
    return ambiguous
        ? `We couldn't find a class with the code ${code}. Class codes never use the letters O or I, or the numbers 0 or 1 — check the board and try again.`
        : `We couldn't find a class with the code ${code}. Check the board and try again, or ask your teacher.`;
}

// What a student calls themselves in a class. Shown to their teacher in Mission Control
// and nowhere else. 1-24 characters; the hint on /join/ asks for a nickname or first name
// and no last names.
export const NICKNAME_MAX = 24;
export function normalizeNickname(raw) {
    return String(raw || '').replace(/\s+/g, ' ').trim();
}

// Every Task Force code this uid belongs to. A list query on uid == me is what rule #6b
// grants; a direct get of a membership that does not exist would be denied instead.
export async function myMemberships(uid) {
    const snap = await getDocs(query(
        collection(db, 'artifacts', appId, 'classroom_members'),
        where('uid', '==', uid),
    ));
    return snap.docs.map((d) => d.data().classroomCode).filter(Boolean);
}

/**
 * Joins the Task Force with this code, under this nickname. The student's anonymous
 * session (and everything they have already done in it) is what joins — nothing else is
 * asked and no account is made.
 *
 * Returns { ok: true, code, classroom, name, alreadyMember, user }
 *      or { ok: false, reason: 'empty' | 'format' | 'nickname' | 'not_found' | 'error', message }.
 */
export async function joinClassroom(rawCode, { nickname } = {}) {
    const code = normalizeClassCode(rawCode);
    if (!code) return { ok: false, reason: 'empty', message: 'Type the class code from the board first.' };
    if (!CODE_SHAPE.test(code)) {
        return { ok: false, reason: 'format', message: 'Class codes are just letters and numbers — check the board and try again.' };
    }
    const name = normalizeNickname(nickname);
    if (!name || name.length > NICKNAME_MAX) {
        return { ok: false, reason: 'nickname', message: `Type a nickname or first name (up to ${NICKNAME_MAX} letters).` };
    }

    try {
        const user = await window.AuthCore.startSession();
        if (!user) throw new Error('no session');

        const classroomSnap = await getDoc(doc(db, 'artifacts', appId, 'classrooms', code));
        if (!classroomSnap.exists()) return { ok: false, reason: 'not_found', message: notFoundMessage(code) };
        const classroom = classroomSnap.data();

        let alreadyMember = false;
        try { alreadyMember = (await myMemberships(user.uid)).includes(code); } catch (e) { /* treat as new */ }

        // Deterministic id: re-joining is the same document, so it can never add a second
        // roster row. Skipped when it already exists only to keep the original joinedAt.
        if (!alreadyMember) {
            await setDoc(doc(db, 'artifacts', appId, 'classroom_members', `${code}_${user.uid}`), {
                classroomCode: code,
                uid: user.uid,
                joinedAt: serverTimestamp(),
            }, { merge: true });
        }

        // The profile carries the nickname the teacher sees, and the legacy single-class
        // classroomCode mirror that drives "Assigned to me". A teacher's own classroomCode
        // means "the class I teach", so a teacher joining someone else's class keeps theirs.
        const meSnap = await getDoc(doc(db, 'artifacts', appId, 'users', user.uid));
        const isTeacher = meSnap.exists() && meSnap.data().role === 'teacher';
        if (!isTeacher) await window.AuthCore.writeStudentProfile(user, { displayName: name, classroomCode: code });

        return { ok: true, code, classroom, name: classroomDisplayName(classroom), alreadyMember, user };
    } catch (e) {
        console.error('[ClassroomJoin] join failed', e);
        return { ok: false, reason: 'error', message: "Something went wrong joining the class. Check your internet connection and try again." };
    }
}

// Lesson order a student should meet them in: a game first (it's the diagnostic, and it
// routes into the lesson that teaches what it found), then the lessons, then the Challenge
// that tests the whole pack. The assignment arrays themselves carry no cross-type order.
// A simulation (2026-11-25) comes last: it is its own activity, not part of a pack's sequence.
// 'story' (2026-11-27): an Español story. Assigned in assignedSims, beside the simulations.
const TYPE_ORDER = { game: 0, lab: 1, challenge: 2, sim: 3, story: 4 };
const TYPE_LABEL = { game: 'Game', lab: 'Lesson', challenge: 'Challenge', sim: 'Simulation', story: 'Español story' };

/**
 * Everything assigned to this student in this Task Force: the class-wide modules, games AND
 * simulations, plus any per-student extras. Games live in classrooms.assignedGames and
 * simulations in classrooms.assignedSims, separate arrays from assignedModules (see
 * saveAssignments in Mission Control) — reading only assignedModules is what made the
 * dashboard drop every assigned game, and would drop every assigned simulation.
 *
 * Returns { code, classroom, name, items: [{ id, name, type, typeLabel, url, minutes, extra }] }
 * or null when the class does not exist. An id the registry no longer lists, or one with
 * no live page, is left out rather than rendered as a link to nowhere.
 */
export async function loadAssignedItems(rawCode, uid) {
    const code = normalizeClassCode(rawCode);
    if (!code) return null;
    const classroomSnap = await getDoc(doc(db, 'artifacts', appId, 'classrooms', code));
    if (!classroomSnap.exists()) return null;
    const classroom = classroomSnap.data();

    let extras = null;
    if (uid) {
        try {
            // A query, not a get: rule #6c is written against resource.data, and a get of a
            // student's extras document that doesn't exist would be denied, not empty.
            const snap = await getDocs(query(
                collection(db, 'artifacts', appId, 'classroom_assignments'),
                where('uid', '==', uid),
                where('classroomCode', '==', code),
            ));
            if (!snap.empty) extras = extrasFromDoc(snap.docs[0].data());
        } catch (e) {
            console.warn('[ClassroomJoin] per-student extras unavailable — showing the class set', e);
        }
    }

    const classModules = Array.isArray(classroom.assignedModules) ? classroom.assignedModules : [];
    const classGames = Array.isArray(classroom.assignedGames) ? classroom.assignedGames : [];
    const classSims = Array.isArray(classroom.assignedSims) ? classroom.assignedSims : [];
    const merged = effectiveAssignment({ classModules, classGames, classSims, extras });
    const extraIds = new Set([...merged.extraModules, ...merged.extraGames, ...merged.extraSims]);

    const registry = await loadRegistry();
    const byId = new Map(registry.map((m) => [m.id, m]));
    const items = [...merged.games, ...merged.modules, ...merged.sims]
        .map((id) => byId.get(id))
        .filter((m) => m && m.url && !m.retired)
        .map((m) => ({
            id: m.id,
            name: m.name,
            type: m.type,
            typeLabel: TYPE_LABEL[m.type] || 'Activity',
            url: m.url,
            minutes: m.type === 'game' ? GAME_MINUTES
                : (Number(m.durationMinutes) > 0 ? Number(m.durationMinutes) : (m.type === 'sim' ? SIM_MINUTES : null)),
            extra: extraIds.has(m.id),
        }))
        .sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9));

    return { code, classroom, name: classroomDisplayName(classroom), items };
}

window.ClassroomJoin = {
    normalizeClassCode, normalizeNickname, NICKNAME_MAX, classroomDisplayName, joinClassroom, loadAssignedItems, myMemberships,
};
