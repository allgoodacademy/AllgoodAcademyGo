/* THE HELP CENTER ENGINE (storyboard: claude/help-center-storyboard-v1.0.md).
 *
 * One module, two places:
 *   - /help/            <div id="agh-page"> becomes the whole help center (page mode).
 *   - /dashboard/       a ? button next to Comms opens a panel on the right (panel mode),
 *                       already showing the articles for the view you're on.
 * Content lives in /help/help-data.js. This file only renders it, runs the "Show me" tours,
 * performs the "do it for me" shortcuts and records help telemetry.
 *
 * RULES THIS FILE KEEPS
 *   - A tour never presses anything. It rings the real button and moves on when the person
 *     presses it. Shortcuts only do things that change nothing (copy, show, open).
 *   - Search words are recorded only for a teacher (panel mode, teacher views present),
 *     max 80 characters, with anything like an email or a 5+ digit number removed. For
 *     everyone else: only whether the search found anything, and how many results.
 *   - Telemetry: module 'help', stream 'help' (off the core funnel). Insider's Help page
 *     reads it. "Did it work?": the dashboard announces real successes on window
 *     ('ag:track', detail { name }); a success within 10 minutes of an article or tour
 *     about that job is recorded as help_success.
 */
import { ARTICLES, GROUPS, ON_VIEW, SHORTCUTS, TOURS, SUCCESS } from '/help/help-data.js';

const BY_ID = new Map(ARTICLES.map((a) => [a.id, a]));
const PAGE = document.getElementById('agh-page');
const MODE = PAGE ? 'page' : 'panel';
const RECENT_KEY = 'agh_recent_v1';
const TEN_MIN = 10 * 60 * 1000;

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const isTeacherPage = () => !!document.querySelector('a.tab[data-view="class"]');
const currentView = () => { const v = document.querySelector('section.view:not([hidden])'); return v ? v.dataset.view : (location.hash.slice(1) || 'home'); };
const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
const firstVisible = (sel) => { try { return [...document.querySelectorAll(sel)].find(visible) || null; } catch (e) { return null; } };

/* ================= telemetry ================= */
const TEL = { started: false, ready: false, queue: [] };
function telStart() {
    if (TEL.started) return; TEL.started = true;
    const go = () => {
        try {
            window.Telemetry.init({ module: 'help', gameName: 'Help Center', stream: 'help' });
            if (MODE === 'page' && window.AuthCore && window.AuthCore.anonymousSessionOnly) window.AuthCore.anonymousSessionOnly().catch(() => {});
            TEL.ready = true; const q = TEL.queue; TEL.queue = []; q.forEach(([n, m]) => window.Telemetry.track(n, m));
        } catch (e) { /* telemetry never breaks help */ }
    };
    const wait = (n) => { if (window.Telemetry && window.AuthCore) go(); else if (n < 200) setTimeout(() => wait(n + 1), 50); };
    if (!window.Telemetry) import('/js/telemetry.js').catch(() => {});
    wait(0);
}
function track(name, meta) {
    telStart();
    const m = Object.assign({ mode: MODE, view: MODE === 'panel' ? currentView() : 'help-page', role: MODE === 'panel' ? (isTeacherPage() ? 'teacher' : 'student') : 'unknown' }, meta || {});
    if (TEL.ready) { try { window.Telemetry.track(name, m); } catch (e) {} } else TEL.queue.push([name, m]);
}
function cleanQuery(q) {
    return String(q).slice(0, 80).replace(/\S+@\S+/g, '[email]').replace(/\d{5,}/g, '[number]').trim();
}

/* "Did it work?": remember what help was used for which job; credit it if the job gets done soon. */
function remember(key, article, via) {
    if (!key) return;
    try { const r = JSON.parse(localStorage.getItem(RECENT_KEY) || '{}'); r[key] = { article, via, at: Date.now() }; localStorage.setItem(RECENT_KEY, JSON.stringify(r)); } catch (e) {}
}
window.addEventListener('ag:track', (e) => {
    const key = SUCCESS[e.detail && e.detail.name]; if (!key) return;
    try {
        const r = JSON.parse(localStorage.getItem(RECENT_KEY) || '{}'); const hit = r[key];
        if (hit && Date.now() - hit.at <= TEN_MIN) { track('help_success', { key, article: hit.article, via: hit.via, ms: Date.now() - hit.at }); delete r[key]; localStorage.setItem(RECENT_KEY, JSON.stringify(r)); }
    } catch (err) {}
});

