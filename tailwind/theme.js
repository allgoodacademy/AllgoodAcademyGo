// Shared Allgood / Jodi's Schoolhouse / Real World Ready theme.
//
// These values were previously duplicated in an inline `tailwind.config = {...}`
// block on every page, back when each page pulled cdn.tailwindcss.com at runtime.
// That CDN is a dev-only shim and district content filters block it, so the
// bundles in public/assets/css/ are built locally instead — and this file is now
// the single definition those builds share.
//
// Its counterpart is public/assets/css/design-tokens.css, which carries the same
// brand values as CSS custom properties for hand-written CSS inside a page's
// <style> block — the one place a Tailwind utility class cannot reach. The two
// files must agree: change a shared value here and change it there in the same
// commit. design-tokens.css names the theme.js key beside each shared value.
module.exports = {
    colors: {
        // Allgood Academy brand. The orange was nudged from #D34716 to #CF4616 on
        // 2026-11-25 (AA-1) so white button labels pass WCAG AA (4.62:1, was 4.48:1).
        'allgood-primary': '#CF4616',
        'allgood-secondary': '#357889',
        'allgood-dark': '#4C4C4C',
        'allgood-light': '#F7F7F7',
        'allgood-hover': '#EB8D69',
        'allgood-accent': '#2D6473',
        // Small orange TEXT on light tints (orange-50, gray-50): the primary is 4.3-4.4:1
        // there, this is 5.4:1+. Mirrors --color-orange-deep. Added 2026-11-27 (AA-6).
        'allgood-primary-deep': '#B23A0F',
        // Secondary text that still passes AA: 4.6-5.3:1 on the canvas, white and
        // cream. Replaces Tailwind's text-gray-400 (#9CA3AF, 2.54:1 on white).
        'ink-soft': '#5C6E75',
        // Jodi's Schoolhouse surfaces.
        'jodi-warmth': '#FBF6EE',
        'jodi-border': '#E8DFCE',
        'school-wood': '#8B5A2B',
        'school-desk': '#E3C195',
        // Real World Ready Lab Pack. The founder decided the whole Lab Pack shares
        // one amber accent rather than one accent per GoodBlock, so this triplet is
        // shared theme rather than a per-GoodBlock gb-accent-* (see
        // docs/goodblocks/real-world-ready-coverage-map.md, Q2).
        'rwr-accent': '#C97D1A',
        'rwr-accent-light': '#FEF3DC',
        // -dark is the text shade. Darkened from #A8620E on 2026-11-27 (AA-6): small text
        // on the -light tint was 4.32:1; now 4.63:1 there and 5.09:1 on white.
        'rwr-accent-dark': '#A15E0D',
        // Room to Think Lab Pack. Same structure and same reasoning as the Real World
        // Ready triplet above: one Lab-Pack accent, four Lucide icons, so this is shared
        // theme rather than a per-GoodBlock gb-accent-*.
        'rtt-accent': '#9B3B5A',
        'rtt-accent-light': '#FBEAF0',
        'rtt-accent-dark': '#7A2B45',
    },
    // Fallback chains match --font-display / --font-ui in
    // public/assets/css/design-tokens.css; check-tokens.js enforces that.
    // Gelasio and Atkinson Hyperlegible Next are self-hosted (public/assets/css/fonts.css);
    // the "Fallback" names are metric-matched faces defined there: Georgia/Verdana-based
    // for Mac/Windows/iPad, Tinos/Arimo-based for Chromebooks (AA-6).
    fontFamily: {
        heading: ['Gelasio', 'Gelasio Fallback', 'Georgia', 'Gelasio Chromebook Fallback', 'Times New Roman', 'serif'],
        body: ['Atkinson Hyperlegible Next', 'Atkinson Fallback', 'Verdana', 'Atkinson Chromebook Fallback', 'Geneva', 'sans-serif'],
    },
};
