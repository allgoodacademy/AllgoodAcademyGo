// The one-time "Save your progress?" offer after a student finishes their FIRST lesson
// (2026-11-24, student save). The only place outside the dashboard that mentions saving.
//
// Loaded lazily by telemetry.js when a module calls Telemetry.complete(), so no lesson page
// carries any code for it and nothing is shown before or during content. Rules:
//   - first finished lesson or Challenge only (registry type lab | challenge), never a game
//     or a simulation, never Pattern Lab (telemetry does not load this for its stream);
//   - anonymous, unsaved students only;
//   - shown ONCE per device: the flag is set the moment it appears, so it never reappears,
//     dismissed or not;
//   - a small card pinned to the TOP of the screen, so it can never cover or block the
//     Continue / Next button a completion screen puts at the bottom. It is not a modal:
//     nothing behind it is blocked, and it dismisses with ×, Escape or "Not now".
// It links to /dashboard/#save, where the student chooses how to save. It collects nothing.
// Colors are the design tokens: every page that calls Telemetry.complete() loads
// /assets/css/design-tokens.css.

const SEEN_KEY = 'ag_save_offer_seen';

function seen() {
    try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return true; } // storage blocked: never nag
}

export async function maybeOffer({ module: moduleId, gameName } = {}) {
    if (seen()) return;
    const core = window.AuthCore;
    const user = core && core.auth && core.auth.currentUser;
    if (!user || !user.isAnonymous) return;
    let type = null;
    try {
        const reg = await fetch('/data/modules-registry.json').then((r) => r.json());
        // By registry id, or by gameName for a module whose telemetry id differs (the Digital
        // Decisions Challenge reports as 'digital-decisions'; its registry id is 'ddc').
        const m = (reg.modules || []).find((x) => x.id === moduleId)
            || (reg.modules || []).find((x) => gameName && (x.gameNames || []).includes(gameName));
        type = m ? m.type : null;
    } catch (e) { return; }
    if (type !== 'lab' && type !== 'challenge') return;
    if (seen()) return;
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { return; }
    // Let the completion screen paint first.
    setTimeout(show, 1200);
}

function show() {
    const box = document.createElement('div');
    box.id = 'ag-save-offer';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Save your progress');
    box.innerHTML = `
      <style>
        #ag-save-offer{position:fixed;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:2147483000;
          width:min(460px,calc(100vw - 20px));background:var(--color-surface);color:var(--color-ink);border:1.5px solid var(--color-orange);border-radius:14px;
          box-shadow:0 18px 40px -18px rgba(23,39,44,.55);padding:12px 44px 12px 14px;font:14px/1.45 Verdana,Geneva,sans-serif}
        #ag-save-offer b{display:block;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:400;margin:0 0 2px}
        #ag-save-offer p{margin:0 0 8px;color:var(--color-ink-soft);font-size:13px}
        #ag-save-offer .r{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
        #ag-save-offer a{display:inline-block;background:var(--color-orange);color:#fff;font-weight:700;text-decoration:none;border-radius:999px;padding:7px 14px;font-size:13px}
        #ag-save-offer a:hover{background:var(--color-orange-deep)}
        #ag-save-offer .no{background:none;border:0;padding:0;font:inherit;font-size:13px;font-weight:700;color:var(--color-teal-deep);text-decoration:underline;cursor:pointer}
        #ag-save-offer .x{position:absolute;top:6px;right:6px;width:34px;height:34px;border:0;border-radius:50%;background:var(--color-teal-wash);color:var(--color-teal-deep);font-size:19px;line-height:1;cursor:pointer}
        #ag-save-offer :focus-visible{outline:3px solid var(--color-orange);outline-offset:2px}
      </style>
      <button class="x" type="button" aria-label="Close">&times;</button>
      <b>Nice work. Save your progress?</b>
      <p>Right now it lives on this device only. Save it from your dashboard and it follows you anywhere.</p>
      <div class="r"><a href="/dashboard/#save">Save my progress</a><button class="no" type="button">Not now</button></div>`;
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    box.querySelector('.x').addEventListener('click', close);
    box.querySelector('.no').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
}