/* ================= search ================= */
const STOP = new Set(['how', 'do', 'i', 'the', 'a', 'an', 'to', 'my', 'can', 'is', 'of', 'in', 'on', 'for', 'and', 'or', 'what', 'where', 'it', 'me', 'with']);
function search(q, who) {
    const toks = q.toLowerCase().replace(/[^a-z0-9ñáéíóú\s-]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));
    if (!toks.length) return [];
    // Students on the dashboard only ever see student answers; teachers (and the public page) see both, tagged.
    const pool = MODE === 'panel' && who === 'student' ? ARTICLES.filter((a) => a.who === 'student') : ARTICLES;
    return pool.map((a) => {
        const title = a.title.toLowerCase(), words = (a.words || '').toLowerCase(), body = a.steps.join(' ').toLowerCase() + ' ' + (a.tip || '').toLowerCase();
        let s = 0;
        toks.forEach((t) => { const stem = t.length > 4 ? t.slice(0, -1) : t; if (title.includes(stem)) s += 3; if (words.includes(stem)) s += 2; if (body.includes(stem)) s += 1; });
        if (s && a.who === who) s += 2;
        return { a, s };
    }).filter((x) => x.s >= 2).sort((x, y) => y.s - x.s).slice(0, 6).map((x) => x.a);
}

/* ================= rendering ================= */
function item(a, showTag) {
    return `<li><a href="${MODE === 'page' ? `#a/${a.id}` : '#'}" data-agh-art="${a.id}"><span>${esc(a.title)}</span>${showTag ? `<span class="agh-tag">${a.who === 'teacher' ? 'Teachers' : 'Students'}</span>` : `<small>${esc(a.read)}</small>`}</a></li>`;
}
function articleHTML(a) {
    const who = a.who;
    const tour = a.tour && TOURS[a.tour];
    const showMe = tour ? (MODE === 'page'
        ? `<a class="agh-btn" href="/dashboard/?help-tour=${a.tour}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polygon points="7 4 20 12 7 20 7 4"/></svg>Show me</a>`
        : `<button class="agh-btn" type="button" data-agh-tour="${a.tour}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polygon points="7 4 20 12 7 20 7 4"/></svg>Show me</button>`) : '';
    const cuts = (a.shortcuts || []).filter((id) => SHORTCUTS[id] && (MODE === 'page' || SHORTCUTS[id].who === 'any' || (SHORTCUTS[id].who === 'teacher') === isTeacherPage())).map((id) => MODE === 'page'
        ? `<a class="agh-btn ghost" href="/dashboard/?help-do=${id}">${esc(SHORTCUTS[id].label)}</a>`
        : `<button class="agh-btn ghost" type="button" data-agh-do="${id}">${esc(SHORTCUTS[id].label)}</button>`).join('');
    const acts = showMe + cuts;
    const stuck = MODE === 'page' ? `<a class="agh-link" href="/dashboard/?help-do=open-comms" data-agh-stuck="${a.id}">Still stuck? Message us</a>` : `<button class="agh-link" type="button" data-agh-stuck="${a.id}">Still stuck? Message us</button>`;
    return `<article class="agh-art" data-agh-current="${a.id}">
        <button class="agh-back" type="button" data-agh-home>← ${MODE === 'page' ? 'All help' : 'Help'}</button>
        <div><h3>${esc(a.title)}</h3><div class="agh-meta">${esc(a.read)} · ${who === 'teacher' ? 'Teachers' : 'Students'}</div></div>
        ${acts ? `<div class="agh-acts">${acts}</div>` : ''}
        <ol class="agh-steps">${a.steps.map((s) => `<li>${md(s)}</li>`).join('')}</ol>
        ${a.tip ? `<div class="agh-tip"><b>Good to know:</b> ${md(a.tip)}</div>` : ''}
        <div class="agh-vote" id="agh-vote"><span>Did this help?</span><button type="button" data-agh-vote="up" aria-label="Yes, this helped">👍</button><button type="button" data-agh-vote="down" aria-label="No, this didn't help">👎</button></div>
        <div>${stuck}</div>
    </article>`;
}
function homeHTML(who, q) {
    const results = q ? search(q, who) : null;
    const searchBox = `<div class="agh-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="agh-q" type="search" autocomplete="off" placeholder="What do you need help with?" aria-label="Search help" value="${esc(q || '')}"></div>`;
    const tabs = (MODE === 'page' || isTeacherPage()) ? `<div class="agh-tabs" role="group" aria-label="Help for"><button type="button" data-agh-who="teacher" aria-pressed="${who === 'teacher'}">For teachers</button><button type="button" data-agh-who="student" aria-pressed="${who === 'student'}">For students</button></div>` : '';
    if (results) {
        const body = results.length
            ? `<p class="agh-k">${results.length} result${results.length === 1 ? '' : 's'}</p><ul class="agh-list">${results.map((a) => item(a, true)).join('')}</ul>`
            : `<div class="agh-empty"><b>No answer for that yet.</b> We've noted it, so we know to write one. Meanwhile, <button class="agh-link" type="button" data-agh-stuck="search">message us</button> and we'll help.</div>`;
        return searchBox + body;
    }
    let onPage = '';
    if (MODE === 'panel') {
        const ids = (ON_VIEW[who] || {})[currentView()] || [];
        if (ids.length) onPage = `<p class="agh-k">On this page</p><ul class="agh-list">${ids.map((id) => BY_ID.get(id)).filter(Boolean).map((a) => item(a)).join('')}</ul>`;
    }
    const groups = GROUPS[who].map((g) => {
        const list = ARTICLES.filter((a) => a.who === who && a.group === g);
        return list.length ? `<div class="agh-grp">${MODE === 'page' ? `<h2>${esc(g)}</h2>` : `<p class="agh-k">${esc(g)}</p>`}<ul class="agh-list">${list.map((a) => item(a)).join('')}</ul></div>` : '';
    }).join('');
    return searchBox + tabs + onPage + (MODE === 'page' ? `<div class="agh-cols">${groups}</div>` : groups);
}

