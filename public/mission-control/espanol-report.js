/* THE ESPAÑOL REPORT (Reports > Español, 2026-11-27). Pure functions over the documents
   Mission Control already holds for each student (their sessions, events and module_progress)
   plus the story's report.json (public/espanol/<story>/report.json: the Puerta prompts,
   options and right answers). No Firestore here, so tests/mission-control.test.mjs covers it.

   FIRST TRY. Every Puerta locks after one answer, so a playthrough's pick IS the first try;
   across replays the report keeps each student's EARLIEST answer per Puerta. Sources, best
   first:
     1. the student's `choice` events (category 'gate'): choiceIndex for a one-pick Puerta,
        `picks` for a Puerta with several blanks;
     2. where events can't be read (or predate `picks`): the session summary's gates (right or
        not) and module_progress's saved picks, which describe the latest playthrough.
   Forks are counted, never scored. Nothing a student typed is read: the stories only ever
   record fixed answer keys. */

const ms = (v) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
};
const evMs = (e) => ms(e && (e.ts || e.clientTs)) || Number(e && e.clientTs) || 0;
const sessMs = (x) => ms(x && (x.startedAt || x.lastSeenAt));

/* Below this many students who answered, show counts only: a percentage of 3 misleads. */
export const MIN_FOR_PERCENT = 5;
export const share = (num, den) => (den ? Math.round(num / den * 100) : 0);
export const optLabel = (o) => (o && (o.short || o.text || o.k)) || '';

function savedState(student, storyId) {
    const p = student && student.raw && student.raw.progress && student.raw.progress[storyId];
    if (!p || typeof p.state !== 'string') return null;
    try { return JSON.parse(p.state); } catch (e) { return null; }
}
// module_progress keeps a Puerta's picks in the story's own shape: one key, a map of blank
// keys, or (El Viaje's Puerta 4) the first turn under '<n>a' and the second under '<n>'.
function savedPicks(state, puerta) {
    const c = state && state.choice ? state.choice[puerta.n] : undefined;
    if (c == null) return null;
    if (c && typeof c === 'object') return c;
    if (puerta.blanks.length === 1) return { [puerta.blanks[0].key]: c };
    const out = {};
    puerta.blanks.forEach((b, i) => { out[b.key] = i === puerta.blanks.length - 1 ? c : state.choice[`${puerta.n}${b.key}`]; });
    return out;
}

/* One student's story: finished or not, last active, their first answer at each Puerta and
   their fork path. */
export function studentStory(story, cfg, student) {
    const raw = (student && student.raw) || {};
    const sessions = (raw.sessions || []).filter((x) => x && x.module === story.id).sort((a, b) => sessMs(a) - sessMs(b));
    const scores = (raw.scores || []).filter((x) => (story.gameNames || []).includes(x.gameName));
    const events = Array.isArray(student && student.events)
        ? student.events.filter((e) => e && e.module === story.id && e.event === 'choice' && e.meta).sort((a, b) => evMs(a) - evMs(b))
        : null;
    const state = savedState(student, story.id);
    const finished = sessions.some((x) => x.completed === true) || scores.some((x) => x.completed === true);
    const opened = sessions.length > 0 || scores.length > 0 || !!state;
    const lastActive = Math.max(0, ...sessions.map((x) => ms(x.lastSeenAt) || ms(x.startedAt)), ...scores.map((x) => ms(x.lastUpdated)));

    const puertas = ((cfg && cfg.puertas) || []).map((p) => {
        const ev = events ? events.find((e) => e.meta.category === 'gate' && Number(e.meta.scenarioIndex) === p.n) : null;
        let right = null;
        let picks = null;
        if (ev) {
            right = Number(ev.meta.score) > 0;
            if (ev.meta.picks && typeof ev.meta.picks === 'object') picks = ev.meta.picks;
            else if (p.blanks.length === 1) {
                const o = p.blanks[0].options[Number(ev.meta.choiceIndex)];
                picks = { [p.blanks[0].key]: o ? o.k : null };
            } else picks = savedPicks(state, p);   // an event from before `picks` existed
        } else {
            const withGate = sessions.find((x) => x.summary && x.summary.gates && x.summary.gates[p.n] != null);
            if (withGate) right = Number(withGate.summary.gates[p.n]) > 0;
            picks = savedPicks(state, p);
            if (right == null && picks && p.blanks.length === 1) right = p.blanks[0].right.includes(picks[p.blanks[0].key]);
            if (right == null && state && state.conf && state.conf[p.n] != null && state.done && state.done[p.n]) right = Number(state.conf[p.n]) > 0;
        }
        return { n: p.n, label: p.label, answered: right != null, right: right === true, picks: picks || {} };
    });

    const forks = ((cfg && cfg.forks) || []).map((f) => {
        const ev = events ? events.find((e) => e.meta.category === 'fork' && e.meta.scenarioIndex === f.key) : null;
        let opt = ev ? f.options[Number(ev.meta.choiceIndex)] : null;
        if (!opt) {
            const withPath = sessions.find((x) => x.summary && x.summary.path && x.summary.path[f.key]);
            const k = withPath ? withPath.summary.path[f.key] : (state && state.path ? state.path[f.key] : null);
            opt = f.options.find((o) => o.k === k) || null;
        }
        return { key: f.key, label: f.label, pick: opt ? opt.k : null, text: opt ? opt.text : null };
    });
    return { uid: student.uid, name: student.name, opened, finished, lastActive, puertas, forks };
}

