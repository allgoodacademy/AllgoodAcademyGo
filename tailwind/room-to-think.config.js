// public/assets/css/tailwind.room-to-think.min.css — shared by every Room to Think
// GoodBlock. Follows tailwind/rwr-amber.config.js exactly: per the founder decision
// recorded in docs/goodblocks/real-world-ready-coverage-map.md (Q2), a Lab Pack shares
// one accent and differentiates by Lucide icon instead, so gb-accent here is the same
// wine triplet as the shared rtt-accent-* rather than a per-GoodBlock colour.
module.exports = require('./shared')(['public/jsh/room-to-think-lab/**/*.html'], {
    DEFAULT: '#9B3B5A',
    light: '#FBEAF0',
    dark: '#7A2B45',
});