/* ================= state shared by both modes ================= */
const S = { who: 'teacher', q: '', article: null, openedAt: 0, visibleMs: 0, lastVis: 0, maxScroll: 0 };
function scroller() { return MODE === 'page' ? document.scrollingElement : document.querySelector('.agh-pb'); }
function startRead(id) { S.article = id; S.openedAt = Date.now(); S.visibleMs = 0; S.lastVis = document.visibilityState === 'visible' ? Date.now() : 0; S.maxScroll = 0; }
function endRead() {
    if (!S.article) return;
    if (S.lastVis) S.visibleMs += Date.now() - S.lastVis;
    track('help_read', { article: S.article, secs: Math.round(S.visibleMs / 1000), scroll: Math.round(S.maxScroll * 100) });
    S.article = null;
}
document.addEventListener('visibilitychange', () => {
    if (!S.article) return;
    if (document.visibilityState === 'hidden') { if (S.lastVis) S.visibleMs += Date.now() - S.lastVis; S.lastVis = 0; }
    else S.lastVis = Date.now();
});
window.addEventListener('pagehide', endRead);
function onScroll() {
    const el = scroller(); if (!el || !S.article) return;
    const max = el.scrollHeight - el.clientHeight;
    S.maxScroll = Math.max(S.maxScroll, max > 0 ? el.scrollTop / max : 1);
}
let searchTimer = null;
function searched(q) {
    clearTimeout(searchTimer);
    if (!q.trim()) return;
    searchTimer = setTimeout(() => {
        const n = search(q, S.who).length;
        const teacher = MODE === 'panel' && isTeacherPage();
        track('help_search', teacher ? { q: cleanQuery(q), results: n, found: n > 0 } : { results: n, found: n > 0 });
    }, 900);
}
function openArticle(id, source) {
    const a = BY_ID.get(id); if (!a) return;
    endRead();
    S.who = a.who;
    track('help_article', { article: id, source: source || 'browse' });
    remember(a.success, id, 'article');
    startRead(id);
    render(articleHTML(a));
    const sc = scroller(); if (sc) sc.scrollTop = 0;
}
function goHome() { endRead(); render(homeHTML(S.who, S.q)); }
function render(html) {
    const host = MODE === 'page' ? PAGE.querySelector('#agh-body') : document.querySelector('.agh-pb');
    if (!host) return;
    host.innerHTML = html;
    const inp = host.querySelector('#agh-q');
    if (inp) inp.addEventListener('input', () => { S.q = inp.value; const pos = inp.selectionStart; render(homeHTML(S.who, S.q)); const again = host.querySelector('#agh-q'); again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) {} searched(S.q); });
}

