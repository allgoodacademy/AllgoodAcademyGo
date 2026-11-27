// EMBARQUE → ADUANA for the Español stories (2026-11-27, mockup el-mundial-embarque v1.3).
//
// Load as a CLASSIC script, after the story's own script (and after /js/site-config.js and
// /js/story-presentar.js):
//   <script src="/js/espanol-checks.js"></script>
//
// BEHIND A FLAG. It does nothing at all unless window.AG_CONFIG.ESPANOL_CHECKS_ON is true
// (/js/site-config.js: on for staging, off for production). The items are drafts awaiting
// native-speaker review; they live in the story's checks.json, so reviewed wording is a data
// change only. ONE component for every story: it finds the story by its folder name.
//
// WHAT IT DOES (it adds two blocks to the page; the story's own text and logic are untouched):
//   - EMBARQUE, required for every student: right after the prologue, before Puerta 1 and
//     before any Jodi explanation. "Antes de bajar del avión": a boarding pass with five
//     single-tap items. No skip, no score shown. Puerta 1 stays hidden until it is done.
//     Options are shown in a shuffled order (the right one is index 0 in the data).
//   - COUNTERBALANCED FORMS: an even student gets form A at Embarque and B at Aduana, an odd
//     one B then A. "Even / odd" comes from the student's anonymous session id (their uid),
//     so it is the same on reload and resume. Embarque is never repeated on resume.
//   - ADUANA, after la carta: "Última parada: la aduana", five items in the other form, then
//     MI PASAPORTE: "Al embarcar: X de 5. En la aduana: Y de 5", a ¡NUEVO! stamp for each
//     skill missed before and right after, YA LO SABÍAS for right both times, and Jodi's
//     one-line rule for each one still missed. Then the postcard prompt, written on paper or
//     in Google Classroom. THERE IS NO TEXT BOX HERE and nothing typed is stored.
//   - PRESENTAR: the same items become class votes (quick buttons), saved with the presented
//     session by /js/story-presentar.js. Nothing per student.
//
// WHAT IS STORED, on the student's own module_progress/{story} (`checks`) and the session
// summary: the story, the Embarque form, and right (1) or not (0) for each of the five slots
// in each phase. Nothing else. Vos is in the story and is not measured here.
(function () {
    var CFG = window.AG_CONFIG || {};
    if (!CFG.ESPANOL_CHECKS_ON) return;

    var SLUG = location.pathname.split('/').filter(Boolean).pop();
    var ST = window.StoryTrack || null;
    var PRESENTAR = !!(window.StoryPresentar && window.StoryPresentar.active);
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var g1 = $('#g1'), carta = $('#carta');
    if (!g1 || !carta) return;

    // Puerta 1 is hidden from the very first moment, so it never flashes before the pass.
    // Anything that goes wrong below fails OPEN: the story plays without the check.
    g1.classList.add('locked');
    var failedOpen = false;
    function failOpen() {
        failedOpen = true;
        g1.classList.remove('locked');
        carta.classList.remove('ea-wait');
        var s = $('#embq'); if (s) s.remove();
        if (window.StoryPresentar) window.StoryPresentar.refresh();
    }

    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/assets/css/espanol-checks.css';
    document.head.appendChild(css);

    var sec = document.createElement('section');
    sec.id = 'embq'; sec.className = 'ea-sec'; sec.setAttribute('aria-label', 'Tarjeta de embarque');
    sec.innerHTML = '<div class="ea-pass one center"><div class="l"><p class="ea-lbl">Tarjeta de embarque</p><p class="ea-note" role="status">Preparando tu tarjeta de embarque…</p></div></div>';
    g1.parentNode.insertBefore(sec, g1);
    sec.dataset.pmWait = '1';

    var BANK = null;
    var R = { form: 'A', emb: [], adu: [], embDone: false, aduDone: false };   // 1 = right, 0 = not
    var seed = 0;
    var presented = { emb: [], adu: [] };   // Presentar: the class's vote per item
    var track = function (ev, meta) { try { if (ST) ST.TM.track(ev, meta || {}); } catch (e) { /* ignore */ } };

    // The other form, for Aduana.
    var other = function (f) { return f === 'A' ? 'B' : 'A'; };
    // Even / odd from the anonymous uid: stable for this student on every device they save to.
    function parity(uid) { var n = 0; for (var i = 0; i < uid.length; i++) n = (n + uid.charCodeAt(i)) % 1000003; return n; }
    // A fixed shuffle for (student, phase, item): the same order again after a reload.
    function order(n, salt) {
        var a = [], i, x = (seed + salt * 7919 + 13) % 2147483647;
        for (i = 0; i < n; i++) a.push(i);
        for (i = n - 1; i > 0; i--) { x = (x * 16807 + 11) % 2147483647; var j = x % (i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
    }

    function save() {
        if (PRESENTAR || !ST) return;
        var checks = { v: 1, form: R.form, emb: R.emb.slice(), adu: R.adu.slice(), embDone: R.embDone, aduDone: R.aduDone };
        ST.saveProgress(SLUG, { checks: checks });
        try { ST.TM.summary({ checks: { form: R.form, emb: R.emb.slice(), adu: R.adu.slice() } }); } catch (e) { /* ignore */ }
    }

    /* ── one item, solo: a single tap, no feedback, on to the next ─────────── */
    function passHtml(phase, i, inner) {
        var pre = phase === 'emb';
        var side = pre
            ? 'ANTES DE BAJAR DEL AVIÓN<br><br><span lang="en">Just tap what you think. No score. This is only to see what the trip teaches you.</span>'
            : 'ADUANA<br>¿Algo que declarar?<br><br><span lang="en">Same skills, new situations.</span>';
        return '<div class="ea-pass"><div class="l"><p class="ea-lbl">' + (pre ? 'Tarjeta de embarque' : 'Aduana') + ' · ' + (i + 1) + ' de 5</p>' + inner
            + '<div class="ea-prog" aria-hidden="true">' + [0, 1, 2, 3, 4].map(function (k) { return '<i class="' + (k < i ? 'on' : '') + '"></i>'; }).join('') + '</div></div>'
            + '<div class="r">' + side + '</div></div>';
    }
    function ask(phase, el, done) {
        var answers = R[phase];
        var i = answers.length;
        if (i >= 5) { done(); return; }
        var form = phase === 'emb' ? R.form : other(R.form);
        var it = BANK[form][i];
        var ord = order(it.o.length, (phase === 'emb' ? 0 : 50) + i);
        if (PRESENTAR) {
            // The class votes by show of hands: nearly everyone for one option, or split.
            var letters = 'ABC';
            el.innerHTML = passHtml(phase, i, '<div class="ea-q" id="ea-q">' + it.q + '</div>'
                + '<ol class="ea-opts">' + ord.map(function (j, n) { return '<li><b>' + letters[n] + '</b>' + it.o[j] + '</li>'; }).join('') + '</ol>'
                + '<div class="ea-votes" role="group" aria-label="Voto de la clase">'
                + ord.map(function (j, n) { return '<button class="ea-v" type="button" data-j="' + j + '">Casi todos: ' + letters[n] + '</button>'; }).join('')
                + '<button class="ea-v" type="button" data-j="split">Dividido</button></div>');
        } else {
            el.innerHTML = passHtml(phase, i, '<div class="ea-q" id="ea-q">' + it.q + '</div><div role="group" aria-labelledby="ea-q">'
                + ord.map(function (j) { return '<button class="ea-op" type="button" data-j="' + j + '">' + it.o[j] + '</button>'; }).join('') + '</div>');
        }
        var first = $('.ea-op, .ea-v', el);
        if (first && i > 0) first.focus();
        Array.prototype.forEach.call(el.querySelectorAll('.ea-op, .ea-v'), function (b) {
            b.addEventListener('click', function () {
                if (answers.length !== i) return;
                var j = b.dataset.j;
                if (PRESENTAR) {
                    // Approximate shares, like every quick vote: about 90% / 50% / 10% right.
                    var n = it.o.length;
                    var right = j === 'split' ? Math.round(100 / n) : (Number(j) === it.a ? 90 : Math.round(10 / (n - 1)));
                    presented[phase].push({ pick: j === 'split' ? 'split' : Number(j), right: right });
                    answers.push(j !== 'split' && Number(j) === it.a ? 1 : 0);
                } else {
                    answers.push(Number(j) === it.a ? 1 : 0);
                    save();
                }
                ask(phase, el, done);
            });
        });
    }

    /* ── Embarque ───────────────────────────────────────────────────────────── */
    function startEmbarque() {
        track('ev_embarque', { phase: 'start', form: R.form });
        ask('emb', sec, function () {
            R.embDone = true;
            save();
            track('ev_embarque', { phase: 'done', form: R.form });
            sec.innerHTML = '<div class="ea-pass one center"><div class="l"><p class="ea-lbl">Tarjeta de embarque</p><p class="ea-big" tabindex="-1" id="ea-ready">¡Listo para el viaje!</p>'
                + '<span class="ea-stamp">EMBARCADO</span><p class="ea-note">' + (PRESENTAR ? 'Siguiente para empezar.' : 'Sigue bajando para empezar.') + '</p></div></div>';
            delete sec.dataset.pmWait;
            g1.classList.remove('locked');
            window.dispatchEvent(new Event('scroll'));
            if (window.StoryPresentar) window.StoryPresentar.refresh();
            else { $('#ea-ready').focus({ preventScroll: true }); setTimeout(function () { g1.scrollIntoView({ behavior: window.AG_REDUCED_MOTION ? 'auto' : 'smooth' }); }, 1100); }
        });
    }
    function skipEmbarque() {
        // Already done (a resume or a replay), or a student who was mid-story before the
        // checks existed: straight to the story, never a second Embarque.
        sec.remove();
        g1.classList.remove('locked');
        window.dispatchEvent(new Event('scroll'));
        if (window.StoryPresentar) window.StoryPresentar.refresh();
    }

    /* ── Aduana + Mi pasaporte ─────────────────────────────────────────────── */
    var adu = null;
    function passport() {
        var form = other(R.form);
        var p1 = R.emb.reduce(function (a, b) { return a + b; }, 0), p2 = R.adu.reduce(function (a, b) { return a + b; }, 0);
        var rows = BANK.slots.map(function (s, i) {
            var before = R.emb[i] === 1, after = R.adu[i] === 1;
            if (after) return '<div class="ea-row"><span class="ea-stamp' + (before ? ' knew' : '') + '">' + (before ? (PRESENTAR ? 'YA LO SABÍAN' : 'YA LO SABÍAS') : '¡NUEVO!') + '</span><span lang="en">' + s.skill + '</span></div>';
            return '<div class="ea-row"><b>Todavía no</b> · <span lang="en">' + s.skill + '</span><p class="ea-note" lang="en"><b>Jodi:</b> ' + BANK[form][i].why + '</p></div>';
        }).join('');
        adu.innerHTML = '<div class="ea-pass one"><div class="l"><p class="ea-lbl">Mi pasaporte · ' + BANK.title + '</p>'
            + '<p class="ea-big" tabindex="-1" id="ea-pp">Al embarcar: ' + p1 + ' de 5. En la aduana: ' + p2 + ' de 5.</p>' + rows
            + (PRESENTAR ? '<p class="ea-note" lang="en">Class votes by show of hands. Quick votes are approximate.</p>' : '')
            + '<div class="ea-post" lang="en"><b lang="es">La postal.</b> ' + BANK.postcard + ' Write it on paper or in Google Classroom; your teacher reads it there. Nothing is typed here.</div></div></div>';
        delete adu.dataset.pmWait;
        carta.classList.remove('ea-wait');
        if (window.StoryPresentar) window.StoryPresentar.refresh();
        else $('#ea-pp').focus({ preventScroll: true });
    }
    function showAduana() {
        if (adu || failedOpen || !R.embDone) return;
        adu = document.createElement('div');
        adu.className = 'ea-aduana'; adu.id = 'aduana';
        var recap = $('.recap', carta);
        carta.insertBefore(adu, recap);
        if (R.aduDone) { passport(); return; }          // a replay: the passport they already earned
        carta.classList.add('ea-wait');
        adu.dataset.pmWait = '1';
        var begin = function () {
            track('ev_aduana', { phase: 'start' });
            ask('adu', adu, function () { R.aduDone = true; save(); track('ev_aduana', { phase: 'done' }); passport(); });
        };
        if (R.adu.length) { begin(); return; }
        adu.innerHTML = '<div class="ea-pass one center"><div class="l"><p class="ea-lbl">De vuelta a casa</p><p class="ea-big">Última parada: la aduana</p>'
            + '<p class="ea-note" lang="en">Five quick taps, then your passport.</p><button class="ea-cta" type="button" id="ea-go">Pasar por la aduana</button></div></div>';
        $('#ea-go').addEventListener('click', begin);
        if (window.StoryPresentar) window.StoryPresentar.refresh();
    }
    function watchCarta() {
        if (!carta.classList.contains('locked')) { showAduana(); return; }
        new MutationObserver(function (_, obs) { if (!carta.classList.contains('locked')) { obs.disconnect(); showAduana(); } })
            .observe(carta, { attributes: true, attributeFilter: ['class'] });
    }

    /* ── start: the items, then who this is and what they have already done ─── */
    var bank = fetch('checks.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('checks.json ' + r.status); return r.json(); });
    var who = PRESENTAR || !ST ? Promise.resolve(null) : ST.ready.then(function (core) {
        var u = core && core.auth && core.auth.currentUser;
        return u ? u.uid : null;
    }).catch(function () { return null; });
    var saved = PRESENTAR || !ST ? Promise.resolve(null) : ST.loadProgress(SLUG);

    Promise.all([bank, who, saved]).then(function (res) {
        BANK = res[0];
        if (!BANK || !Array.isArray(BANK.A) || BANK.A.length !== 5 || !Array.isArray(BANK.B) || BANK.B.length !== 5) throw new Error('checks.json is not a 5 + 5 item bank');
        var uid = res[1], prog = res[2] || {};
        seed = uid ? parity(uid) : Math.floor(Math.random() * 100000);
        var c = prog.checks;
        if (c && (c.form === 'A' || c.form === 'B') && Array.isArray(c.emb)) {
            R.form = c.form;
            R.emb = c.emb.slice(0, 5).map(function (v) { return v ? 1 : 0; });
            R.adu = Array.isArray(c.adu) ? c.adu.slice(0, 5).map(function (v) { return v ? 1 : 0; }) : [];
            R.embDone = c.embDone === true || R.emb.length >= 5;
            R.aduDone = c.aduDone === true;
        } else {
            // In Presentar the class always boards with form A. A student: even → A, odd → B.
            R.form = PRESENTAR ? 'A' : (seed % 2 === 0 ? 'A' : 'B');
            // Mid-story from before the checks existed: no Embarque now, and so no Aduana.
            var st = null;
            try { st = typeof prog.state === 'string' && !prog.finished ? JSON.parse(prog.state) : null; } catch (e) { st = null; }
            if (st && st.done && Object.keys(st.done).length) { skipEmbarque(); return; }
        }
        if (R.embDone) { skipEmbarque(); if (R.aduDone || R.adu.length) save(); } else startEmbarque();
        watchCarta();
    }).catch(function (e) {
        try { console.warn('[Español checks] unavailable, the story plays without them', e); } catch (_) { /* ignore */ }
        failOpen();
    });

    window.StoryChecks = {
        // For the presented session (story-presentar.js): the class's votes, or null.
        presentedResults: function () {
            if (!PRESENTAR || !presented.emb.length) return null;
            return { v: 1, form: R.form, emb: presented.emb.slice(), adu: presented.adu.slice() };
        },
    };
})();
