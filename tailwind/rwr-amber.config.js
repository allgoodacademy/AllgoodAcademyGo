// public/assets/css/tailwind.rwr-amber.min.css — shared by every Real World Ready
// GoodBlock. Per the founder decision recorded in
// docs/goodblocks/real-world-ready-coverage-map.md (Q2), the whole Lab Pack shares
// one amber accent and differentiates by Lucide icon instead, so gb-accent here is
// the same triplet as the shared rwr-accent-* rather than a per-GoodBlock colour.
module.exports = require('./shared')(['public/jsh/real-world-ready-lab/**/*.html'], {
    DEFAULT: '#C97D1A',
    light: '#FEF3DC',
    dark: '#A8620E',
});
