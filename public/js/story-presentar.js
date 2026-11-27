// PRESENTAR MODE for the Español stories (2026-11-27, storyboard presentar-v1.0).
//
// Load as a CLASSIC script, AFTER the story's own script:
//   <script src="/js/story-presentar.js"></script>
// It does nothing at all unless the page was opened with ?mode=presentar (the teacher's
// "Presentar en clase" button on the dashboard adds &class=<their class code>).
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
//     vote. On reveal: bars with numbers, the right answer marked with ✓ and words, and then
//     the story plays the branch for the CLASS'S MAJORITY PICK by pressing the story's own
//     buttons, so a wrong majority plays the wrong branch exactly as it does solo.
//   - Space plays the audio. English stays hidden until the teacher presses E.
//   - THE RECAP. First-vote result per Puerta, the one worth five minutes tomorrow, and
//     Guardar en Mission Control, which writes ONE presented-session document to the
//     teacher's own class (firestore.rules #6d): story, date, per-Puerta counts and whether
//     they were quick (approximate) or exact, and the fork picked. Nothing else.
//
// PRIVACY. No name is asked, shown or stored. Quick votes are saved as approximate shares
// and labelled that way in Mission Control. /js/story-tracking.js skips the teacher's own
// progress and completion records in this mode, so a class session never reads as solo play.
(function () {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return; }
    if (q.get('mode') !== 'presentar') return;

    var CODE = String(q.get('class') || '').toUpperCase();
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
    var cur = 0;
    function anchors() {
        var out = [$('#intro')];
        $$('section').forEach(function (sec) {
            if (sec.classList.contains('locked') || sec.id === 'intro') return;
            if (sec.classList.contains('chap')) $$('.step', sec).forEach(function (s) { out.push(s); });
            else if (sec.classList.contains('carta')) {
                out.push($('.gin', sec) || sec);
                var adu = $('.ea-aduana', sec);          // Aduana (espanol-checks.js), when the checks are on
                if (adu) out.push(adu);
            } else if (sec.classList.contains('gate') || sec.classList.contains('fork') || sec.classList.contains('ea-sec')) out.push(sec);
        });
        return out.filter(Boolean);
    }
    var sectionOf = function (el) { return el && el.closest('section'); };
    var absTop = function (el) { return el.getBoundingClientRect().top + window.scrollY; };
    function show(i) {
        var list = anchors();
        cur = Math.max(0, Math.min(list.length - 1, i));
        var el = list[cur];
        var y;
        if (el.classList.contains('step')) {
            // Centre the card; the story's scroll engine then shows this step's art.
            var card = $('.nc', el) || el;
            var r = card.getBoundingClientRect();
            y = r.top + window.scrollY + r.height / 2 - window.innerHeight / 2;
            y = Math.max(y, absTop(el) - window.innerHeight * 0.55);
        } else y = absTop(el) - (el.classList.contains('gin') || el.classList.contains('ea-aduana') ? 80 : 0);
        window.scrollTo(0, Math.max(0, y));
        window.dispatchEvent(new Event('scroll'));
        var sec = sectionOf(el);
        if (sec && sec.classList.contains('gate')) openVote(Number(sec.id.slice(1)));
        paintBar();
    }
    function next() {
        var list = anchors();
        var sec = sectionOf(list[cur]);
        if (cur === 0) {
            var start = $('#start');
            if (start && !started) { started = true; start.click(); }
            setTimeout(function () { show(1); }, 80);
            return;
        }
        // Embarque / Aduana: the class answers all five before the story goes on.
        if (list[cur].dataset && list[cur].dataset.pmWait === '1') { say('Primero las cinco preguntas: el voto de la clase.'); return; }
        if (cur < list.length - 1) { show(cur + 1); return; }
        // The last unlocked step: press the story's own "continue" button, if it is offered.
        var btn = sec && $('.next:not([hidden]) [data-unlock]', sec);
        if (btn) {
            btn.click();
            setTimeout(function () { if (anchors().length > list.length) show(cur + 1); else paintBar(); }, 140);
            return;
        }
        if (sec && sec.classList.contains('carta')) { openRecap(); return; }
        say(sec && sec.classList.contains('fork') ? 'Primero elijan un camino.' : 'Primero voten y toquen Revelar.');
    }
    function prev() { if (cur > 0) show(cur - 1); }
    var started = false;

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
        + '<a class="pm-b" href="/dashboard/#espanol" style="text-decoration:none;display:inline-flex;align-items:center">Salir</a>';
    document.body.appendChild(bar);
    var msgTimer = null;
    function say(t) { var m = $('#pm-msg'); m.textContent = t; clearTimeout(msgTimer); msgTimer = setTimeout(function () { m.textContent = ''; }, 5000); }
    function paintBar() {
        var list = anchors();
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
        var el = anchors()[cur];
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
            var sec = sectionOf(anchors()[cur]);
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
    // Quick votes are approximate by design: "nearly everyone" reads as about 90%.
    function shares(row) {
        var out = {};
        if (row.mode === 'exact') { var t = total(row); row.opts.forEach(function (o) { out[o.k] = t ? Math.round((row.counts[o.k] || 0) / t * 100) : 0; }); return out; }
        var n = row.opts.length;
        row.opts.forEach(function (o) { out[o.k] = row.quick === SPLIT ? Math.round(100 / n) : (o.k === row.quick ? 90 : Math.round(10 / (n - 1))); });
        return out;
    }
    function snapshot(v) {
        return v.rows.map(function (row) {
            var pick = playPick(row);
            return {
                key: row.key, label: row.label, sentence: row.sentence, mode: row.mode,
                counts: row.mode === 'exact' ? row.opts.reduce(function (a, o) { a[o.k] = row.counts[o.k] || 0; return a; }, {}) : null,
                shares: shares(row), pick: pick, right: row.right ? row.right.indexOf(pick) >= 0 : null,
                opts: row.opts.map(function (o) { return { k: o.k, label: o.label }; }), rightKeys: row.right || [],
            };
        });
    }

    function openVote(n) {
        var box = $('#g' + n + ' .cv');
        if (!box) return;
        if (!votes[n]) {
            // Opening the story's own panel is what marks the playthrough as a class session.
            var link = $('.cv-link', box);
            if (link && link.getAttribute('aria-expanded') !== 'true') link.click();
            votes[n] = { rows: rowsFromStory(n), revealed: false, first: null, second: false };
            var el = document.createElement('div');
            el.className = 'pm-vote'; el.dataset.n = n;
            box.appendChild(el);
            el.addEventListener('click', function (e) { onVoteClick(n, e); });
        } else if (!votes[n].rows.some(function (r) { return r.right; }) && puertaCfg(n)) {
            // report.json arrived after the panel was built: pick up the right answers.
            var fresh = rowsFromStory(n);
            votes[n].rows.forEach(function (r, i) { if (fresh[i]) { r.right = fresh[i].right; r.key = fresh[i].key; r.sentence = fresh[i].sentence; r.opts.forEach(function (o, j) { o.playable = fresh[i].opts[j].playable; }); } });
        }
        paintVote(n);
    }
    function paintVote(n) {
        var v = votes[n], el = $('#g' + n + ' .pm-vote');
        if (!v || !el) return;
        if (v.revealed) { el.innerHTML = resultsHtml(n); return; }
        var exact = v.rows[0] && v.rows[0].mode === 'exact';
        var rows = v.rows.map(function (row, ri) {
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
            return '<div class="pm-row">' + (row.label || row.sentence ? '<span class="pm-rl" lang="es">' + esc(row.label) + (row.sentence ? (row.label ? ' · ' : '') + esc(row.sentence) : '') + '</span>' : '') + body + tie + '</div>';
        }).join('');
        var ready = v.rows.length > 0 && v.rows.every(function (r) { return voted(r) && playPick(r); });
        el.innerHTML = '<div class="pm-vh"><span>' + (v.second ? 'Segundo voto de la clase' : 'Voto de la clase') + '</span><span class="sp"></span>'
            + '<button class="pm-v sm" type="button" data-mode="' + (exact ? 'quick' : 'exact') + '">' + (exact ? 'Voto rápido' : 'Contar manos (exacto)') + '</button></div>'
            + rows
            + '<div class="pm-go"><button class="pm-reveal" type="button" data-reveal' + (ready ? '' : ' disabled') + '>Revelar</button>'
            + '<span class="pm-note">' + (ready ? '' : 'Primero el voto: manos arriba.') + '</span></div>';
    }
    function refocus(n, sel) { var b = $('#g' + n + ' .pm-vote ' + sel); if (b) b.focus(); }
    function onVoteClick(n, e) {
        var v = votes[n];
        var t = e.target.closest('button');
        if (!t) return;
        if (t.dataset.revote != null) { v.revealed = false; v.second = true; v.rows.forEach(function (r) { r.quick = null; r.counts = {}; r.tie = null; }); paintVote(n); refocus(n, '.pm-v'); return; }
        if (v.revealed) return;
        var row = t.dataset.r != null ? v.rows[Number(t.dataset.r)] : null;
        if (t.dataset.mode) { v.rows.forEach(function (r) { r.mode = t.dataset.mode; r.quick = null; r.counts = {}; r.tie = null; }); paintVote(n); refocus(n, '[data-mode]'); return; }
        if (t.dataset.q && row) { row.quick = t.dataset.q; row.tie = null; paintVote(n); refocus(n, '[data-q="' + t.dataset.q + '"][data-r="' + t.dataset.r + '"]'); return; }
        if (t.dataset.d && row) {
            var o = row.opts[Number(t.dataset.o)];
            row.counts[o.k] = Math.max(0, (row.counts[o.k] || 0) + Number(t.dataset.d));
            paintVote(n); refocus(n, '[data-d="' + t.dataset.d + '"][data-r="' + t.dataset.r + '"][data-o="' + t.dataset.o + '"]'); return;
        }
        if (t.dataset.tie && row) { row.tie = t.dataset.tie; paintVote(n); refocus(n, '[data-reveal]'); return; }
        if (t.dataset.reveal != null && !t.disabled) reveal(n);
    }
    // A / B / C on the keyboard: one more hand for that option (Shift takes one away). Only
    // for a Puerta with a single question, where the letters are unambiguous.
    function keyCount(n, oi, d) {
        var v = votes[n];
        if (!v || v.revealed || v.rows.length !== 1 || !v.rows[0].opts[oi]) return;
        var row = v.rows[0];
        if (row.mode !== 'exact') { row.mode = 'exact'; row.quick = null; row.counts = {}; row.tie = null; }
        var k = row.opts[oi].k;
        row.counts[k] = Math.max(0, (row.counts[k] || 0) + d);
        paintVote(n);
    }

    function barsHtml(snapRow) {
        var approx = snapRow.mode === 'quick';
        var t = approx ? 0 : snapRow.opts.reduce(function (a, o) { return a + (snapRow.counts[o.k] || 0); }, 0);
        return '<div class="pm-bars">' + snapRow.opts.map(function (o) {
            var ok = snapRow.rightKeys.indexOf(o.k) >= 0;
            var pct = snapRow.shares[o.k] || 0;
            return '<span class="w" lang="es">' + esc(o.label) + (ok ? '<span class="pm-ok" lang="es">✓ Respuesta correcta</span>' : '') + (snapRow.pick === o.k ? '<span class="pm-pick" lang="es">Voto de la clase</span>' : '') + '</span>'
                + '<span class="tr' + (ok ? ' ok' : '') + '" aria-hidden="true"><i style="width:' + pct + '%"></i></span>'
                + '<span class="val">' + (approx ? 'aprox. ' + pct + '%' : (snapRow.counts[o.k] || 0) + ' de ' + t + ' · ' + pct + '%') + '</span>';
        }).join('') + '</div>';
    }
    function resultsHtml(n) {
        var v = votes[n];
        var snap = v.second ? snapshot(v) : v.first;
        return '<div class="pm-res"><h4>' + (v.second ? 'Segundo voto · así votó la clase' : 'Así votó la clase') + '</h4>'
            + snap.map(function (r) { return (r.label || r.sentence ? '<span class="pm-rl" lang="es">' + esc(r.label) + (r.sentence ? (r.label ? ' · ' : '') + esc(r.sentence) : '') + '</span>' : '') + barsHtml(r); }).join('')
            + '<div class="pm-go"><button class="pm-v sm" type="button" data-revote>Volver a votar</button>'
            + '<span class="pm-note">' + (v.second ? 'El primer voto es el que se guarda.' : 'Ahora miren qué pasa en la historia con la respuesta de la clase.') + '</span></div></div>';
    }

    // The story's own controls for a Puerta, in the order of the vote rows: a group of
    // options, a verb chip or a typed blank.
    function controls(sec) {
        return $$('.opts, .chip, input', sec).filter(function (el) {
            if (el.closest('.cv') || el.closest('[id$="fix"]')) return false;
            if (el.tagName === 'INPUT' && el.type !== 'text') return false;
            return true;
        });
    }
    function visible(el) {
        return new Promise(function (resolve) {
            var tries = 0;
            (function poll() { if (el.offsetParent !== null || ++tries > 80) resolve(); else setTimeout(poll, 100); })();
        });
    }
    async function reveal(n) {
        var v = votes[n];
        if (!v.rows.every(function (r) { return voted(r) && playPick(r); })) return;
        var first = !v.first;
        if (first) v.first = snapshot(v);
        v.revealed = true;
        paintVote(n);
        refocus(n, '[data-revote]');
        if (!first) return;      // a second vote shows its bars; the story has already played
        var sec = $('#g' + n), ctrls = controls(sec);
        if (ctrls.length !== v.rows.length) { say('Elijan la respuesta de la clase en la historia.'); document.body.classList.add('pm-manual'); return; }
        for (var i = 0; i < ctrls.length; i++) {
            var el = ctrls[i], k = playPick(v.rows[i]);
            await visible(el);
            if (el.classList.contains('opts')) {
                var o = $$('.opt', el).filter(function (x) { return x.dataset.k === k; })[0];
                if (o && !o.disabled) o.click();
            } else if (el.tagName === 'INPUT') el.value = k;
            else el.textContent = k;
            await sleep(120);
        }
        var go = $('#g' + n + 'go');
        if (go) { go.disabled = false; go.click(); }
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
    function worthLine() {
        var worst = null;
        Object.keys(votes).forEach(function (n) {
            (votes[n].first || []).forEach(function (r) {
                if (!r.rightKeys.length) return;
                var rightShare = r.rightKeys.reduce(function (a, k) { return a + (r.shares[k] || 0); }, 0);
                if (rightShare < 100 && (!worst || rightShare < worst.share)) worst = { n: Number(n), share: rightShare, row: r };
            });
        });
        if (!worst) return '';
        var cfg = puertaCfg(worst.n);
        var miss = worst.row.opts.filter(function (o) { return worst.row.rightKeys.indexOf(o.k) < 0; }).sort(function (a, b) { return (worst.row.shares[b.k] || 0) - (worst.row.shares[a.k] || 0); })[0];
        return 'Puerta ' + worst.n + (cfg ? ' · ' + esc(cfg.label) : '') + (miss ? ': ' + (worst.row.mode === 'quick' ? 'about ' : '') + (worst.row.shares[miss.k] || 0) + '% picked <span lang="es">' + esc(miss.label) + '</span>.' : '.');
    }
    function sessionDoc(uid) {
        var puertas = {};
        Object.keys(votes).forEach(function (n) {
            if (!votes[n].first) return;
            puertas[n] = { rows: votes[n].first.map(function (r) { return { key: r.key == null ? null : String(r.key), mode: r.mode, counts: r.counts, shares: r.shares, pick: r.pick, right: r.right }; }) };
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
        var cards = Object.keys(votes).filter(function (n) { return votes[n].first; }).map(function (n) {
            var cfg = puertaCfg(Number(n));
            return '<div class="card"><h3>Puerta ' + n + (cfg ? ' · <span lang="en">' + esc(cfg.label) + '</span>' : '') + '</h3>'
                + votes[n].first.map(function (r) { return (r.label || r.sentence ? '<span class="pm-rl" lang="es">' + esc(r.label) + (r.sentence ? (r.label ? ' · ' : '') + esc(r.sentence) : '') + '</span>' : '') + barsHtml(r); }).join('') + '</div>';
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
        $('#pm-back').addEventListener('click', function () { el.remove(); recapOpen = false; $('[data-pm="next"]', bar).focus(); });
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
    setTimeout(function () { window.scrollTo(0, 0); paintBar(); paintTeacherLine(); $('[data-pm="next"]', bar).focus(); }, 0);
})();
