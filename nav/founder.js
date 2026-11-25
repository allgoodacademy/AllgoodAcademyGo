'use strict';

// The founder's job line, in ONE place. scripts/build-founder.js writes the sentences
// below into the homepage's "Who's behind this" strip and the About page's "who I am"
// line; `npm run check:founder` fails CI when a page no longer matches.
//
// WHY THE EMPLOYER IS NOT NAMED (founder decision, 2026-11-24): William's day job is
// Director of Instructional Design at a national education nonprofit. Naming that employer
// on Allgood Academy's own pages is a different act from disclosing the side project to
// them — most large employers' outside-activity and brand policies restrict using their
// name to promote a separate venture, because it can read as an endorsement. The founder
// is checking the policy first. Until it is cleared, the employer is described, never
// named, anywhere on the site (scripts/check-invariants.js, "founder-employer", enforces
// that). If it is cleared: change EMPLOYER below, set SHOW_DISCLAIMER to true, run
// `npm run build:founder`, and remove the invariant in the same commit.
const EMPLOYER = 'a national education nonprofit';
const SHOW_DISCLAIMER = false;

// Homepage strip: three sentences. The last one deliberately echoes the hero headline.
const STORY = `I'm William. I started in the classroom, moved into instructional design for software companies, and now lead instructional design at ${EMPLOYER}. Allgood Academy is what I wish my students had: lessons that show what happens, instead of telling them what not to do.`;

// About page: the "who I am" line under the founder note.
const WHO = `Before Allgood Academy, I was a classroom teacher, then an instructional designer for software companies. Today I lead instructional design at ${EMPLOYER}, and I build Allgood Academy on the side.`;

// Shown only once the employer is named (About page, per the board's call).
const DISCLAIMER = `Allgood Academy is an independent project and isn't affiliated with or endorsed by ${EMPLOYER}.`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const REGIONS = {
    story: () => `<p class="founder-body">${esc(STORY)}</p>`,
    who: () => `<p class="who">${esc(WHO)}</p>${SHOW_DISCLAIMER ? `\n<p class="founder-disc">${esc(DISCLAIMER)}</p>` : ''}`,
};

const PAGES = [
    { file: 'public/index.html', region: 'story' },
    { file: 'public/about/index.html', region: 'who' },
];

const begin = (region) => `<!-- BEGIN GENERATED FOUNDER ${region.toUpperCase()} (nav/founder.js; npm run build:founder) -->`;
const end = (region) => `<!-- END GENERATED FOUNDER ${region.toUpperCase()} -->`;

function render(region) {
    return `${begin(region)}\n${REGIONS[region]()}\n${end(region)}`;
}

module.exports = { EMPLOYER, STORY, WHO, PAGES, begin, end, render };
