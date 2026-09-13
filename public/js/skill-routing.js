// Shared skill-based routing for the four standalone games.
//
// Every game already computes which of its own categories a student was weakest in.
// What each game USED to do with that number was consult a hardcoded map of two or
// three GoodBlock URLs its author happened to know about at build time — so a game
// could never route to a lab in a different Lab Pack, however well the lab matched.
//
// This module does exactly one thing: given a category string, search EVERY lab entry
// in /data/modules-registry.json for one whose `skillTags` (framework 'internal')
// includes that category, and hand back its url and name.
//
// It deliberately does NOT own message copy. Each game keeps writing its own
// Jodi-voiced text — category-based, behavior-pattern-based, or both — exactly as
// today. Consolidating the writing would flatten four distinct voices into one; only
// the destination lookup is shared.
//
// Usage (games load it as a module and await the resolver once, at end of round):
//
//   <script type="module" src="/js/skill-routing.js"></script>
//   ...
//   const dest = await window.SkillRouting.resolve(worstCategory, {
//       defaultUrl: '/jsh/digital-decisions-lab/privacy-security/',
//       defaultName: 'Privacy & Security',
//   });
//   // dest is ALWAYS a { url, name, matched } object — never null, never a broken
//   // link. `matched` is false when the fallback was used.

const REGISTRY_URL = '/data/modules-registry.json';

let registryPromise = null;

// One fetch per page load, shared by every caller. A failure resolves to an empty
// module list rather than rejecting: a game must never lose its "go deeper" card
// because a static file 404'd, it just falls back to the destination it always had.
function loadRegistry() {
    if (!registryPromise) {
        registryPromise = fetch(REGISTRY_URL, { cache: 'no-cache' })
            .then((r) => {
                if (!r.ok) throw new Error(`registry HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => (Array.isArray(data && data.modules) ? data.modules : []))
            .catch((e) => {
                console.warn('[SkillRouting] could not load the module registry — games fall back to their own default destination', e);
                return [];
            });
    }
    return registryPromise;
}

// A game's categories are authored in whatever form reads best in that game's own
// scenario data — Read the Signal uses slugs ('safe-recognition'), Money Moves uses
// display strings ('Predatory Offer'). The registry's routing vocabulary is slugs, so
// normalize here rather than making every game rewrite its scenario bank.
function normalize(category) {
    return String(category == null ? '' : category)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function internalCodes(entry) {
    return (entry.skillTags || [])
        .filter((t) => t && t.framework === 'internal')
        .map((t) => normalize(t.code));
}

/* Resolve a category to a GoodBlock destination.
 *
 * @param {string} category            the game's own weakest-category string, or null
 * @param {object} opts
 * @param {string} opts.defaultUrl     the destination this game used before this module
 *                                     existed — used as the fallback AND as the pack
 *                                     tie-break below. Required.
 * @param {string} [opts.defaultName]  display name for the fallback destination.
 * @returns {Promise<{url: string, name: string|null, matched: boolean}>}
 */
async function resolve(category, opts = {}) {
    const fallback = {
        url: opts.defaultUrl,
        name: opts.defaultName || null,
        matched: false,
    };
    const code = normalize(category);
    if (!code || !opts.defaultUrl) return fallback;

    const modules = await loadRegistry();
    const matches = modules.filter((m) => m.type === 'lab' && m.url && internalCodes(m).includes(code));
    if (!matches.length) return fallback;

    // Tie-break, in order:
    //   1. the game's own existing default destination, if it matches — this is what
    //      keeps Read the Signal's and Money Moves' routing byte-for-byte unchanged;
    //   2. any lab in the same Lab Pack as that default, so a tie resolves toward the
    //      pack the game already pointed into;
    //   3. first match in registry order, which is how a game reaches a lab in a pack
    //      its original hardcoded logic never knew about.
    const exact = matches.find((m) => m.url === opts.defaultUrl);
    if (exact) return { url: exact.url, name: exact.name, matched: true };

    const defaultEntry = modules.find((m) => m.url === opts.defaultUrl);
    const samePack = defaultEntry && defaultEntry.pack
        ? matches.find((m) => m.pack === defaultEntry.pack)
        : null;
    const picked = samePack || matches[0];
    return { url: picked.url, name: picked.name, matched: true };
}

// Games use the global (they are classic scripts, not modules); the guard is for
// tests/skill-routing.test.mjs, which imports this file directly in Node with a
// filesystem-backed fetch so the regression checks below run without a browser.
if (typeof window !== 'undefined') {
    window.SkillRouting = { resolve, loadRegistry, normalize, REGISTRY_URL };
}

export { resolve, loadRegistry, normalize, REGISTRY_URL };
