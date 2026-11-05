// public/assets/css/tailwind.min.css — the site-wide bundle: dashboard, marketing
// pages, Mission Control, the Lab Pack hubs and the Real World Ready GoodBlocks.
// Client buy sheets in public/AllgoodOS_* are self-contained (their own CSS) and served
// verbatim, so they are left out: their class names must not change the site bundle.
module.exports = require('./shared')(['public/**/*.html', '!public/AllgoodOS_*/**']);
