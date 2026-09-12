// Shared Allgood / Jodi's Schoolhouse / Real World Ready theme.
//
// These values were previously duplicated in an inline `tailwind.config = {...}`
// block on every page, back when each page pulled cdn.tailwindcss.com at runtime.
// That CDN is a dev-only shim and district content filters block it, so the
// bundles in public/assets/css/ are built locally instead — and this file is now
// the single definition those builds share.
module.exports = {
    colors: {
        // Allgood Academy brand.
        'allgood-primary': '#D34716',
        'allgood-secondary': '#357889',
        'allgood-dark': '#4C4C4C',
        'allgood-light': '#F7F7F7',
        'allgood-hover': '#EB8D69',
        'allgood-accent': '#2D6473',
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
        'rwr-accent-dark': '#A8620E',
    },
    fontFamily: {
        heading: ['Georgia', 'serif'],
        body: ['Verdana', 'sans-serif'],
    },
};
