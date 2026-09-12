// COMMS — the shared typed inbox that replaced the old single-purpose "Direct Line"
// modal. One script tag, nothing else:
//
//   <script src="/js/message-hq.js" data-message-source="Jodi's Schoolhouse: <Module Name>"></script>
//
// Load it after auth-core.js. Any navbar button just needs onclick="window.openComms()"
// (window.openMessageModal is kept as an alias because ten pages already call it).
//
// The file name stays message-hq.js on purpose: renaming it would mean editing the
// script tag on twelve pages in the same change that rewrites the module, and a typo in
// one of them is a page that silently loses its inbox. The name is a path, not a claim.
//
// WHAT CHANGED FROM "DIRECT LINE": that modal was a send box dressed as an inbox — the
// icon implied mail waiting, and every visit opened a form asking the student for
// something. Comms is a list of TYPED items, only some of which ask anything of anyone:
//
//   topic nudge      — the app offering the student something (routing into a lab)
//   acknowledgement  — a templated confirmation that a note they sent reached HQ
//   compose          — a persistent action at the bottom, deliberately NOT an item
//
// Compose is not an item because it is not news. If it counted toward the unread dot,
// the dot would be permanently lit and would mean nothing.
//
// ---------------------------------------------------------------------------------
// NO OPERATOR REPLY PATH. EVER.
//
// Every inbound item here is generated from a fixed template by this file. There is no
// code path, and must never be one, by which an adult types free text that a child
// reads. That is not a UI preference: templated system messages to a minor and an adult
// writing to a minor are different regulatory categories, and the second one brings
// moderation, parental notice and reply-thread retention with it. If a future pass wants
// HQ to answer a student inside the app, that is a new product and a new review — do not
// let it arrive as an increment to this file.
// ---------------------------------------------------------------------------------
//
// TAILWIND, AND WHY SOME THINGS ARE INLINE: this markup is built as JS strings. The
// bundles in public/assets/css/ are purged, and until recently they were purged by
// scanning .html only, so every class used exclusively here compiled to nothing —
// that is the bug that put the old modal underneath .screen-container (z-index:1,
// overflow:hidden). public/js/**/*.js is in the content globs now, so the classes below
// do compile. But the handful of properties that decide whether this is SEEN AT ALL —
// position, inset, z-index, the scrim, and the close button's 44x44 tap target — are set
// inline anyway, exactly as /js/identity-gate.js does on #ag-modal. A stale bundle, a
// hand-edited bundle or a future glob change must not be able to hide this again.
(function () {
    'use strict';

    var scriptEl = document.currentScript;
    var source = (scriptEl && scriptEl.dataset.messageSource) || document.title || 'Unknown portal';

    // --- Visibility-critical styling. See the note above; do not move these to classes.
    var MODAL_STYLE = 'position:fixed;inset:0;z-index:2147483000;' +
        'background-color:rgba(76,76,76,0.9);' +            // allgood-dark @ 90%
        'display:flex;align-items:center;justify-content:center;';
    // 44x44 is the WCAG 2.5.5 minimum. Sized inline for the same reason as the z-index:
    // the width/height utilities it would otherwise need are not guaranteed in a bundle
    // this file does not control. The icon stays 20px; only the tappable area grows.
    var CLOSE_STYLE = 'position:absolute;top:6px;right:6px;width:44px;height:44px;' +
        'display:flex;align-items:center;justify-content:center;';
    // The panel is a flex column with a capped height so the LIST scrolls rather than the
    // page. Inline because a modal that runs off the bottom of a phone with no way back
    // is the same class of failure as one that renders behind the screen.
    var PANEL_STYLE = 'width:100%;max-width:26rem;max-height:80vh;display:flex;flex-direction:column;';
    var LIST_STYLE = 'overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1 1 auto;min-height:0;';

    // Local mirror of read state, so the dot is right on the very first paint instead of
    // flashing lit until Firestore answers. Firestore is the source of truth across
    // devices; this is the fast path, keyed per uid so two students sharing a Chromebook
    // never inherit each other's read state.
    function readKey(uid) { return 'ag_comms_read_' + (uid || 'anon'); }

    var state = {
        uid: null,
        account: null,
        receipts: [],
        items: [],
        readIds: [],
        loaded: false,
    };

    // ---------------------------------------------------------------- item construction

    // The registry lives on the dashboard, which is the only page that has one. On a
    // GoodBlock or a Lab Pack hub there is nothing to route into that the student is not
    // already looking at, so the nudge simply does not appear there and Comms shows
    // whatever else it has. Never throw because a page has no registry.
    function labModules() {
        var reg = window.MODULE_REGISTRY;
        if (!Array.isArray(reg)) return [];
        return reg.filter(function (m) { return m && m.category === 'lab' && m.topic && m.url; });
    }

    function buildItems(receipts) {
        var items = [];
        var labs = labModules();
        if (labs.length) {
            items.push({
                id: 'topic-nudge-v1',
                type: 'nudge',
                title: 'What do you want to get better at?',
                body: 'Pick something and I’ll point you at a lab for it.',
                icon: 'compass',
            });
        }
        (receipts || []).forEach(function (r) {
            items.push({
                id: 'receipt-' + r.id,
                type: 'ack',
                title: 'Your note reached HQ',
                // Templated, and true at the moment the receipt was written. It does not
                // claim a human has read it yet — see recordCommsReceipt() in auth-core.js
                // for why a real read receipt needs a firestore.rules change.
                body: 'A real person reads these. They can’t write back here, so you won’t get a reply in Comms.',
                excerpt: r.excerpt || '',
                icon: 'check-circle',
            });
        });
        return items;
    }

    function unreadCount() {
        return state.items.filter(function (it) { return state.readIds.indexOf(it.id) === -1; }).length;
    }

    // ------------------------------------------------------------------------ the dot

    // Real unread state, not a first-visit hint. The element is optional: only the
    // dashboard navbar ships one today, and a page without it just has no dot.
    function renderDot() {
        var dot = document.getElementById('message-notification');
        var n = unreadCount();
        if (dot) dot.style.display = n > 0 ? '' : 'none';
        document.dispatchEvent(new CustomEvent('comms:unread', { detail: { count: n } }));
    }

    function markRead(id) {
        if (!id || state.readIds.indexOf(id) !== -1) return;
        state.readIds.push(id);
        try { localStorage.setItem(readKey(state.uid), JSON.stringify(state.readIds)); } catch (e) { /* private mode */ }
        if (window.AuthCore && window.AuthCore.saveCommsRead) window.AuthCore.saveCommsRead(state.readIds);
        renderDot();
    }

    // ------------------------------------------------------------------------- markup

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    var TEMPLATE =
        '<div id="message-modal" style="' + MODAL_STYLE + '" class="hidden-modal fixed inset-0 z-[9999] bg-allgood-dark/90 flex items-center justify-center p-6 modal-transition backdrop-blur-sm" onclick="window.closeComms()">' +
            '<div style="' + PANEL_STYLE + '" class="bg-white rounded-lg shadow-2xl border-t-4 border-allgood-primary relative" onclick="event.stopPropagation()">' +
                '<button onclick="window.closeComms()" style="' + CLOSE_STYLE + '" class="text-gray-400 hover:text-red-500 transition-colors" title="Close" aria-label="Close">' +
                    '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
                '</button>' +
                '<div class="px-6 pt-6 pb-3 shrink-0">' +
                    '<h3 class="text-xl font-heading font-bold text-allgood-dark uppercase">Comms</h3>' +
                    '<p class="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">From Allgood HQ</p>' +
                '</div>' +
                '<div id="comms-body" style="' + LIST_STYLE + '" class="px-6"></div>' +
                '<div id="comms-foot" class="px-6 py-4 border-t border-gray-100 shrink-0"></div>' +
            '</div>' +
        '</div>';

    // The .mission-file left-border card is this product's list-row pattern; Comms items
    // reuse it rather than introducing a second one. Unread rows carry the primary colour
    // on the border and a filled dot; read rows go grey and lose the dot.
    function itemHtml(it) {
        var unread = state.readIds.indexOf(it.id) === -1;
        return '' +
            '<button type="button" data-comms-item="' + esc(it.id) + '" ' +
                'class="w-full text-left mb-3 rounded-r bg-gray-50 hover:bg-gray-100 transition-colors p-3 border-l-4 ' +
                (unread ? 'border-allgood-primary' : 'border-gray-300') + '">' +
                '<div class="flex items-start gap-2">' +
                    (unread
                        ? '<span class="mt-1.5 h-2 w-2 rounded-full bg-allgood-primary shrink-0"></span>'
                        : '<span class="mt-1.5 h-2 w-2 rounded-full bg-transparent shrink-0"></span>') +
                    '<div class="min-w-0">' +
                        '<p class="text-sm font-bold ' + (unread ? 'text-allgood-dark' : 'text-gray-500') + ' font-heading">' + esc(it.title) + '</p>' +
                        '<p class="text-xs text-gray-500 mt-1 leading-snug">' + esc(it.body) + '</p>' +
                        (it.excerpt ? '<p class="text-xs text-gray-400 mt-1 italic break-words">“' + esc(it.excerpt) + '”</p>' : '') +
                    '</div>' +
                '</div>' +
            '</button>';
    }

    function emptyHtml() {
        // Not an apology. An empty inbox is a normal state, not a failure to entertain.
        return '<p class="text-sm text-gray-500 py-6 text-center">Nothing new right now.</p>';
    }

    function footHtml() {
        return '<button id="comms-compose-btn" type="button" onclick="window.commsCompose()" ' +
            'class="w-full bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded text-xs shadow-md transition-all active:scale-95 uppercase tracking-wide flex items-center justify-center gap-2">' +
            '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
            'Write to the team</button>';
    }

    function renderList() {
        var body = document.getElementById('comms-body');
        var foot = document.getElementById('comms-foot');
        if (!body || !foot) return;
        // Rebuilt here rather than only in refresh(), so the item list always reflects the
        // registry as it is NOW. On the dashboard MODULE_REGISTRY is published by a
        // type="module" block, and a deferred module is not guaranteed to have run before
        // whatever else raced to build this list. Cheap — no network, just the cached
        // receipts — and it removes the ordering question entirely.
        state.items = buildItems(state.receipts);
        body.innerHTML = state.items.length ? state.items.map(itemHtml).join('') : emptyHtml();
        // The compose action is present in BOTH states. An empty inbox must still offer
        // the one thing the student can actually do from here.
        foot.innerHTML = footHtml();
        foot.style.display = '';
        body.querySelectorAll('[data-comms-item]').forEach(function (el) {
            el.addEventListener('click', function () { openItem(el.dataset.commsItem); });
        });
        renderDot();
    }

    function panelHtml(inner) {
        return '<div class="py-2">' + inner +
            '<button type="button" onclick="window.commsBack()" class="mt-4 text-xs text-gray-500 hover:text-allgood-dark font-bold uppercase tracking-wide underline decoration-dotted">Back to Comms</button>' +
            '</div>';
    }

    function showPanel(inner, footInner) {
        var body = document.getElementById('comms-body');
        var foot = document.getElementById('comms-foot');
        if (!body || !foot) return;
        body.innerHTML = panelHtml(inner);
        foot.innerHTML = footInner || '';
        // A panel with no action of its own would otherwise leave an empty bordered strip
        // across the bottom of the card.
        foot.style.display = footInner ? '' : 'none';
        if (window.lucide) window.lucide.createIcons();
    }

    // --------------------------------------------------------------------- item views

    // Reading an item is what clears its dot — per item, on open. Opening the modal
    // clears nothing, which is the whole point: the dot has to survive a student who
    // glances in and leaves, or it is a first-visit hint again by another name.
    function openItem(id) {
        var it = state.items.filter(function (x) { return x.id === id; })[0];
        if (!it) return;
        markRead(id);
        if (it.type === 'nudge') return openTopics();
        showPanel(
            '<p class="text-sm font-bold text-allgood-dark font-heading mb-2">' + esc(it.title) + '</p>' +
            '<p class="text-xs text-gray-500 leading-relaxed">' + esc(it.body) + '</p>' +
            (it.excerpt ? '<p class="text-xs text-gray-400 mt-3 italic break-words">“' + esc(it.excerpt) + '”</p>' : '')
        );
    }

    function openTopics() {
        var labs = labModules();
        var chips = labs.map(function (m) {
            return '<button type="button" data-comms-topic="' + esc(m.id) + '" ' +
                'class="border border-gray-300 hover:border-allgood-primary hover:text-allgood-primary text-gray-600 rounded-full px-3 py-1.5 text-xs font-bold transition-colors">' +
                esc(m.topic) + '</button>';
        }).join('');
        showPanel(
            '<p class="text-sm font-bold text-allgood-dark font-heading mb-1">What do you want to get better at?</p>' +
            '<p class="text-xs text-gray-500 mb-3">Pick one.</p>' +
            '<div class="flex flex-wrap gap-2">' + chips + '</div>'
        );
        var body = document.getElementById('comms-body');
        if (!body) return;
        body.querySelectorAll('[data-comms-topic]').forEach(function (el) {
            el.addEventListener('click', function () { showSuggestion(el.dataset.commsTopic); });
        });
    }

    function showSuggestion(moduleId) {
        var m = labModules().filter(function (x) { return x.id === moduleId; })[0];
        if (!m) return;
        var mins = typeof m.durationMinutes === 'number' ? m.durationMinutes + ' min' : '';
        showPanel(
            '<p class="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2">Try this</p>' +
            '<div class="border-l-4 border-allgood-secondary bg-gray-50 rounded-r p-3">' +
                '<p class="text-sm font-bold text-allgood-dark font-heading">' + esc(m.name) + '</p>' +
                '<p class="text-xs text-gray-500 mt-1 leading-snug">' + esc(m.blurb || '') + '</p>' +
                (mins ? '<p class="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-2">' + esc(mins) + '</p>' : '') +
            '</div>' +
            '<button type="button" data-comms-go="' + esc(m.id) + '" ' +
                'class="w-full mt-4 bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded text-xs shadow-md transition-all active:scale-95 uppercase tracking-wide">' +
                'Take me there</button>'
        );
        var go = document.querySelector('[data-comms-go]');
        if (go) go.addEventListener('click', function () { confirmTopic(m); });
    }

    function confirmTopic(m) {
        // Recorded before navigating, not after: the next line replaces the document and
        // any pending work goes with it. Not awaited for the same reason — Firestore's
        // write is already queued locally and a slow network must not cost the student
        // the navigation they just asked for.
        if (window.AuthCore && window.AuthCore.recordTopicSelection) {
            window.AuthCore.recordTopicSelection({ category: m.topic, moduleId: m.id, moduleName: m.name });
        }
        document.dispatchEvent(new CustomEvent('comms:topic', { detail: { moduleId: m.id, category: m.topic } }));
        window.location.href = m.url;
    }

    // ------------------------------------------------------------------------ compose

    function isThirteenPlus() {
        var u = window.AuthCore && window.AuthCore.auth && window.AuthCore.auth.currentUser;
        return !!(u && !u.isAnonymous && state.account && state.account.ageTier === '13plus');
    }

    window.commsCompose = function () {
        if (!isThirteenPlus()) return showAccountNeeded();
        showPanel(
            '<p class="text-sm font-bold text-allgood-dark font-heading mb-1">Write to the team</p>' +
            '<p class="text-xs text-gray-500 mb-3 leading-relaxed">A real person reads every one of these. They can’t write back here, so you won’t get a reply in Comms.</p>' +
            '<textarea id="message-input" rows="4" class="w-full border border-gray-300 rounded p-3 text-sm focus:ring-1 focus:ring-allgood-primary focus:border-allgood-primary outline-none resize-none bg-gray-50 font-body placeholder-gray-400" style="font-size:16px;" placeholder="Found a bug, disagree with something, or have a thought? Type it here."></textarea>',
            '<button id="btn-send-message" onclick="window.submitHQMessage()" class="w-full bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded text-xs shadow-md transition-all active:scale-95 uppercase tracking-wide flex items-center justify-center gap-2">' +
                '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
                'Send</button>'
        );
        setTimeout(function () {
            var i = document.getElementById('message-input');
            if (i) i.focus();
        }, 100);
    };

    // Under-13 copy leads with what still works, not with the refusal. A Learner Recruit
    // reads every other item in Comms exactly as a 13+ student does; the only thing
    // behind the account is writing TO the team, because that is the one path that
    // carries a child's free text off the device.
    function showAccountNeeded() {
        showPanel(
            '<p class="text-sm font-bold text-allgood-dark font-heading mb-2">Everything else in Comms works the same for you</p>' +
            '<p class="text-xs text-gray-500 leading-relaxed">You can open and read every message here, and pick a topic to jump into a lab — all of it, same as anyone.</p>' +
            '<p class="text-xs text-gray-500 leading-relaxed mt-2">Writing a note to the team is the one part that needs an account, because a note goes off this device to a real person. You can set one up when you’re 13.</p>'
        );
    }

    window.submitHQMessage = async function () {
        var input = document.getElementById('message-input');
        var btn = document.getElementById('btn-send-message');
        if (!input || !btn) return;
        var text = input.value.trim();
        if (!text) return;
        // Belt and braces: the compose view is unreachable without this, but the gate is
        // re-checked at submit so a console call or a stale panel cannot post as a minor.
        if (!isThirteenPlus()) return showAccountNeeded();

        var originalText = btn.innerHTML;
        btn.disabled = true;
        btn.textContent = 'Sending...';
        try {
            await window.AuthCore.sendMessage({ text: text, source: source });
            // The student's own readable copy. Without it Comms cannot show an
            // acknowledgement, because artifacts/{appId}/messages is admin-read only.
            if (window.AuthCore.recordCommsReceipt) {
                await window.AuthCore.recordCommsReceipt({ text: text, source: source });
            }
            document.dispatchEvent(new CustomEvent('messagehq:sent', { detail: { source: source } }));
            if (window.sfx && window.sfx.success) window.sfx.success();
            input.value = '';
            btn.classList.remove('bg-allgood-primary', 'hover:bg-allgood-hover');
            btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
            btn.innerHTML = 'Sent';
            await refresh();
            setTimeout(function () { window.commsBack(); }, 1200);
        } catch (e) {
            console.error('[Comms] send failed', e);
            btn.disabled = false;
            btn.innerHTML = originalText;
            if (window.lucide) window.lucide.createIcons();
        }
    };

    // ------------------------------------------------------------------ open / close

    function injectModal() {
        if (document.getElementById('message-modal')) return;
        var wrapper = document.createElement('div');
        wrapper.innerHTML = TEMPLATE;
        document.body.appendChild(wrapper.firstElementChild);
    }

    async function refresh() {
        var u = window.AuthCore && window.AuthCore.auth && window.AuthCore.auth.currentUser;
        state.uid = u ? u.uid : null;
        if (u && window.AuthCore.getAccount) {
            try { state.account = await window.AuthCore.getAccount(u.uid); } catch (e) { state.account = null; }
        }
        // Local first so the dot is correct immediately, then Firestore wins if it answers.
        try {
            var cached = localStorage.getItem(readKey(state.uid));
            if (cached) state.readIds = JSON.parse(cached) || [];
        } catch (e) { state.readIds = state.readIds || []; }
        var receipts = [];
        if (u && window.AuthCore.loadCommsReceipts) {
            receipts = await window.AuthCore.loadCommsReceipts();
            var remote = window.AuthCore.loadCommsRead ? await window.AuthCore.loadCommsRead() : null;
            if (Array.isArray(remote)) {
                remote.forEach(function (id) { if (state.readIds.indexOf(id) === -1) state.readIds.push(id); });
            }
        }
        state.receipts = receipts;
        state.items = buildItems(receipts);
        state.loaded = true;
        renderDot();
    }

    function ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    ready(function () {
        injectModal();
        // Populate the dot without opening anything. Deliberately tolerant: a page where
        // Firebase never resolves shows no dot rather than a wrong one.
        if (window.AuthCore && window.AuthCore.waitForAuthReady) {
            window.AuthCore.waitForAuthReady().then(refresh).catch(function () { renderDot(); });
        } else {
            renderDot();
        }
    });

    window.commsBack = function () { renderList(); };

    window.openComms = async function () {
        // Comms is READABLE by anyone, including a signed-out visitor who gets a guest
        // session on the way in. The old modal gated the whole thing behind the identity
        // gate because the only thing inside it was a send box; now the gate belongs on
        // compose alone, which is where it is.
        if (window.AuthGate && typeof window.AuthGate.startGuestSession === 'function') {
            var u = window.AuthCore && window.AuthCore.auth && window.AuthCore.auth.currentUser;
            if (!u) { try { await window.AuthGate.startGuestSession(); } catch (e) { /* offline — read-only */ } }
        }
        document.dispatchEvent(new CustomEvent('messagehq:opened', { detail: { source: source } }));
        injectModal();
        if (!state.loaded) { try { await refresh(); } catch (e) { /* render what we have */ } }
        // Close any other open modal so only one shows at a time — the shared
        // 'visible-modal' convention every page that ships this already uses.
        document.querySelectorAll('.visible-modal').forEach(function (el) {
            if (el.id !== 'message-modal') {
                el.classList.add('hidden-modal');
                el.classList.remove('visible-modal');
            }
        });
        var modal = document.getElementById('message-modal');
        renderList();
        modal.classList.remove('hidden-modal');
        modal.classList.add('visible-modal');
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeComms = function () {
        var modal = document.getElementById('message-modal');
        if (!modal) return;
        modal.classList.add('hidden-modal');
        modal.classList.remove('visible-modal');
    };

    // Aliases: ten pages call openMessageModal() from a navbar onclick. Keeping them is
    // cheaper and safer than editing ten files to rename a function.
    window.openMessageModal = function () { return window.openComms(); };
    window.closeMessageModal = function () { return window.closeComms(); };
})();
