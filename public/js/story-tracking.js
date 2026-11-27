// Tracking for the Español stories (/espanol/el-viaje/, /espanol/el-mundial/), 2026-11-27.
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

    function call(name, args) {
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

    // PRESENTAR (?mode=presentar, /js/story-presentar.js): the teacher is running the story
    // for the class on a projector. Their own progress and completion are not written (a
    // class session must never read as solo play, or resume next time), and nothing is read
    // back. What a presented session saves is one class-level document, written there.
    var PRESENTAR = /[?&]mode=presentar(&|$)/.test(location.search);

    function clean(data) {
        try { return JSON.parse(JSON.stringify(data || {})); } catch (e) { return {}; }
    }

    function saveProgress(slug, data) {
        if (PRESENTAR) return Promise.resolve();
        var d = clean(data);
        return ready.then(function (core) {
            if (core && core.saveModuleProgress) return core.saveModuleProgress(slug, d);
            return undefined;
        }).catch(function () { /* never block the story */ });
    }

    function loadProgress(slug) {
        if (PRESENTAR) return Promise.resolve(null);
        return ready.then(function (core) {
            return core && core.loadModuleProgress ? core.loadModuleProgress(slug) : null;
        }).catch(function () { return null; });
    }

    function logCompletion(gameName, fields) {
        if (PRESENTAR) return Promise.resolve();
        var f = clean(fields);
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
        }).catch(function (e) { try { console.warn('[StoryTrack] completion write failed', e); } catch (_) { /* ignore */ } });
    }

    window.StoryTrack = {
        TM: TM,
        presentar: PRESENTAR,
        ready: ready,
        setDebug: function (fn) { debug = typeof fn === 'function' ? fn : null; },
        saveProgress: saveProgress,
        loadProgress: loadProgress,
        logCompletion: logCompletion,
    };
})();