/* The class's story. `students` is everyone the report covers (the class, or the students a
   story was given to); only those who opened it count as "played". */
export function storyReport(story, cfg, students = []) {
    const rows = students.map((s) => studentStory(story, cfg, s));
    const played = rows.filter((r) => r.opened);
    const finished = rows.filter((r) => r.finished).length;

    const puertas = ((cfg && cfg.puertas) || []).map((p, pi) => {
        const answers = played.map((r) => r.puertas[pi]).filter((a) => a.answered);
        const n = answers.length;
        const right = answers.filter((a) => a.right).length;
        const blanks = p.blanks.map((b) => {
            const picked = answers.map((a) => a.picks[b.key]).filter((k) => k != null);
            const bn = picked.length;
            const options = b.options.map((o) => {
                const count = picked.filter((k) => k === o.k).length;
                return { k: o.k, label: optLabel(o), text: o.text || o.k, count, share: share(count, bn), right: b.right.includes(o.k) };
            });
            const rightCount = options.filter((o) => o.right).reduce((a, o) => a + o.count, 0);
            return { key: b.key, sentence: b.sentence || '', n: bn, options, rightCount, rightShare: share(rightCount, bn) };
        });
        return { n: p.n, label: p.label, prompt: p.prompt, ask: p.ask || '', answered: n, right, rate: share(right, n), showPercent: n >= MIN_FOR_PERCENT, blanks };
    });
    // Lowest first-try rate first; a Puerta nobody has reached yet goes last.
    const ordered = puertas.slice().sort((a, b) => (a.answered ? 0 : 1) - (b.answered ? 0 : 1) || a.rate - b.rate || a.n - b.n);

    const forks = ((cfg && cfg.forks) || []).map((f, fi) => ({
        key: f.key, label: f.label,
        options: f.options.map((o) => ({ text: o.text, count: played.filter((r) => r.forks[fi].pick === o.k).length })),
    }));
    return { kind: 'story', n: rows.length, played: played.length, finished, puertas: ordered, forks, worth: worthFiveStory(ordered) };
}

/* "Worth five minutes tomorrow": the Puerta with the lowest first-try rate, named by its
   grammar point, with the one count that tells the story. Null when there is nothing to say. */
export function worthFiveStory(ordered) {
    const p = (ordered || []).find((x) => x.answered > 0 && x.right < x.answered);
    if (!p) return null;
    // Within the Puerta, the blank the fewest got, and the not-right option most picked there.
    const blank = p.blanks.filter((b) => b.n > 0).sort((a, b) => a.rightShare - b.rightShare)[0];
    const miss = blank ? blank.options.filter((o) => !o.right).sort((a, b) => b.count - a.count)[0] : null;
    if (blank && miss && miss.count > 0) return { n: p.n, label: p.label, text: `${p.label}: ${miss.count} of ${blank.n} picked ${miss.label}.` };
    return { n: p.n, label: p.label, text: `${p.label}: ${p.right} of ${p.answered} got it on the first try.` };
}

/* Which stories does this class have something to show for: assigned ones, and any a
   student has played without it being assigned. */
export function playedStoryIds(stories, students = []) {
    return stories.filter((st) => students.some((s) => {
        const raw = (s && s.raw) || {};
        return (raw.sessions || []).some((x) => x && x.module === st.id)
            || (raw.scores || []).some((x) => (st.gameNames || []).includes(x.gameName))
            || !!(raw.progress && raw.progress[st.id]);
    })).map((st) => st.id);
}