/* ================= clicks inside help (both modes) ================= */
document.addEventListener('click', (e) => {
    const inHelp = e.target.closest('.agh-panel, #agh-page');
    if (!inHelp) return;
    const art = e.target.closest('[data-agh-art]');
    if (art) { e.preventDefault(); const src = art.closest('.agh-list') && S.q ? 'search' : (art.closest('.agh-list') && art.closest('.agh-list').previousElementSibling && /On this page/.test(art.closest('.agh-list').previousElementSibling.textContent) ? 'on-this-page' : 'browse'); if (MODE === 'page') history.pushState(null, '', `#a/${art.dataset.aghArt}`); openArticle(art.dataset.aghArt, src); return; }
    if (e.target.closest('[data-agh-home]')) { e.preventDefault(); if (MODE === 'page') history.pushState(null, '', '#'); goHome(); return; }
    const w = e.target.closest('[data-agh-who]');
    if (w) { S.who = w.dataset.aghWho; S.q = ''; goHome(); return; }
    const v = e.target.closest('[data-agh-vote]');
    if (v) { const id = (e.target.closest('[data-agh-current]') || {}).dataset; track('help_vote', { article: id && id.aghCurrent, vote: v.dataset.aghVote }); $vote(v.dataset.aghVote); return; }
    const st = e.target.closest('[data-agh-stuck]');
    if (st) { track('help_stuck', { article: st.dataset.aghStuck }); if (MODE === 'panel') { e.preventDefault(); closePanel(); doShortcut('open-comms'); } return; }
    const t = e.target.closest('[data-agh-tour]');
    if (t) { e.preventDefault(); closePanel(); startTour(t.dataset.aghTour, 'article'); return; }
    const d = e.target.closest('[data-agh-do]');
    if (d) { e.preventDefault(); const cur = e.target.closest('[data-agh-current]'); doShortcut(d.dataset.aghDo, cur && cur.dataset.aghCurrent); return; }
});
function $vote(v) {
    const box = document.getElementById('agh-vote'); if (!box) return;
    box.innerHTML = v === 'up' ? '<span class="agh-toast">Thanks! Glad it helped.</span>' : '<span class="agh-toast">Thanks for telling us. We\'ll make this one clearer.</span>';
}

/* ================= shortcuts: things that change nothing ================= */
function doShortcut(id, fromArticle) {
    const s = SHORTCUTS[id]; if (!s) return;
    track('help_shortcut', { shortcut: id, article: fromArticle || null });
    if (s.call) { if (typeof window[s.call] === 'function') window[s.call](); return; }
    closePanel();
    if (s.view && currentView() !== s.view) { location.hash = s.view; }
    if (s.click) {
        let tries = 0;
        const go = () => { const el = firstVisible(s.click); if (el) el.click(); else if (++tries < 40) setTimeout(go, 150); };
        setTimeout(go, s.view ? 200 : 0);
    }
}

/* ================= the panel (dashboard) ================= */
let panelEl = null, scrimEl = null, opener = null;
function openPanel(articleId) {
    if (panelEl) { if (articleId) openArticle(articleId, 'link'); return; }
    opener = document.activeElement;
    S.who = isTeacherPage() ? 'teacher' : 'student';
    scrimEl = document.createElement('div'); scrimEl.className = 'agh-scrim'; scrimEl.addEventListener('click', closePanel);
    panelEl = document.createElement('aside'); panelEl.className = 'agh-panel'; panelEl.setAttribute('role', 'dialog'); panelEl.setAttribute('aria-modal', 'true'); panelEl.setAttribute('aria-labelledby', 'agh-title');
    panelEl.innerHTML = `<div class="agh-ph"><h2 id="agh-title">Help</h2><button class="agh-x" type="button" aria-label="Close help">×</button></div>
        <div class="agh-pb"></div>
        <div class="agh-pf"><a href="/help/" target="_blank" rel="noopener">Open the Help Center ↗</a><button class="agh-link" type="button" data-agh-stuck="panel">Still stuck? Message us</button></div>`;
    document.body.append(scrimEl, panelEl);
    panelEl.querySelector('.agh-x').addEventListener('click', closePanel);
    panelEl.querySelector('.agh-pb').addEventListener('scroll', onScroll, { passive: true });
    track('help_open', {});
    if (articleId) openArticle(articleId, 'link'); else goHome();
    const f = panelEl.querySelector('#agh-q') || panelEl.querySelector('.agh-x'); if (f) f.focus();
}
function closePanel() {
    if (!panelEl) return;
    endRead();
    panelEl.remove(); scrimEl.remove(); panelEl = scrimEl = null;
    if (opener && document.contains(opener)) opener.focus();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (panelEl) closePanel(); else if (TOUR.active) endTour('exit'); } });

