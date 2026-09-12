const theme = require('./theme');

// Every bundle scans public/js/**/*.js as well as its own markup.
//
// It did not always. The bundles were originally built by scanning .html only,
// which silently dropped every utility that appears exclusively inside a JS
// string — and the two shared UI modules (identity-gate.js, message-hq.js) build
// their entire modal markup that way. `z-[9999]` lives nowhere but those two
// files, so it compiled into no bundle at all and both modals rendered at
// `z-index:auto`, underneath the dashboard's .screen-container (z-index:1,
// overflow:hidden). That is the bug this glob exists to prevent.
//
// The modals also set their critical positioning inline, belt-and-braces, so a
// stale bundle cannot hide them again. Keep both.
const CONTENT_JS = 'public/js/**/*.js';

/**
 * Build a Tailwind config for one bundle.
 *
 * @param {string[]} content  Markup globs for this bundle, JS is added for free.
 * @param {object}  [accent]  Optional per-GoodBlock gb-accent-* triplet.
 */
module.exports = function config(content, accent) {
    return {
        content: [...content, CONTENT_JS],
        theme: {
            extend: {
                colors: { ...theme.colors, ...(accent ? { 'gb-accent': accent } : {}) },
                fontFamily: theme.fontFamily,
            },
        },
    };
};
