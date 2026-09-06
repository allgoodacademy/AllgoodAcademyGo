// MESSAGE HQ ("Direct Line") — shared, standardized version of the feedback-inbox
// feature. Previously this button/modal/handler was copy-pasted independently into
// five separate module files (main dashboard, Lab Pack hub, Social Intelligence,
// Digital Decisions Challenge, Jolene's Lemonade Challenge), which is how Privacy &
// Security ended up shipping with no Message HQ at all — nobody copied it forward.
//
// Usage: one script tag, nothing else.
//   <script src="/js/message-hq.js" data-message-source="Jodi's Schoolhouse: <Module Name>"></script>
// Load it after auth-core.js. Any navbar/menu button just needs
// onclick="window.openMessageModal()" — the button markup itself still lives in each
// page since navbar layout/theming differs per module, but the modal, its contents,
// and the send logic (capturing the signed-in user's identity + which module sent it)
// are all defined here, once, so every module behaves identically and a fix here
// reaches every module without touching them individually.
(function () {
    var scriptEl = document.currentScript;
    var source = (scriptEl && scriptEl.dataset.messageSource) || document.title || 'Unknown portal';

    function injectModal() {
        if (document.getElementById('message-modal')) return;
        var wrapper = document.createElement('div');
        wrapper.innerHTML =
            '<div id="message-modal" class="hidden-modal fixed inset-0 z-[9999] bg-allgood-dark/90 flex items-center justify-center p-6 modal-transition backdrop-blur-sm" onclick="window.closeMessageModal()">' +
                '<div class="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full text-center border-t-4 border-allgood-primary relative" onclick="event.stopPropagation()">' +
                    '<button onclick="window.closeMessageModal()" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"><i data-lucide="x" class="w-5 h-5"></i></button>' +
                    '<div class="mb-4">' +
                        '<div class="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">' +
                            '<i data-lucide="message-circle" class="w-6 h-6 text-allgood-primary"></i>' +
                        '</div>' +
                        '<h3 class="text-xl font-heading font-bold text-allgood-dark uppercase">Direct Line</h3>' +
                        '<p class="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">To: Allgood Academy HQ</p>' +
                    '</div>' +
                    '<div class="text-left mb-4">' +
                        '<p class="text-xs text-gray-500 italic mb-2">Agent, this is your direct line. Find a bug, disagree with something, or have a thought? Drop it here.</p>' +
                        '<textarea id="message-input" rows="4" class="w-full border border-gray-300 rounded p-3 text-sm focus:ring-1 focus:ring-allgood-primary focus:border-allgood-primary outline-none resize-none bg-gray-50 font-body placeholder-gray-400" placeholder="Type your message here..."></textarea>' +
                    '</div>' +
                    '<button id="btn-send-message" onclick="window.submitHQMessage()" class="w-full bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded text-xs shadow-md transition-all transform active:scale-95 uppercase tracking-wide flex items-center justify-center gap-2">' +
                        '<i data-lucide="send" class="w-3 h-3"></i> Send Transmission' +
                    '</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(wrapper.firstElementChild);
        if (window.lucide) window.lucide.createIcons();
    }

    function ready(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    ready(injectModal);

    window.openMessageModal = async function () {
        // Gate on identity before opening, not just at submit, if this page has the
        // identity gate loaded (it does everywhere this ships) — a signed-out visitor
        // sees the sign-in flow immediately instead of typing a message first and only
        // then discovering it can't send.
        if (window.AuthGate && typeof window.AuthGate.ensureIdentified === 'function') {
            const { user } = await window.AuthGate.ensureIdentified();
            if (!user) return;
        }
        injectModal();
        // Close any other open modal on the page (system menu, case menu, etc.) so
        // only one shows at a time — the page's own modals just need a shared
        // 'visible-modal' convention, already used everywhere this ships.
        document.querySelectorAll('.visible-modal').forEach(function (el) {
            if (el.id !== 'message-modal') {
                el.classList.add('hidden-modal');
                el.classList.remove('visible-modal');
            }
        });
        var modal = document.getElementById('message-modal');
        modal.classList.remove('hidden-modal');
        modal.classList.add('visible-modal');
        if (window.lucide) window.lucide.createIcons();
        setTimeout(function () {
            var input = document.getElementById('message-input');
            if (input) input.focus();
        }, 100);
    };

    window.closeMessageModal = function () {
        var modal = document.getElementById('message-modal');
        if (!modal) return;
        modal.classList.add('hidden-modal');
        modal.classList.remove('visible-modal');
    };

    window.submitHQMessage = async function () {
        var input = document.getElementById('message-input');
        var text = input.value.trim();
        var btn = document.getElementById('btn-send-message');
        if (!text) return;

        var user = window.AuthCore && window.AuthCore.auth && window.AuthCore.auth.currentUser;
        if (!user) {
            var noAuthText = btn.innerHTML;
            btn.textContent = 'Please Sign In First';
            setTimeout(function () {
                btn.innerHTML = noAuthText;
                if (window.lucide) window.lucide.createIcons();
            }, 2000);
            return;
        }

        var originalText = btn.innerHTML;
        btn.disabled = true;
        btn.textContent = 'Sending...';
        try {
            await window.AuthCore.sendMessage({ text: text, source: source });
            document.dispatchEvent(new CustomEvent('messagehq:sent', { detail: { source: source } }));
            if (window.sfx && window.sfx.success) window.sfx.success();
            input.value = '';
            btn.classList.remove('bg-allgood-primary', 'hover:bg-allgood-hover');
            btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
            btn.innerHTML = '<i data-lucide="check" class="w-3 h-3"></i> Transmission Sent';
            if (window.lucide) window.lucide.createIcons();
            setTimeout(function () {
                window.closeMessageModal();
                setTimeout(function () {
                    btn.disabled = false;
                    btn.classList.add('bg-allgood-primary', 'hover:bg-allgood-hover');
                    btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
                    btn.innerHTML = originalText;
                    if (window.lucide) window.lucide.createIcons();
                }, 500);
            }, 1500);
        } catch (e) {
            console.error('[MessageHQ] Message send failed', e);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };
})();