/* ================= tours: a ring on the real button, a card that says what to do ================= */
const TOUR = { active: false, id: null, idx: 0, timer: null, ring: null, card: null, missT: 0, lastStepAt: 0, src: '' };
function startTour(id, src) {
    const t = TOURS[id]; if (!t) return;
    if (TOUR.active) endTour('replaced');
    Object.assign(TOUR, { active: true, id, idx: 0, src: src || 'article', missT: 0, lastStepAt: Date.now() });
    remember((BY_ID.get(t.article) || {}).success, t.article, 'tour');
    TOUR.ring = document.createElement('div'); TOUR.ring.className = 'agh-ring'; TOUR.ring.hidden = true;
    TOUR.card = document.createElement('div'); TOUR.card.className = 'agh-tcard'; TOUR.card.setAttribute('role', 'dialog'); TOUR.card.setAttribute('aria-live', 'polite'); TOUR.card.setAttribute('aria-label', `Tour: ${t.title}`);
    document.body.append(TOUR.ring, TOUR.card);
    TOUR.card.addEventListener('click', onCardClick);
    track('help_tour', { tour: id, event: 'start', step: 1, source: TOUR.src });
    if (t.who === 'student' && t.steps[0].already === 'saved' && !document.querySelector('[data-a="save"]')) { finishTour('already'); return; }
    drawStep();
    TOUR.timer = setInterval(tick, 250);
}
function drawStep(note) {
    const t = TOURS[TOUR.id], st = t.steps[TOUR.idx];
    TOUR.card.innerHTML = `<div class="agh-tk">${esc(t.title)} · Step ${TOUR.idx + 1} of ${t.steps.length}</div>
        <div>${md(st.text)}</div>
        ${note ? `<div class="agh-nq">${esc(note)}</div>` : ''}
        <div class="agh-tr">${TOUR.idx ? '<button class="agh-link" type="button" data-t="back">Back</button>' : ''}<span class="sp"></span>${st.skip ? `<button class="agh-link" type="button" data-t="skip">${esc(st.skip)}</button>` : ''}<button class="agh-btn ghost" type="button" data-t="exit" style="min-height:38px">Exit tour</button></div>`;
    position();
}
function position() {
    const st = TOURS[TOUR.id].steps[TOUR.idx];
    const el = firstVisible(st.target);
    if (!el) { TOUR.ring.hidden = true; return null; }
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) el.scrollIntoView({ block: 'center' });
    const r2 = el.getBoundingClientRect();
    Object.assign(TOUR.ring.style, { left: (r2.left - 6) + 'px', top: (r2.top - 6) + 'px', width: (r2.width + 12) + 'px', height: (r2.height + 12) + 'px' });
    TOUR.ring.hidden = false;
    return el;
}
const DONE = {
    ticked: () => !!document.querySelector('[data-tick]:checked'),
    saveReady: () => !!firstVisible('#btn-save-assign'),
};
function tick() {
    if (!TOUR.active) return;
    const st = TOURS[TOUR.id].steps[TOUR.idx];
    const el = position();
    if (st.done && DONE[st.done] && DONE[st.done]()) { next(); return; }
    if (!el && st.empty && Date.now() - TOUR.lastStepAt > 2500 && currentView() === 'students' && !document.querySelector('[data-tick]')) { finishTour('empty', st.empty); return; }
    if (!el && Date.now() - TOUR.lastStepAt > 4000 && !TOUR.missT) { TOUR.missT = 1; drawStep('Can\'t see it? Close anything that\'s open, and make sure you\'re on your dashboard.'); }
}
function next() {
    const t = TOURS[TOUR.id];
    TOUR.idx += 1; TOUR.missT = 0; TOUR.lastStepAt = Date.now();
    if (TOUR.idx >= t.steps.length) { finishTour('done'); return; }
    track('help_tour', { tour: TOUR.id, event: 'step', step: TOUR.idx + 1 });
    drawStep();
}
function finishTour(how, msg) {
    const t = TOURS[TOUR.id];
    track('help_tour', { tour: TOUR.id, event: how, step: Math.min(TOUR.idx + 1, t.steps.length) });
    clearInterval(TOUR.timer); TOUR.ring.hidden = true;
    const text = how === 'done' ? t.doneText : how === 'already' ? 'You\'re already saved ✓. Your save code is on your **Profile** page.' : msg;
    TOUR.card.innerHTML = `<div class="agh-tk">${esc(t.title)}${how === 'done' ? ' · Done ✓' : ''}</div><div>${md(text || '')}</div><div class="agh-tr"><span class="sp"></span><button class="agh-btn" type="button" data-t="close" style="min-height:38px">Close</button></div>`;
    TOUR.active = false;
}
function endTour(how) {
    if (TOUR.id && TOUR.active) track('help_tour', { tour: TOUR.id, event: how || 'exit', step: TOUR.idx + 1 });
    clearInterval(TOUR.timer);
    if (TOUR.ring) TOUR.ring.remove(); if (TOUR.card) TOUR.card.remove();
    Object.assign(TOUR, { active: false, ring: null, card: null });
}
function onCardClick(e) {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const k = b.dataset.t;
    if (k === 'exit') endTour('exit');
    else if (k === 'close') endTour('closed');
    else if (k === 'back') { TOUR.idx = Math.max(0, TOUR.idx - 1); TOUR.lastStepAt = Date.now(); drawStep(); }
    else if (k === 'skip') { track('help_tour', { tour: TOUR.id, event: 'skip', step: TOUR.idx + 1 }); next(); }
}
// The person does the step: a click on what the step asks for moves the tour on.
document.addEventListener('click', (e) => {
    if (!TOUR.active || e.target.closest('.agh-tcard, .agh-panel')) return;
    const st = TOURS[TOUR.id].steps[TOUR.idx];
    if ((st.click || []).some((sel) => e.target.closest(sel))) { setTimeout(next, 120); return; }
    if (!st.done && firstVisible(st.target)) { TOUR.missT = 2; drawStep('Not quite. Look for the ring.'); }
}, true);
window.addEventListener('resize', () => { if (TOUR.active) position(); });

