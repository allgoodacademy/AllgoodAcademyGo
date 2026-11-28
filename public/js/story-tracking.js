// Tracking for the Español stories (/espanol/el-viaje/, /espanol/el-mundial/, /espanol/la-selva/, /espanol/la-habana/), 2026-11-27.
//
// Load as a CLASSIC script, before the story's own script:
//   <script src="/js/story-tracking.js"></script>
//
// Why a separate file: each story reads its telemetry object once, synchronously, when its
// script runs (`const TM = ...`). The shared AuthCore and Telemetry are ES modules, which
// only run after every classic script, so a story reading window.Telemetry directly always
// got the console stub. This gives the story a stand-in (StoryTrack.TM) with the real
// Telemetry API that queues every call, loads the two modules the way the simulations do,
// and replays the queue in order once they are ready. Nothing in the story changes shape.
//
// It also owns the three things a story needs from Firestore, so both stories do them the
// same way:
//   - saveProgress(slug, data): the student's own module_progress/{slug} (resume, the
//     dashboard's In progress pill). Undefined values are dropped (Firestore rejects them).
//   - loadProgress(slug): read it back on page load, for resume.
//   - logCompletion(gameName, fields): one game_scores doc per finished playthrough,
//     { gameName, completed: true, score, ... }, the record the dashboard's Done pill and
//     Mission Control's roster read.
//
// PRIVACY. Nothing here reads or writes a name, typed text or any class-vote counts: a
// story passes only fixed answer keys, indexes and 0/1 scores. No Google Analytics, no
// cookies, no third-party script: the only network calls are this site's own Firebase.
(function () {
    var METHODS = ['init', 'plan', 'step', 'choice', 'complete', 'summary', 'track', 'restart'];
    var queue = [];
    var real = null;
    var debug = null;
    var resolveReady;
    var ready = new Promise(function (r) { resolveReady = r; });

    // STEP PROGRESS (AA-23, 2026-11-28). The dashboard's "N of M scenes" bar reads `step` (the
    // furthest step() reached on this page) and `stepsTotal` (from init/plan) off the student's
    // own module_progress/{slug}. Nothing new is collected: these are the same numbers
    // Telemetry already puts on the session doc (maxStep / stepsTotal). They are merged into
    // every saveProgress, and also written on their own when the step advances (merge, at most
    // once per 10 s). A step-only write carries ONLY step and stepsTotal, so it never touches
    // the story's resume `state` (tests/story-tracking.test.mjs holds this). Step 1 is "the page
    // opened", not progress, so it is never written on its own.
    var prog = { slug: '', step: 0, stepsTotal: null };
    var STEP_EVERY_MS = 10000;
    var lastStepWrite = 0;
    var stepTimer = null;
    function track(name, a) {
        if (name === 'init' && a && typeof a === 'object') {
            if (a.module) prog.slug = String(a.module);
            if (typeof a.stepsTotal === 'number' && a.stepsTotal > 0) prog.stepsTotal = a.stepsTotal;
        } else if (name === 'plan') {
            if (typeof a === 'number' && a > 0) prog.stepsTotal = a;
        } else if (name === 'step') {
            if (typeof a === 'number' && isFinite(a) && a > prog.step) { prog.step = Math.floor(a); scheduleStep(); }
        } else if (name === 'complete') {
            if (prog.stepsTotal && prog.step < prog.stepsTotal) prog.step = prog.stepsTotal;
        } else if (name === 'restart') {
            prog.step = 0;
        }
    }
    function stepFields() {
        var f = {};
        if (prog.step > 0) f.step = prog.step;
        if (prog.stepsTotal) f.stepsTotal = prog.stepsTotal;
        return f;
    }
    function scheduleStep() {
        if (!prog.slug || prog.step < 2 || stepTimer) return;
        var wait = Math.max(0, lastStepWrite + STEP_EVERY_MS - Date.now());
        stepTimer = setTimeout(flushStep, wait);
    }
    function flushStep() {
        if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
        if (!prog.slug || prog.step < 2) return;
        lastStepWrite = Date.now();
        write(prog.slug, stepFields());
    }
    // A step reached in the last few seconds before the tab closes is still written.
    try { window.addEventListener('pagehide', function () { if (stepTimer) flushStep(); }); } catch (e) { /* ignore */ }

    function call(name, args) {
        try { track(name, args[0]); } catch (e) { /* never block the story */ }
        if (debug) { try { debug(name, args[0]); } catch (e) { /* ignore */ } }
        if (real) {
            try { return real[name] && real[name].apply(real, args); } catch (e) { return undefined; }
        }
        queue.push([name, args]);
        return undefined;
    }
    var TM = {};
    METHODS.forEach(function (name) {
        TM[name] = function () { return call(name, Array.prototype.slice.call(arguments)); };
    });

    ['/js/auth-core.js', '/js/telemetry.js'].forEach(function (src) {
        var s = document.createElement('script');
        s.type = 'module'; s.src = src; s.async = false;
        document.head.appendChild(s);
    });

    var tries = 0;
    (function poll() {
        if (window.Telemetry && window.AuthCore) {
            real = window.Telemetry;
            var q = queue.splice(0);
            q.forEach(function (c) { try { real[c[0]].apply(real, c[1]); } catch (e) { /* ignore */ } });
            // The student's existing anonymous session (or a new one). A student who joined a
            // class keeps their uid, which is what lets their teacher read this visit.
            Promise.resolve(window.AuthCore.startSession ? window.AuthCore.startSession() : null)
                .then(function (user) { resolveReady(user ? window.AuthCore : null); })
                .catch(function () { resolveReady(null); });
            return;
        }
        // About 20 seconds. If the modules never load (offline, blocked), the story still
        // plays: every call stays in the queue and nothing is saved.
        if (++tries > 400) { resolveReady(null); return; }
        setTimeout(poll, 50);
    })();

    // PRESENTAR (?mode=presentar, /js/story-presentar.js): a TEACHER is running the story for
    // the class on a projector. Their own progress and completion are not written (a class
    // session must never read as solo play, or resume next time), and nothing is read back.
    // What a presented session saves is one class-level document, written there.
    //
    // TEACHERS ONLY (2026-11-27, review of #97). The URL parameter alone turns nothing on:
    // a student who adds ?mode=presentar must not be able to skip their own tracking. The
    // mode is on only when the signed-in user is a teacher: a real (not anonymous) sign-in
    // whose own profile says role 'teacher', which firestore.rules lets nobody set without a
    // teacher sign-in and a class they own. For anyone else, and when sign-in or the profile
    // can't be read, the parameter is ignored and the story runs normally, tracked.
    // `presentar` is a promise for that answer; everything below waits for it.
    //
    // PRESENTAR BY DEFAULT FROM THE HUB (2026-11-28, AA-18). A story page that carries
    // <meta name="ag-presentar-default" content="hub"> (La selva) also asks for the mode when it
    // was opened from the /espanol/ hub (same-origin referrer) with no ?mode= of its own. The
    // same teacher-only gate decides: a student from the hub gets the normal story, tracked.
    // ?mode=solo always plays solo. The class code comes from the teacher's own profile.
    var MODE_PARAM = /[?&]mode=([a-z]+)/.exec(location.search);
    var FROM_HUB = !MODE_PARAM && (function () {
        try {
            var m = document.querySelector('meta[name="ag-presentar-default"]');
            if (!m || m.getAttribute('content') !== 'hub' || !document.referrer) return false;
            var r = new URL(document.referrer);
            return r.origin === location.origin && r.pathname === '/espanol/';
        } catch (e) { return false; }
    })();
    var ASKED = /[?&]mode=presentar(&|$)/.test(location.search) || FROM_HUB;
    var presentarInfo = { fromHub: FROM_HUB, classCode: '' };
    var presentar = !ASKED ? Promise.resolve(false) : ready.then(function (core) {
        var user = core && core.auth && core.auth.currentUser;
        if (!user || user.isAnonymous || !core.getAccount) return false;
        return core.getAccount(user.uid).then(function (acct) {
            var teacher = !!acct && acct.role === 'teacher';
            if (teacher && acct.classroomCode) presentarInfo.classCode = String(acct.classroomCode);
            return teacher;
        });
    }).catch(function () { return false; });

    function clean(data) {
        try { return JSON.parse(JSON.stringify(data || {})); } catch (e) { return {}; }
    }

    // The story's own fields always win: step/stepsTotal are added only where the story's data
    // does not already carry them, and nothing else is added.
    function saveProgress(slug, data) {
        var d = clean(data);
        if (!prog.slug) prog.slug = String(slug || '');
        if (String(slug) === prog.slug) {
            var f = stepFields();
            Object.keys(f).forEach(function (k) { if (d[k] === undefined) d[k] = f[k]; });
            if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
            lastStepWrite = Date.now();
        }
        return write(slug, d);
    }

    function write(slug, d) {
        return presentar.then(function (on) {
            if (on) return undefined;
            return ready.then(function (core) {
                if (core && core.saveModuleProgress) return core.saveModuleProgress(slug, d);
                return undefined;
            });
        }).catch(function () { /* never block the story */ });
    }

    function loadProgress(slug) {
        return presentar.then(function (on) {
            if (on) return null;
            return ready.then(function (core) {
                return core && core.loadModuleProgress ? core.loadModuleProgress(slug) : null;
            });
        }).catch(function () { return null; });
    }

    function logCompletion(gameName, fields) {
        var f = clean(fields);
        return presentar.then(function (on) {
            if (on) return undefined;
            return ready.then(function (core) {
                var user = core && core.auth && core.auth.currentUser;
                if (!user) return undefined;
                return import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js').then(function (fs) {
                    var sid = (real && real.sessionId) || ('story-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
                    var ref = fs.doc(core.db, 'artifacts', core.appId, 'users', user.uid, 'game_scores', sid);
                    var rec = { gameName: gameName, completed: true, lastUpdated: fs.serverTimestamp() };
                    Object.keys(f).forEach(function (k) { rec[k] = f[k]; });
                    rec.gameName = gameName; rec.completed = true;
                    return fs.setDoc(ref, rec, { merge: true });
                });
            });
        }).catch(function (e) { try { console.warn('[StoryTrack] completion write failed', e); } catch (_) { /* ignore */ } });
    }

    window.StoryTrack = {
        TM: TM,
        presentarAsked: ASKED,
        presentarFromHub: FROM_HUB,   // asked only because a hub link opened the page (see above)
        presentarInfo: presentarInfo, // { fromHub, classCode }: classCode is set once a teacher is confirmed
        presentar: presentar,   // Promise<boolean>: true only for a signed-in teacher who asked for it
        ready: ready,
        setDebug: function (fn) { debug = typeof fn === 'function' ? fn : null; },
        saveProgress: saveProgress,
        loadProgress: loadProgress,
        logCompletion: logCompletion,
    };
})();