/* EMBARQUE → ADUANA: the class's growth, skill by skill (only where ESPANOL_CHECKS_ON is
   true). Reads each student's own module_progress/{story}.checks: { form, emb: [0|1 x N],
   adu: [0|1 x N], embDone, aduDone }, N being the story's number of slots in checks.json (five
   for El Viaje and El Mundial, three for La selva), slot i being the story's i-th skill whichever
   form the student got. Only students who did BOTH count, so the two columns are the same people.
   A few questions is a practice check, not a test of any one student: this is a class view. */
export function growthReport(checksCfg, storyId, students = []) {
    const slots = (checksCfg && checksCfg.slots) || [];
    const need = slots.length || 5;
    const rows = students.map((s) => {
        const p = s && s.raw && s.raw.progress && s.raw.progress[storyId];
        const c = p && p.checks;
        if (!c || !Array.isArray(c.emb) || !Array.isArray(c.adu)) return { emb: null, adu: null };
        return { emb: c.emb.length >= need ? c.emb : null, adu: c.adu.length >= need && c.aduDone !== false ? c.adu : null };
    });
    const boarded = rows.filter((r) => r.emb).length;
    const both = rows.filter((r) => r.emb && r.adu);
    const n = both.length;
    const out = slots.map((sl, i) => {
        const emb = both.filter((r) => Number(r.emb[i]) > 0).length;
        const adu = both.filter((r) => Number(r.adu[i]) > 0).length;
        return { k: sl.k, skill: sl.skill, puerta: sl.puerta, emb, adu, embPct: share(emb, n), aduPct: share(adu, n) };
    });
    const lowest = n ? out.slice().sort((a, b) => a.adu - b.adu)[0] : null;
    const worth = lowest && lowest.adu < n
        ? `${lowest.skill}: ${lowest.adu} of ${n} got it at the Aduana (${lowest.emb} of ${n} at Embarque).`
        : null;
    return { n, boarded, showPercent: n >= MIN_FOR_PERCENT, slots: out, worth };
}

/* The same view for one presented session: the class's quick votes before and after, as
   words: 'right' (the class picked the right answer), 'other' (it picked another one) or
   'split'. Never a percentage: nobody counted (AA-17). Saved items are { pick, right } with
   `right` true / false / null (split). Sessions saved before 2026-11-27 stored an invented
   share in `right` (90 for the right pick); they read the same way. */
export function presentedCheck(item) {
    if (!item) return null;
    if (item.pick === 'split' || item.right === null) return 'split';
    if (typeof item.right === 'number') return item.right >= 90 ? 'right' : 'other';
    return item.right === true ? 'right' : 'other';
}
export function presentedGrowth(checksCfg, saved) {
    if (!saved || !Array.isArray(saved.emb) || !saved.emb.length) return null;
    const slots = (checksCfg && checksCfg.slots) || [];
    return slots.map((sl, i) => ({
        skill: sl.skill,
        emb: presentedCheck(saved.emb[i]),
        adu: presentedCheck(saved.adu && saved.adu[i]),
    }));
}

/* One saved Presentar vote row, read the same way whichever shape it was saved in.
   Exact: { mode: 'exact', counts, total }. Quick: { mode: 'quick', quick } where `quick` is
   the option the class picked or 'split'; there are no numbers for a quick vote. Rows saved
   before 2026-11-27 have no `quick` and carry invented `shares` (90 / 5 / 5, or equal for a
   split): the label is read back from them and the numbers are dropped. */
export function presentedVote(r) {
    if (!r) return null;
    if (r.mode === 'exact') {
        const counts = {};
        let total = 0;
        for (const [k, c] of Object.entries(r.counts || {})) { counts[k] = Number(c) || 0; total += counts[k]; }
        return { mode: 'exact', counts, total };
    }
    if (typeof r.quick === 'string' && r.quick) return { mode: 'quick', quick: r.quick };
    const vals = Object.entries(r.shares || {}).map(([k, v]) => [k, Number(v) || 0]);
    if (vals.length > 1 && vals.every(([, v]) => v === vals[0][1])) return { mode: 'quick', quick: 'split' };
    if (vals.length) return { mode: 'quick', quick: vals.sort((a, b) => b[1] - a[1])[0][0] };
    return { mode: 'quick', quick: r.pick || 'split' };
}
