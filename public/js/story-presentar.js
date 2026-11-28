// PRESENTAR MODE for the Español stories (2026-11-27, storyboard presentar-v1.0).
//
// Load as a CLASSIC script, AFTER the story's own script:
//   <script src="/js/story-presentar.js"></script>
// It does nothing at all unless the page was opened with ?mode=presentar (the teacher's
// "Presentar en clase" button on the dashboard adds &class=<their class code>) AND the
// signed-in user is a teacher. A student who adds the parameter gets the normal story.
//
// WHAT IT IS. The teacher runs the story on the projector and the class votes at each Puerta
// by show of hands. No student devices, no class code on screen, no names, nothing per
// student. It is the same story page: this file never changes the story's text or logic, it
// DRIVES the page the way a person would:
//   - SLIDES, NOT SCROLL. Each narration card and each section is a step. → / PageDown (a
//     clicker) or Siguiente goes on, ← / PageUp or Atrás goes back. The story's own scroll
//     engine still draws the art, because a step is shown by jumping the page to it.
//   - THE VOTE. At a Puerta the class-vote panel ("¿Juegan en clase? Cuenten las manos") is
//     the main event: quick buttons by default (Casi todos A · Dividido · Casi todos B), or
//     exact hand counts (+ / −, or the A / B / C keys). Revelar stays locked until there is a
//     vote. On reveal: the right answer marked with ✓ and words, the class's pick tagged, bars
//     and numbers ONLY for an exact count (a quick vote shows words, never a percentage), then
//     the story plays the branch for the CLASS'S MAJORITY PICK by pressing the story's own
//     buttons, so a wrong majority plays the wrong branch exactly as it does solo.
//   - Space plays the audio. English stays hidden until the teacher presses E.
//   - THE RECAP. First-vote result per Puerta, the one worth five minutes tomorrow, and
//     Guardar en Mission Control, which writes ONE presented-session document to the
//     teacher's own class (firestore.rules #6d): story, date, per-Puerta votes exactly as
//     entered (the quick label, or the hand counts), and the fork picked. Nothing else.
//
// NO INVENTED NUMBERS (2026-11-27, AA-17). Nobody counts a quick vote, so it never becomes a
// percentage: not on the projector, not in the recap, not in the saved session. Numbers
// appear only when the teacher entered counts, and then they are those counts.
//
// PRIVACY. No name is asked, shown or stored. /js/story-tracking.js skips the teacher's own
// progress and completion records in this mode, so a class session never reads as solo play.
(function () {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    // Asked for: ?mode=presentar, or (La selva, 2026-11-28) a story opened from the /espanol/ hub
    // that makes Presentar its default for teachers. /js/story-tracking.js decides both.
    var ST0 = window.StoryTrack;
    if (!ST0 || !ST0.presentar || !ST0.presentarAsked) return;

    // FROM THE HUB, no ?mode=: students are the usual visitors here, so nothing is covered and
    // nothing is said. A teacher gets Presentar; anyone else just plays the story.
    var FROM_HUB = !!ST0.presentarFromHub;
    if (FROM_HUB) {
        ST0.presentar.then(function (isTeacher) { if (isTeacher) activate(); }).catch(function () { /* plays solo */ });
        return;
    }

    // TEACHERS ONLY. The parameter alone turns nothing on: /js/story-tracking.js decides
    // (StoryTrack.presentar) whether the signed-in user is a teacher. For anyone else the
    // parameter is ignored and the story runs normally, tracked like any solo play. While
    // that is being checked a plain cover hides the page, so a projector never shows the
    // start screen's name box.
    var cover = document.createElement('div');
    cover.className = 'pm-cover';
    cover.setAttribute('role', 'status');
    cover.style.cssText = 'position:fixed;inset:0;z-index:200;background:#141414;color:#EDEDED;display:grid;place-items:center;font-size:18px';
    cover.textContent = 'Abriendo Presentar en clase…';
    document.body.appendChild(cover);
    ST0.presentar.then(function (isTeacher) {
        if (isTeacher) activate();
        else { notTeacher(); return; }
        cover.remove();
    }).catch(function () { cover.remove(); });

  // NOT A TEACHER (2026-11-27, AA-16). The gate above is unchanged: anyone else gets the
  // normal story. This only says so, in the cover's place, instead of silently playing.
  function notTeacher() {
    cover.lang = 'en';
    cover.innerHTML = '<p style="margin:0 16px;max-width:760px;text-align:center;line-height:1.6">Presentar en clase is for signed-in teachers. '
        + '<a href="/mission-control/" style="color:#FFCF6B;font-weight:700">Sign in</a> or '
        + '<button type="button" style="font:inherit;font-weight:700;color:#FFCF6B;background:none;border:0;padding:0 3px;margin-left:2px;text-decoration:underline;cursor:pointer">play as a student</button>.</p>';
    var play = cover.querySelector('button');
    play.addEventListener('click', function () { cover.remove(); });
    play.focus();
  }

  function activate() {
    // The class code rides on the dashboard's link; from the hub it is the teacher's own class.
    var CODE = String(q.get('class') || (ST0.presentarInfo && ST0.presentarInfo.classCode) || '').toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(CODE)) CODE = '';
    var SLUG = location.pathname.split('/').filter(Boolean).pop();
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    document.documentElement.classList.add('presentar');
    document.body.classList.add('presentar');
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/assets/css/story-presentar.css';
    document.head.appendChild(css);

    // The Puerta prompts' right answers and grammar labels: the same file Mission Control's
    // report reads. Without it the vote still works; the right answer just is not marked.
    var REPORT = null;
    fetch('report.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { REPORT = j; paintTeacherLine(); }).catch(function () { /* optional */ });
    var puertaCfg = function (n) { return REPORT && (REPORT.puertas || []).filter(function (p) { return p.n === n; })[0] || null; };

    /* ── slides ─────────────────────────────────────────────────────────────── */
    // A step is an ANCHOR: a narration card, or a part of a section. Tall sections are split
    // (2026-11-27, AA-16) so Siguiente never has to jump back to a section's top:
    //   - a fork: the section (sign and paths), the menu, then the chosen path's scene;
    //   - a Puerta: the section, then each later turn (Puerta 4's Turno 2) once it shows.
    // `curEl` is the anchor on screen. It follows the teacher's own scrolling too (below), so
    // after scrolling down by hand the next Siguiente goes on from there, never back up.
    var cur = 0, curEl = null;
    var laidOut = function (el) { return !!el && el.getClientRects().length > 0; };
    function anchors() {
        var out = [$('#intro')];
        $$('section').forEach(function (sec) {
            if (sec.classList.contains('locked') || sec.id === 'intro') return;
            if (sec.classList.contains('chap')) $$('.step', sec).forEach(function (s) { out.push(s); });
            else if (sec.classList.contains('carta')) {
                out.push($('.gin', sec) || sec);
                var adu = $('.ea-aduana', sec);          // Aduana (espanol-checks.js), when the checks are on
                if (adu) out.push(adu);
            } else if (sec.classList.contains('gate')) {
                out.push(sec);
                $$('.talk', sec).slice(1).forEach(function (t) { out.push(t); });
            } else if (sec.classList.contains('fork')) {
                out.push(sec);
                $$('.menu, [id$="body"]', sec).forEach(function (b) { if (b.children.length) out.push(b); });
            } else if (sec.classList.contains('ea-sec') || sec.classList.contains('pm-step')) out.push(sec);   // pm-step: a plain one-anchor section (La selva)
        });
        return out.filter(laidOut);
    }
    function here(list) {
        var i = curEl ? list.indexOf(curEl) : -1;
        cur = i >= 0 ? i : Math.max(0, Math.min(list.length - 1, cur));
        curEl = list[cur];
        return cur;
    }
    var sectionOf = function (el) { return el && el.closest('section'); };
    var absTop = function (el) { return el.getBoundingClientRect().top + window.scrollY; };
    // Every scroll WE make goes through here, so the scroll listener can tell it from the
    // teacher's own (or the story's) scrolling.
    var autoY = -1;
    function scrollToY(y) {
        autoY = Math.round(Math.max(0, Math.min(y, document.documentElement.scrollHeight - window.innerHeight)));
        window.scrollTo(0, autoY);
        autoY = Math.round(window.scrollY);
    }
    function show(i, back) {
        var list = anchors();
        cur = Math.max(0, Math.min(list.length - 1, i));
        var el = curEl = list[cur];
        var y;
        if (el.classList.contains('step')) {
            // Centre the card; the story's scroll engine then shows this step's art.
            var card = $('.nc', el) || el;
            var r = card.getBoundingClientRect();
            y = r.top + window.scrollY + r.height / 2 - window.innerHeight / 2;
            y = Math.max(y, absTop(el) - window.innerHeight * 0.55);
        } else y = absTop(el) - (el.classList.contains('gin') || el.classList.contains('ea-aduana') ? 80 : el.classList.contains('talk') || el.classList.contains('menu') || /body$/.test(el.id) ? 96 : 0);
        // Going on never pulls the page back up past what is already on screen.
        if (!back && y < window.scrollY) {
            var rr = el.getBoundingClientRect();
            if (rr.bottom > 0 && rr.top < window.innerHeight) y = window.scrollY;
        }
        scrollToY(y);
        window.dispatchEvent(new Event('scroll'));
        clearMsg();
        unwait();
        var sec = sectionOf(el);
        if (sec && sec.classList.contains('gate')) openVote(Number(sec.id.slice(1)));
        paintBar();
    }
    function next() {
        var list = anchors();
        here(list);
        var sec = sectionOf(list[cur]);
        if (cur === 0) {
            var start = $('#start');
            if (start && !started) { started = true; start.click(); }
            setTimeout(function () { show(1); }, 80);
            return;
        }
        // Embarque / Aduana: the class answers every item before the story goes on. A story that
        // draws its own pass (La selva: three picture taps) says what to do in data-pm-msg.
        if (list[cur].dataset && list[cur].dataset.pmWait === '1') {
            block({ msg: list[cur].dataset.pmMsg || 'Primero las cinco preguntas: el voto de la clase.', el: $('.ea-votes, .ea-cta, .ea-pass, .opts', list[cur]) || list[cur] });
            return;
        }
        if (cur < list.length - 1) { show(cur + 1); return; }
        // The last unlocked step: press the story's own "continue" button, if it is offered.
        var btn = sec && $('.next:not([hidden]) [data-unlock]', sec);
        if (btn) {
            btn.click();
            setTimeout(function () { if (anchors().length > list.length) show(cur + 1); else paintBar(); }, 140);
            return;
        }
        if (sec && sec.classList.contains('carta')) { openRecap(); return; }
        block(pending(sec));
    }
    function prev() { var list = anchors(); here(list); if (cur > 0) show(cur - 1, true); }
    var started = false;

    // THE TEACHER SCROLLED BY HAND (or the story scrolled to its own reply). The anchor on
    // screen becomes the last one whose top is above the middle of the screen.
    var syncT = null;
    window.addEventListener('scroll', function () { clearTimeout(syncT); syncT = setTimeout(syncFromScroll, 150); }, { passive: true });
    function syncFromScroll() {
        if (recapOpen || Math.abs(window.scrollY - autoY) < 4) return;
        var list = anchors(), mid = window.innerHeight / 2, best = 0;
        list.forEach(function (el, i) { if (el.getBoundingClientRect().top <= mid) best = i; });
        if (list[best] === curEl) return;
        cur = best; curEl = list[best];
        var sec = sectionOf(curEl);
        if (sec && sec.classList.contains('gate')) openVote(Number(sec.id.slice(1)));
        paintBar();
    }

    /* ── when Siguiente can't go on yet: say why, by state ─────────────────── */
    // Never jumps to the section's top. It brings the UNFINISHED control into view, and only
    // when that control is not already on screen.
    function intoView(el) {
        if (!laidOut(el)) return;
        var r = el.getBoundingClientRect(), barH = bar.offsetHeight || 72, top = 70, room = window.innerHeight - barH - top;
        if (r.top >= top && r.bottom <= window.innerHeight - barH) return;
        scrollToY(absTop(el) - top - Math.max(0, (room - r.height) / 2));
        window.dispatchEvent(new Event('scroll'));
    }
    function block(p) {
        say(p.msg, !!p.wait);
        if (p.el) intoView(p.el);
        if (p.wait) waitFor(p.sec);
    }
    var unanswered = function (root) { return $$('.opts', root).filter(function (o) { return laidOut(o) && !o.closest('.cv') && !$('.opt.sel', o); })[0] || null; };
    function rowName(row) {
        var l = String(row.label || '').trim();
        return /^\d+$/.test(l) ? 'de la frase ' + l : /^turno\b/i.test(l) ? 'del ' + l : l ? 'de ' + l : '';
    }
    // A tap the scene needs before it can go on (La selva: «Miren aquí», the hummingbird feeders,
    // Bajar at the waterfalls). The story marks it with data-pm-tap="what the bar should say".
    var tapNeeded = function (sec) { return $$('[data-pm-tap]', sec).filter(laidOut)[0] || null; };
    function pending(sec) {
        var wait = { msg: 'Un momento…', wait: true, sec: sec };
        if (!sec) return { msg: 'Un momento…' };
        var tap;
        if (sec.classList.contains('gate')) {
            var n = Number(sec.id.slice(1)), v = votes[n];
            if (document.body.classList.contains('pm-manual') && unanswered(sec)) return { msg: 'Elijan la respuesta de la clase en la historia.', el: unanswered(sec) };
            if (!v) return { msg: 'Primero voten y toquen Revelar.', el: $('.cv', sec) };
            if (!v.revealed) {
                if (v.busy) return wait;
                var act = activeRows(v);
                var miss = act.filter(function (ri) { return !voted(v.rows[ri]); })[0];
                if (miss != null) return { msg: act.length > 1 ? 'Falta el voto ' + rowName(v.rows[miss]) + '.' : 'Primero voten y toquen Revelar.', el: rowEl(n, miss) };
                var tie = act.filter(function (ri) { return !playPick(v.rows[ri]); })[0];
                if (tie != null) return { msg: 'No hay mayoría: elijan con cuál jugamos.', el: rowEl(n, tie) };
                return { msg: 'Toquen Revelar.', el: $('#g' + n + ' [data-reveal]') };
            }
            if (v.busy) return wait;
            if ((tap = tapNeeded(sec))) return { msg: tap.dataset.pmTap, el: tap };
            var fix = unanswered(sec);       // a follow-up in the story (Puerta 3's repair)
            if (fix) return { msg: 'Terminen la escena: respondan.', el: fix };
            return wait;
        }
        if (sec.classList.contains('fork')) {
            if (!$('.path.sel, .opt.sel, .mi.sel', sec)) return { msg: 'Primero elijan un camino.', el: $('.paths, .opts, .menu', sec) };
            if ((tap = tapNeeded(sec))) return { msg: tap.dataset.pmTap, el: tap };
            var rack = $('.rack', sec);
            if (rack && laidOut(rack) && !$('.sel', rack)) return { msg: 'Terminen la escena: toquen una prenda.', el: rack };
            var bell = $('.bell', sec);
            if (bell && laidOut(bell) && !$('.opts', bell.parentNode)) return { msg: 'Terminen la escena: toquen la campana.', el: bell };
            var opts = unanswered(sec);
            if (opts) return { msg: 'Terminen la escena: respondan.', el: opts };
            if ($('.mi:not(:disabled)', sec)) {
                var go = $('.go', sec);
                return { msg: 'Terminen la escena: pidan.', el: go || $('.menu', sec) };
            }
            return wait;
        }
        if ((tap = tapNeeded(sec))) return { msg: tap.dataset.pmTap, el: tap };
        return { msg: 'Un momento…' };
    }
    // "Un momento…": the story is still talking, or on a timer. Watch the section (no polling)
    // and go on by itself the moment the story is ready: its continue button un-hides, a
    // new turn appears, or what is left is something the class has to do.
    var waitObs = null;
    function unwait() { if (waitObs) { waitObs.disconnect(); waitObs = null; } }
    function waitFor(sec) {
        unwait();
        if (!sec) return;
        var len = anchors().length, fired = false;
        waitObs = new MutationObserver(function () {
            if (fired) return;
            var ready = $('.next:not([hidden])', sec) || anchors().length > len || !pending(sec).wait;
            if (!ready) return;
            fired = true; unwait();
            setTimeout(function () { clearMsg(); next(); }, 600);
        });
        waitObs.observe(sec, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'disabled'] });
    }

    /* ── the control bar ────────────────────────────────────────────────────── */
    var bar = document.createElement('div');
    bar.className = 'pm-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Presentar en clase');
    bar.innerHTML = '<button class="pm-b" type="button" data-pm="prev">‹ Atrás<kbd>←</kbd></button>'
        + '<span class="pm-pos" id="pm-pos" aria-live="polite"></span>'
        + '<button class="pm-b pri" type="button" data-pm="next">Siguiente ›<kbd>→</kbd></button>'
        + '<span class="pm-msg" id="pm-msg" role="status"></span><span class="sp"></span>'
        + '<button class="pm-b" type="button" data-pm="audio">Audio<kbd>Espacio</kbd></button>'
        + '<button class="pm-b" type="button" data-pm="en" aria-pressed="false">English<kbd>E</kbd></button>'
        + '<button class="pm-b" type="button" data-pm="full" aria-pressed="false">Pantalla completa</button>'
        + (FROM_HUB ? '<a class="pm-b" href="?mode=solo" style="text-decoration:none;display:inline-flex;align-items:center">Jugar solo</a>' : '')
        + '<a class="pm-b" href="/dashboard/#espanol" style="text-decoration:none;display:inline-flex;align-items:center">Salir</a>';
    document.body.appendChild(bar);
    var msgTimer = null;
    // The bar's message. It is cleared on every step shown, so it never outlives its reason;
    // a sticky one ("Un momento…") stays until the story is ready.
    function say(t, sticky) { var m = $('#pm-msg'); m.textContent = t; clearTimeout(msgTimer); if (!sticky) msgTimer = setTimeout(function () { m.textContent = ''; }, 5000); }
    function clearMsg() { clearTimeout(msgTimer); var m = $('#pm-msg'); if (m) m.textContent = ''; }
    function paintBar() {
        var list = anchors();
        here(list);
        $('#pm-pos').textContent = (cur + 1) + ' / ' + list.length + (lockedLeft() ? '+' : '');
        $('[data-pm="prev"]', bar).disabled = cur === 0;
        $('[data-pm="next"]', bar).firstChild.textContent = cur === 0 ? 'Empezar ›' : 'Siguiente ›';
    }
    var lockedLeft = function () { return $$('section.locked').length > 0; };
    function toggleEn() {
        var on = !document.body.classList.contains('pm-en');
        document.body.classList.toggle('pm-en', on);
        $('[data-pm="en"]', bar).setAttribute('aria-pressed', String(on));
    }
    function toggleFull() {
        try {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen();
        } catch (e) { say('La pantalla completa no está disponible aquí.'); }
    }
    document.addEventListener('fullscreenchange', function () { $('[data-pm="full"]', bar).setAttribute('aria-pressed', String(!!document.fullscreenElement)); });
    function playAudio() {
        var list = anchors(), el = list[here(list)];
        var btn = el && ($('.say', el) || null);
        if (btn) { btn.click(); return; }
        // A narration card has no button of its own: read its Spanish with the browser voice.
        var p = el && $('.es', el);
        if (!p || !('speechSynthesis' in window)) return;
        try {
            speechSynthesis.cancel();
            var u = new SpeechSynthesisUtterance(p.textContent);
            var v = speechSynthesis.getVoices().filter(function (x) { return /^es/i.test(x.lang); })[0];
            u.lang = v ? v.lang : 'es-MX'; if (v) u.voice = v; u.rate = 0.92;
            speechSynthesis.speak(u);
        } catch (e) { /* no voice */ }
    }
    bar.addEventListener('click', function (e) {
        var b = e.target.closest('[data-pm]');
        if (!b) return;
        ({ prev: prev, next: next, audio: playAudio, en: toggleEn, full: toggleFull })[b.dataset.pm]();
    });
    document.addEventListener('keydown', function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        var t = e.target;
        var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (typing) return;
        if (recapOpen) return;
        var onControl = t && (t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'SUMMARY');
        if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
        else if (e.key === 'e' || e.key === 'E') { e.preventDefault(); toggleEn(); }
        else if (e.key === ' ' && !onControl) { e.preventDefault(); playAudio(); }
        else if (/^[a-cA-C]$/.test(e.key)) {
            var al = anchors(), sec = sectionOf(al[here(al)]);
            if (sec && sec.classList.contains('gate')) keyCount(Number(sec.id.slice(1)), e.key.toUpperCase().charCodeAt(0) - 65, e.shiftKey ? -1 : 1);
        }
    });

    function paintTeacherLine() {
        var box = $('#intro .in');
        if (!box || $('.pm-teacher', box)) return;
        var n = REPORT && REPORT.puertas ? REPORT.puertas.length : 5;
        var p = document.createElement('p');
        p.className = 'pm-teacher';
        p.lang = 'en';
        p.innerHTML = '<b>Presentar en clase.</b> ' + (REPORT && REPORT.focus ? esc(REPORT.focus) + '. ' : '') + 'About 30 minutes, ' + n + ' Puertas. The class votes by show of hands; you tap in the vote and press Revelar. No names appear and nothing about any student is saved.';
        box.appendChild(p);
    }

    /* ── the class vote ─────────────────────────────────────────────────────── */
    var votes = {};   // Puerta number → { rows, revealed, first, second }
    var SPLIT = 'split';
    function rowsFromStory(n) {
        var cfg = puertaCfg(n);
        return $$('#g' + n + ' .cv .cv-row').map(function (row, ri) {
            var blank = cfg && cfg.blanks[ri];
            var opts = $$('.cv-o', row).map(function (o) {
                var k = o.dataset.o;
                return { k: k, label: ($('.cv-w', o) || o).textContent.trim(), playable: !blank || blank.options.some(function (x) { return x.k === k; }) };
            });
            var label = $('.cv-l', row);
            return {
                key: blank ? blank.key : null, label: label ? label.textContent.trim() : '', opts: opts,
                right: blank ? blank.right : null, sentence: blank && blank.sentence || '',
                mode: 'quick', quick: null, counts: {}, tie: null,
            };
        });
    }
    // A row's heading: its label and its sentence, without saying "Turno 2" twice.
    function rowTitle(r) {
        var l = r.label || '', t = r.sentence || '';
        if (l && t.toLowerCase().indexOf(l.toLowerCase()) === 0) l = '';
        return l || t ? '<span class="pm-rl" lang="es">' + esc(l) + (t ? (l ? ' · ' : '') + esc(t) : '') + '</span>' : '';
    }
    function total(row) { return row.opts.reduce(function (a, o) { return a + (row.counts[o.k] || 0); }, 0); }
    function voted(row) { return row.mode === 'quick' ? !!row.quick : total(row) > 0; }
    // The class's majority for this row, or null when there is none (a split, or a tie).
    function majority(row) {
        var playable = row.opts.filter(function (o) { return o.playable; });
        if (row.mode === 'quick') return row.quick && row.quick !== SPLIT && playable.some(function (o) { return o.k === row.quick; }) ? row.quick : null;
        var top = Math.max.apply(null, playable.map(function (o) { return row.counts[o.k] || 0; }));
        var best = playable.filter(function (o) { return (row.counts[o.k] || 0) === top; });
        return best.length === 1 && top > 0 ? best[0].k : null;
    }
    // Which option the story plays: the majority, or the teacher's pick when there is none.
    function playPick(row) { return majority(row) || row.tie; }
    // Percent of the hands counted for each option. Exact counts only: a quick vote has none.
    function pcts(snap) {
        var t = snap.counts ? snap.opts.reduce(function (a, o) { return a + (snap.counts[o.k] || 0); }, 0) : 0;
        var out = { total: t };
        snap.opts.forEach(function (o) { out[o.k] = t ? Math.round((snap.counts[o.k] || 0) / t * 100) : 0; });
        return out;
    }
    function snapRow(row) {
        var pick = playPick(row);
        return {
            key: row.key, label: row.label, sentence: row.sentence, mode: row.mode,
            quick: row.mode === 'quick' ? row.quick : null,
            counts: row.mode === 'exact' ? row.opts.reduce(function (a, o) { a[o.k] = row.counts[o.k] || 0; return a; }, {}) : null,
            pick: pick, right: row.right ? row.right.indexOf(pick) >= 0 : null,
            opts: row.opts.map(function (o) { return { k: o.k, label: o.label }; }), rightKeys: row.right || [],
        };
    }
    function snapshot(v) { return v.rows.map(snapRow); }
    var firstRows = function (v) { return (v.first || []).filter(Boolean); };

    // ONE TURN AT A TIME (2026-11-27, AA-16). When a Puerta's questions sit in different
    // turns of the scene (El Viaje's Puerta 4: Turno 1 with Valeria, then Turno 2 after
    // "¡Háblame de tú!"), the class votes and reveals Turno 1, the story plays it, and the
    // Turno 2 vote appears in Turno 2's own panel once the story shows it. Questions in one
    // panel (El Mundial's postcard) are still voted together.
    // The rows being voted on right now.
    function activeRows(v) {
        if (!v.staged || v.second) return v.rows.map(function (_, i) { return i; });
        return [v.stage];
    }
    function rowEl(n, ri) {
        var v = votes[n];
        var box = v && v.els[v.staged && !v.second ? ri : v.els.length - 1];
        return box && ($$('.pm-row', box).filter(function (r) { return r.dataset.r === String(ri); })[0] || box);
    }

    function openVote(n) {
        var box = $('#g' + n + ' .cv');
        if (!box) return;
        if (!votes[n]) {
            // Opening the story's own panel is what marks the playthrough as a class session.
            var link = $('.cv-link', box);
            if (link && link.getAttribute('aria-expanded') !== 'true') link.click();
            var rows = rowsFromStory(n), ctrls = controls($('#g' + n));
            var panels = ctrls.map(function (c) { return c.closest('.panel') || c.closest('.talk'); });
            var staged = rows.length > 1 && ctrls.length === rows.length && panels.every(Boolean)
                && panels.some(function (p, i) { return i > 0 && p !== panels[i - 1]; });
            votes[n] = { rows: rows, revealed: false, first: null, second: false, staged: staged, stage: 0, done: [], busy: false, els: [] };
            addBox(n, box);
        } else if (!votes[n].rows.some(function (r) { return r.right; }) && puertaCfg(n)) {
            // report.json arrived after the panel was built: pick up the right answers.
            var fresh = rowsFromStory(n);
            votes[n].rows.forEach(function (r, i) { if (fresh[i]) { r.right = fresh[i].right; r.key = fresh[i].key; r.sentence = fresh[i].sentence; r.opts.forEach(function (o, j) { o.playable = fresh[i].opts[j].playable; }); } });
        }
        paintVote(n);
    }
    function addBox(n, parent, before) {
        var el = document.createElement('div');
        el.className = 'pm-vote'; el.dataset.n = n; el.dataset.box = votes[n].els.length;
        if (before) parent.insertBefore(el, before); else parent.appendChild(el);
        el.addEventListener('click', function (e) { onVoteClick(n, e); });
        votes[n].els.push(el);
        return el;
    }
    function rowHtml(row, ri) {
        var body;
        if (row.mode === 'quick') {
            var btn = function (k, text) { return '<button class="pm-v" type="button" data-q="' + esc(k) + '" data-r="' + ri + '" aria-pressed="' + (row.quick === k) + '">' + text + '</button>'; };
            var o = row.opts;
            var all = o.map(function (x) { return btn(x.k, 'Casi todos: <span lang="es">' + esc(x.label) + '</span>'); });
            // Two options read left to right as A · split · B, as on the storyboard.
            body = '<div class="pm-quick">' + (o.length === 2 ? all[0] + btn(SPLIT, 'Dividido') + all[1] : all.join('') + btn(SPLIT, 'Dividido')) + '</div>';
        } else {
            body = '<div class="pm-exact">' + row.opts.map(function (x, oi) {
                return '<span class="pm-cnt"><b lang="es">' + esc(x.label) + '</b>'
                    + '<button type="button" data-d="-1" data-r="' + ri + '" data-o="' + oi + '" aria-label="Una mano menos: ' + esc(x.label) + '">−</button>'
                    + '<span class="n" aria-live="polite">' + (row.counts[x.k] || 0) + '</span>'
                    + '<button type="button" data-d="1" data-r="' + ri + '" data-o="' + oi + '" aria-label="Una mano más: ' + esc(x.label) + '">+</button></span>';
            }).join('') + '</div>';
        }
        var tie = voted(row) && !majority(row)
            ? '<div class="pm-tie"><span>No hay mayoría. ¿Con cuál jugamos?</span>' + row.opts.filter(function (x) { return x.playable; }).map(function (x) {
                return '<button class="pm-v sm" type="button" data-tie="' + esc(x.k) + '" data-r="' + ri + '" aria-pressed="' + (row.tie === x.k) + '" lang="es">' + esc(x.label) + '</button>';
            }).join('') + '</div>' : '';
        return '<div class="pm-row" data-r="' + ri + '">' + rowTitle(row) + body + tie + '</div>';
    }
    function voteHtml(n, act) {
        var v = votes[n];
        var exact = v.rows[act[0]] && v.rows[act[0]].mode === 'exact';
        var miss = act.filter(function (ri) { return !voted(v.rows[ri]); })[0];
        var tie = act.filter(function (ri) { return voted(v.rows[ri]) && !playPick(v.rows[ri]); })[0];
        var ready = act.length > 0 && miss == null && tie == null;
        var note = ready ? '' : miss != null ? (act.length > 1 && act.some(function (ri) { return voted(v.rows[ri]); }) ? 'Falta el voto ' + rowName(v.rows[miss]) + '.' : 'Primero el voto: manos arriba.') : 'No hay mayoría: elijan con cuál jugamos.';
        // Revelar stays clickable so a tap on it can say what is missing; it LOOKS locked.
        return '<div class="pm-vh"><span>' + (v.second ? 'Segundo voto de la clase' : 'Voto de la clase') + '</span><span class="sp"></span>'
            + '<button class="pm-v sm" type="button" data-mode="' + (exact ? 'quick' : 'exact') + '">' + (exact ? 'Voto rápido' : 'Contar manos (exacto)') + '</button></div>'
            + act.map(function (ri) { return rowHtml(v.rows[ri], ri); }).join('')
            + '<div class="pm-go"><button class="pm-reveal" type="button" data-reveal aria-disabled="' + !ready + '">Revelar</button>'
            + '<span class="pm-note" role="status">' + note + '</span></div>';
    }
    function paintVote(n) {
        var v = votes[n];
        if (!v || !v.els.length) return;
        var last = v.els.length - 1;
        v.els.forEach(function (el, b) {
            if (!v.staged || v.second) {
                // Earlier boxes of a staged Puerta keep their first-vote bars during a second vote.
                if (b < last) { el.innerHTML = resultsHtml(n, [v.first[b]].filter(Boolean), false); return; }
                el.innerHTML = v.revealed ? resultsHtml(n, v.second ? snapshot(v) : firstRows(v), true) : voteHtml(n, activeRows(v));
                return;
            }
            el.innerHTML = v.done[b] ? resultsHtml(n, [v.first[b]], v.revealed && b === last) : voteHtml(n, [b]);
        });
    }
    function refocus(n, sel) { var b = $$('#g' + n + ' .pm-vote ' + sel).pop(); if (b) b.focus({ preventScroll: true }); }
    function onVoteClick(n, e) {
        var v = votes[n];
        var t = e.target.closest('button');
        if (!t) return;
        if (t.dataset.revote != null) { v.revealed = false; v.second = true; v.rows.forEach(function (r) { r.quick = null; r.counts = {}; r.tie = null; }); paintVote(n); refocus(n, '.pm-v'); return; }
        if (v.revealed || v.busy) return;
        var row = t.dataset.r != null ? v.rows[Number(t.dataset.r)] : null;
        if (t.dataset.mode) { activeRows(v).forEach(function (ri) { var r = v.rows[ri]; r.mode = t.dataset.mode; r.quick = null; r.counts = {}; r.tie = null; }); paintVote(n); refocus(n, '[data-mode]'); return; }
        if (t.dataset.q && row) { row.quick = t.dataset.q; row.tie = null; paintVote(n); refocus(n, '[data-q="' + t.dataset.q + '"][data-r="' + t.dataset.r + '"]'); return; }
        if (t.dataset.d && row) {
            var o = row.opts[Number(t.dataset.o)];
            row.counts[o.k] = Math.max(0, (row.counts[o.k] || 0) + Number(t.dataset.d));
            paintVote(n); refocus(n, '[data-d="' + t.dataset.d + '"][data-r="' + t.dataset.r + '"][data-o="' + t.dataset.o + '"]'); return;
        }
        if (t.dataset.tie && row) { row.tie = t.dataset.tie; paintVote(n); refocus(n, '[data-reveal]'); return; }
        if (t.dataset.reveal != null) reveal(n);
    }
    // A / B / C on the keyboard: one more hand for that option (Shift takes one away). Only
    // while a single question is being voted on, where the letters are unambiguous.
    function keyCount(n, oi, d) {
        var v = votes[n];
        if (!v || v.revealed || v.busy) return;
        var act = activeRows(v);
        if (act.length !== 1 || !v.rows[act[0]].opts[oi]) return;
        var row = v.rows[act[0]];
        if (row.mode !== 'exact') { row.mode = 'exact'; row.quick = null; row.counts = {}; row.tie = null; }
        var k = row.opts[oi].k;
        row.counts[k] = Math.max(0, (row.counts[k] || 0) + d);
        paintVote(n);
    }

    function tags(snapRow, o, classPick) {
        return (snapRow.rightKeys.indexOf(o.k) >= 0 ? '<span class="pm-ok" lang="es">✓ Respuesta correcta</span>' : '')
            + (classPick === o.k ? '<span class="pm-pick" lang="es">Voto de la clase</span>' : '');
    }
    // A vote's result. Exact counts: bars and the real numbers ("18 de 24 · 75%"). A quick
    // vote: words only, the class's pick and the right answer, with no bar and no number.
    function barsHtml(snapRow) {
        if (snapRow.mode === 'quick') {
            var split = snapRow.quick === SPLIT;
            var classPick = split ? null : snapRow.quick;
            var shown = snapRow.opts.filter(function (o) { return o.k === classPick || snapRow.rightKeys.indexOf(o.k) >= 0; });
            return '<div class="pm-qres"><p class="pm-ql" lang="es">' + (split ? 'Dividido · La clase estaba dividida.' : 'Casi todos') + '</p>'
                + shown.map(function (o) { return '<p class="w" lang="es">' + esc(o.label) + tags(snapRow, o, classPick) + '</p>'; }).join('') + '</div>';
        }
        var p = pcts(snapRow);
        return '<div class="pm-bars">' + snapRow.opts.map(function (o) {
            var ok = snapRow.rightKeys.indexOf(o.k) >= 0;
            return '<span class="w" lang="es">' + esc(o.label) + tags(snapRow, o, snapRow.pick) + '</span>'
                + '<span class="tr' + (ok ? ' ok' : '') + '" aria-hidden="true"><i style="width:' + p[o.k] + '%"></i></span>'
                + '<span class="val">' + (snapRow.counts[o.k] || 0) + ' de ' + p.total + ' · ' + p[o.k] + '%</span>';
        }).join('') + '</div>';
    }
    // The bars for `snap`. `final`: the last box of the Puerta, which offers Volver a votar.
    function resultsHtml(n, snap, final) {
        var v = votes[n];
        var second = v.second && final;
        return '<div class="pm-res"><h4>' + (second ? 'Segundo voto · así votó la clase' : 'Así votó la clase') + '</h4>'
            + snap.map(function (r) { return rowTitle(r) + barsHtml(r); }).join('')
            + (final ? '<div class="pm-go"><button class="pm-v sm" type="button" data-revote>Volver a votar</button>'
                + '<span class="pm-note">' + (second ? 'El primer voto es el que se guarda.' : 'Ahora miren qué pasa en la historia con la respuesta de la clase.') + '</span></div>'
                : '<div class="pm-go"><span class="pm-note">Miren qué pasa en la historia.</span></div>')
            + '</div>';
    }

    // The story's own controls for a Puerta, in the order of the vote rows: a group of
    // options, a verb chip or a typed blank.
    function controls(sec) {
        return $$('.opts, .chip, input', sec).filter(function (el) {
            if (el.closest('.cv') || el.closest('.pm-vote') || el.closest('[id$="fix"]')) return false;
            if (el.tagName === 'INPUT' && el.type !== 'text') return false;
            return true;
        });
    }
    // Resolves once `el` is on the page (not hidden). A MutationObserver, not a poll; `ms` caps
    // the wait when given.
    function whenShown(el, ms) {
        return new Promise(function (resolve) {
            if (laidOut(el)) { resolve(); return; }
            var t = ms ? setTimeout(done, ms) : null;
            var mo = new MutationObserver(function () { if (laidOut(el)) done(); });
            function done() { mo.disconnect(); clearTimeout(t); resolve(); }
            mo.observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ['hidden', 'class', 'style'] });
        });
    }
    async function reveal(n) {
        var v = votes[n];
        if (v.busy || v.revealed) return;
        var act = activeRows(v);
        if (!act.every(function (ri) { return voted(v.rows[ri]) && playPick(v.rows[ri]); })) { block(pending($('#g' + n))); return; }
        clearMsg();
        if (v.second) { v.revealed = true; paintVote(n); refocus(n, '[data-revote]'); return; }   // the story has already played
        if (!v.first) v.first = [];
        act.forEach(function (ri) { v.first[ri] = snapRow(v.rows[ri]); v.done[ri] = true; });
        v.revealed = v.rows.every(function (_, i) { return v.done[i]; });
        v.busy = true;
        paintVote(n);
        if (v.revealed) refocus(n, '[data-revote]');
        var sec = $('#g' + n), ctrls = controls(sec);
        if (ctrls.length !== v.rows.length) { v.busy = false; say('Elijan la respuesta de la clase en la historia.'); document.body.classList.add('pm-manual'); return; }
        for (var j = 0; j < act.length; j++) {
            var i = act[j], el = ctrls[i], k = playPick(v.rows[i]);
            await whenShown(el, 8000);
            if (el.classList.contains('opts')) {
                var o = $$('.opt', el).filter(function (x) { return x.dataset.k === k; })[0];
                if (o && !o.disabled) o.click();
            } else if (el.tagName === 'INPUT') el.value = k;
            else el.textContent = k;
            await sleep(120);
        }
        if (!v.revealed) {
            // The next turn's vote opens in that turn's own panel, once the story shows it.
            var nx = act[act.length - 1] + 1, ctl = ctrls[nx];
            await whenShown(ctl);
            v.stage = nx;
            if (!v.els[nx]) addBox(n, ctl.parentNode, ctl);
            v.busy = false;
            paintVote(n);
            return;
        }
        var go = $('#g' + n + 'go');
        if (go) { go.disabled = false; go.click(); }
        v.busy = false;
    }

    /* ── forks: read what the teacher tapped, never counted ─────────────────── */
    function forkPicks() {
        var out = {};
        $$('section.fork').forEach(function (sec) {
            var sel = $('.path.sel, .opts .opt.sel', sec);
            if (sel && sel.dataset.k) out[sec.id] = sel.dataset.k;
        });
        return out;
    }

    /* ── recap + save ───────────────────────────────────────────────────────── */
    var recapOpen = false;
    // The row most worth revisiting. Order only, never shown: a quick vote for another answer
    // first, then exact counts by how few had it right, then a split class.
    function worthLine() {
        var worst = null;
        Object.keys(votes).forEach(function (n) {
            firstRows(votes[n]).forEach(function (r) {
                if (!r.rightKeys.length) return;
                var rank;
                if (r.mode === 'quick') rank = r.quick === SPLIT ? 101 : r.rightKeys.indexOf(r.quick) >= 0 ? null : -1;
                else { var p = pcts(r); rank = p.total ? r.rightKeys.reduce(function (a, k) { return a + p[k]; }, 0) : null; if (rank === 100) rank = null; }
                if (rank != null && (!worst || rank < worst.rank)) worst = { n: Number(n), rank: rank, row: r };
            });
        });
        if (!worst) return '';
        var cfg = puertaCfg(worst.n), r = worst.row;
        var head = 'Puerta ' + worst.n + (cfg ? ' · ' + esc(cfg.label) : '');
        if (r.mode === 'quick') {
            if (r.quick === SPLIT) return head + ': the class was split.';
            var picked = r.opts.filter(function (o) { return o.k === r.quick; })[0];
            return head + ': the class picked <span lang="es">' + esc(picked ? picked.label : r.quick) + '</span>.';
        }
        var p = pcts(r);
        var miss = r.opts.filter(function (o) { return r.rightKeys.indexOf(o.k) < 0; }).sort(function (a, b) { return (r.counts[b.k] || 0) - (r.counts[a.k] || 0); })[0];
        return head + (miss ? ': ' + (r.counts[miss.k] || 0) + ' of ' + p.total + ' picked <span lang="es">' + esc(miss.label) + '</span> (' + p[miss.k] + '%).' : '.');
    }
    function sessionDoc(uid) {
        var puertas = {};
        Object.keys(votes).forEach(function (n) {
            if (!firstRows(votes[n]).length) return;
            puertas[n] = { rows: firstRows(votes[n]).map(function (r) { var out = { key: r.key == null ? null : String(r.key), mode: r.mode, pick: r.pick, right: r.right };
                if (r.mode === 'quick') out.quick = r.quick; else out.counts = r.counts;
                return out; }) };
        });
        var checks = window.StoryChecks && window.StoryChecks.presentedResults ? window.StoryChecks.presentedResults() : null;
        return { v: 1, story: SLUG, classroomCode: CODE, teacherUid: uid, puertas: puertas, forks: forkPicks(), checks: checks || null };
    }
    function teacher() {
        var ST = window.StoryTrack;
        if (!ST || !ST.ready) return Promise.resolve(null);
        return ST.ready.then(function (core) {
            var u = core && core.auth && core.auth.currentUser;
            return u && !u.isAnonymous && CODE ? { core: core, user: u } : null;
        }).catch(function () { return null; });
    }
    function openRecap() {
        if (recapOpen) return;
        recapOpen = true;
        var el = document.createElement('div');
        el.className = 'pm-recap'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'pm-recap-h');
        var worth = worthLine();
        var cards = Object.keys(votes).filter(function (n) { return firstRows(votes[n]).length; }).map(function (n) {
            var cfg = puertaCfg(Number(n));
            return '<div class="card"><h3>Puerta ' + n + (cfg ? ' · <span lang="en">' + esc(cfg.label) + '</span>' : '') + '</h3>'
                + firstRows(votes[n]).map(function (r) { return rowTitle(r) + barsHtml(r); }).join('') + '</div>';
        }).join('');
        el.innerHTML = '<h2 id="pm-recap-h" tabindex="-1">Resumen de la clase</h2>'
            + '<p lang="en">The class\'s first vote at each Puerta. No names, nothing about any student.</p>'
            + (worth ? '<div class="worth" lang="en"><b>Worth five minutes tomorrow:</b> ' + worth + '</div>' : '')
            + (cards || '<p>No hubo votos en esta sesión.</p>')
            + '<div class="acts"><button class="pm-b pri" type="button" id="pm-save">Guardar en Mission Control</button>'
            + '<a class="pm-b" id="pm-quit" href="/dashboard/#espanol">Terminar sin guardar</a>'
            + '<button class="pm-b" type="button" id="pm-back">‹ Volver a la historia</button>'
            + '<span id="pm-save-msg" role="status"></span></div>';
        document.body.appendChild(el);
        $('#pm-recap-h').focus();
        $('#pm-back').addEventListener('click', function () { el.remove(); recapOpen = false; $('[data-pm="next"]', bar).focus({ preventScroll: true }); });
        el.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('#pm-back').click(); });
        var save = $('#pm-save'), msg = $('#pm-save-msg');
        teacher().then(function (t) {
            if (t) return;
            save.disabled = true;
            msg.lang = 'en';
            msg.textContent = 'To save, open this story from Presentar en clase on your dashboard while signed in as a teacher.';
        });
        save.addEventListener('click', function () {
            save.disabled = true; msg.textContent = 'Guardando…';
            teacher().then(function (t) {
                if (!t) throw new Error('not-a-teacher');
                return import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js').then(function (fs) {
                    var d = sessionDoc(t.user.uid);
                    d.createdAt = fs.serverTimestamp();
                    return fs.addDoc(fs.collection(t.core.db, 'artifacts', t.core.appId, 'classrooms', CODE, 'presented_sessions'), d);
                });
            }).then(function () {
                msg.textContent = 'Guardado ✓';
                save.textContent = 'Guardado ✓';
                var quit = $('#pm-quit'); quit.textContent = 'Ver en Mission Control'; quit.href = '/dashboard/#reports'; quit.focus();
            }).catch(function (e) {
                try { console.warn('[Presentar] save failed', e); } catch (_) { /* ignore */ }
                save.disabled = false; msg.lang = 'en';
                msg.textContent = 'That did not save. Check your connection and try again.';
            });
        });
    }

    window.StoryPresentar = { active: true, classCode: CODE, goTo: show, refresh: paintBar, votes: votes };
    // Start on the title; the story's own start button runs when the teacher presses Empezar.
    setTimeout(function () { scrollToY(0); paintBar(); paintTeacherLine(); $('[data-pm="next"]', bar).focus({ preventScroll: true }); }, 0);
  }
})();