/* ================= start-up ================= */
if (MODE === 'page') {
    PAGE.innerHTML = `<h1>How can we help?</h1><p class="agh-lede">Short answers for teachers and students. Stuck on something that's not here? Message us and we'll write it.</p><div id="agh-body"></div>`;
    const params = new URLSearchParams(location.search);
    S.who = params.get('for') === 'student' ? 'student' : 'teacher';
    const route = () => { const m = location.hash.match(/^#a\/([a-z0-9-]+)/); if (m && BY_ID.has(m[1])) openArticle(m[1], 'link'); else goHome(); };
    window.addEventListener('popstate', route);
    window.addEventListener('scroll', onScroll, { passive: true });
    route();
    track('help_open', {});
} else {
    // The ? button next to Comms. Teacher or student, every view.
    const comms = document.querySelector('.me .comms');
    if (comms && !document.getElementById('agh-open')) {
        const q = document.createElement('button');
        q.className = 'agh-q'; q.id = 'agh-open'; q.type = 'button'; q.title = 'Help'; q.setAttribute('aria-label', 'Help'); q.textContent = '?';
        q.addEventListener('click', () => openPanel());
        // Stacked with Comms in one column, so the rail doesn't lose width the teacher's name needs.
        const pair = document.createElement('div'); pair.className = 'agh-pair';
        comms.insertAdjacentElement('beforebegin', pair);
        pair.append(q, comms);
    }
    // Links from /help/: ?help-tour=<id> starts a tour, ?help-do=<id> runs a shortcut, ?help=<article> opens one.
    const params = new URLSearchParams(location.search);
    const tourId = params.get('help-tour'), doId = params.get('help-do'), artId = params.get('help');
    if (tourId || doId || artId) {
        const strip = () => { const u = new URL(location.href); ['help-tour', 'help-do', 'help'].forEach((k) => u.searchParams.delete(k)); history.replaceState(null, '', u.pathname + u.search + u.hash); };
        let tries = 0;
        const ready = () => {
            const t = tourId && TOURS[tourId];
            const teacherReady = isTeacherPage();
            const needTeacher = (t && t.who === 'teacher') || (doId && SHORTCUTS[doId] && SHORTCUTS[doId].who === 'teacher');
            const meReady = !!document.querySelector('#me-name') && document.querySelector('#me-name').textContent !== 'Welcome';
            if ((needTeacher ? teacherReady : meReady) || ++tries > 60) {
                strip();
                if (t) { if (t.who === 'teacher' && !teacherReady) { openPanel(t.article); return; } startTour(tourId, 'help-page'); }
                else if (doId) doShortcut(doId, 'help-page');
                else if (artId) openPanel(artId);
                return;
            }
            setTimeout(ready, 250);
        };
        ready();
    }
}
window.AgHelp = { open: openPanel, tour: startTour };
