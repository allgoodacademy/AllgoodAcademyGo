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
 * @returns {Promise<{url, name, matched, reason, category, matchedId, matchedPack, tagStatus}>}
 *
 * `reason` says WHICH PATH produced the destination, so a routing decision can be checked
 * after the fact instead of guessed at from the URL. Before You Send can reach Professional
 * Brand down two completely different roads — an over-cautious delete count, or a
 * `self-advocacy` category match — and the URL alone cannot tell them apart. Games write
 * this into their session telemetry as `routingReason`.
 *   'category-match'   — a lab in the registry carries this category
 *   'no-match'         — the category resolved to nothing; caller's default used
 *   'no-category'      — no category was passed (nothing weak enough to act on)
 */
async function resolve(category, opts = {}) {
    const code = normalize(category);
    const fallback = {
        url: opts.defaultUrl,
        name: opts.defaultName || null,
        matched: false,
        reason: code ? 'no-match' : 'no-category',
        category: code || null,
        matchedId: null,
        matchedPack: null,
        tagStatus: null,
    };
    if (!code || !opts.defaultUrl) return fallback;

    const modules = await loadRegistry();
    const matches = modules.filter((m) => m.type === 'lab' && m.url && internalCodes(m).includes(code));
    if (!matches.length) return fallback;

    // Tie-break, in order:
    //   1. SPECIALIZATION — the lab with the fewest skillTags overall. A GoodBlock built
    //      narrowly around two or three skills is a better destination for a match than one
    //      that happens to cover this skill as one of eight. This rule replaced "prefer the
    //      calling game's own default", which was harmless only while overlaps were rare:
    //      once Social Intelligence was correctly tagged with `self-advocacy`,
    //      `audience-choice` and `escalation-language`, being Before You Send's own default
    //      made it win every one of those ties and swallow the more specific homes for them
    //      (Professional Brand, Where You Say It, Conflict Has a Winner). Correctly tagging a
    //      second GoodBlock for a skill must BROADEN routing, never hijack it.
    //   2. the game's own existing default destination, if it matches and the counts tie —
    //      this is what keeps Read the Signal's and Money Moves' routing unchanged;
    //   3. any lab in the same Lab Pack as that default, so a tie resolves toward the
    //      pack the game already pointed into;
    //   4. first match in registry order, which is how a game reaches a lab in a pack
    //      its original hardcoded logic never knew about.
    //
    // Counting ALL skillTags, not just the internal ones, is deliberate: breadth of claimed
    // coverage is the thing being measured, and the framework tags are part of that claim.
    const breadth = (m) => (m.skillTags || []).length;
    const narrowest = Math.min(...matches.map(breadth));
    const shortlist = matches.filter((m) => breadth(m) === narrowest);

    let picked = shortlist.find((m) => m.url === opts.defaultUrl);
    if (!picked) {
        const defaultEntry = modules.find((m) => m.url === opts.defaultUrl);
        const samePack = defaultEntry && defaultEntry.pack
            ? shortlist.find((m) => m.pack === defaultEntry.pack)
            : null;
        picked = samePack || shortlist[0];
    }
    const tag = (picked.skillTags || []).find((t) => t.framework === 'internal' && normalize(t.code) === code);
    return {
        url: picked.url,
        name: picked.name,
        matched: true,
        reason: 'category-match',
        category: code,
        matchedId: picked.id,
        matchedPack: picked.pack || null,
        // A draft tag is an unreviewed routing decision. Carrying it into telemetry is how
        // anyone auditing a destination later can tell a proven route from a proposed one.
        tagStatus: (tag && tag.status) || 'reviewed',
    };
}

// Games use the global (they are classic scripts, not modules); the guard is for
// tests/skill-routing.test.mjs, which imports this file directly in Node with a
// filesystem-backed fetch so the regression checks below run without a browser.
if (typeof window !== 'undefined') {
    window.SkillRouting = { resolve, loadRegistry, normalize, REGISTRY_URL };
}

export { resolve, loadRegistry, normalize, REGISTRY_URL };
