// MISSION CONTROL PRO — every number and link the founder may want to change, in one file.
//
// Change a value here and push; nothing else needs editing. The two limits are mirrored in
// exactly one other place each, and both are stated below so the pair cannot drift silently:
//   - FREE_CLASS_LIMIT is enforced in firestore.rules (#5 / #14: the free-class marker). The
//     rules allow exactly one class on the free plan; raising this number here alone would
//     change the page's wording, not what the rules permit.
//   - FREE_STUDENT_LIMIT is page-level BY DESIGN: joining is never refused and every
//     student's progress is recorded whatever the plan. The free plan only changes how many
//     students Mission Control shows (the first N by join time).

export const FREE_CLASS_LIMIT = 1;
export const FREE_STUDENT_LIMIT = 30;   // The board floated 17; see the storyboard. One line to change.

export const PRO_PRICE_LABEL = '$49/year';
// The LIVE Stripe Payment Link (founder, 2026-11-25). "Get Pro" opens it in a new tab with
// two query parameters added by the page, so a payment can be matched to the teacher in
// Insider: prefilled_email (their sign-in email, when they have one) and
// client_reference_id (their uid). Pro is then turned on by hand in Insider. Set this to ''
// and "Get Pro" becomes "Email us to get Pro" with the mailto below. Never build card fields
// into this page.
export const PRO_CHECKOUT_URL = 'https://buy.stripe.com/6oUaEZafNdV1alkfZN2go00';
export const PRO_CONTACT_EMAIL = 'learning@allgoodacademy.com';

/* THE TEACHER GUIDES TAB. One line per guide.
 *   kind         'Lab Pack' | 'Simulation' — the small label above the title
 *   tpt          'FREE', a price like '$4.95', or null when the guide is not on TPT yet
 *   tptUrl       its Teachers Pay Teachers listing (opens in a new tab)
 *   storagePath  for a PAID guide: where the PDF lives in Firebase Storage. Readable only by
 *                a Pro teacher (storage.rules). The founder uploads each file there from the
 *                Firebase console; until it exists, a Pro teacher sees "Coming soon".
 *   teacherSheet a Lab Pack's free one-page teacher sheet on allgoodacademy.com
 */
export const GUIDES = [
    { id: 'digital-decisions', kind: 'Lab Pack', title: 'Digital Decisions', sub: '4 lessons + the Challenge',
      tpt: 'FREE', tptUrl: 'https://www.teacherspayteachers.com/Product/Digital-Decisions-Lab-Pack-Free-Interactive-Digital-Citizenship-Unit-6-12-14345001',
      storagePath: null, teacherSheet: '/for-teachers/digital-decisions-teacher-sheet/' },
    { id: 'real-world-ready', kind: 'Lab Pack', title: 'Real World Ready', sub: '3 lessons + the Challenge',
      tpt: '$4.95', tptUrl: 'https://www.teacherspayteachers.com/Product/Real-World-Ready-Facilitation-Guide-SEL-Money-Conflict-Perspective-Grades-17667976',
      storagePath: 'facilitator-guides/real-world-ready.pdf', teacherSheet: '/for-teachers/real-world-ready-teacher-sheet/' },
    { id: 'room-to-think', kind: 'Lab Pack', title: 'Room to Think', sub: '4 lessons + the Challenge',
      tpt: null, tptUrl: null,
      storagePath: null, teacherSheet: '/for-teachers/room-to-think-teacher-sheet/' },
    { id: 'water-cycle', kind: 'Simulation', title: 'Where Rain Comes From', sub: 'Water cycle and rain shadow',
      tpt: 'FREE', tptUrl: 'https://www.teacherspayteachers.com/Product/Water-Cycle-Rain-Shadow-Simulation-Free-Facilitator-Guide-Lesson-Plan-18500441',
      storagePath: null },
    { id: 'snowball', kind: 'Simulation', title: 'The Snowball', sub: 'Compound interest and saving',
      tpt: '$2.99', tptUrl: 'https://www.teacherspayteachers.com/Product/Compound-Interest-Simulation-Lesson-Plan-Saving-Financial-Literacy-18500508',
      storagePath: 'facilitator-guides/the-snowball.pdf' },
    { id: 'seasons', kind: 'Simulation', title: 'Reasons for the Seasons', sub: "Earth's tilt · MS-ESS1-1",
      tpt: '$2.99', tptUrl: 'https://www.teacherspayteachers.com/Product/Seasons-Simulation-Lesson-Plan-Earths-Tilt-Facilitator-Guide-MS-ESS1-1-18500462',
      storagePath: 'facilitator-guides/reasons-for-the-seasons.pdf' },
    { id: 'wolves-and-deer', kind: 'Simulation', title: 'Wolves & Deer', sub: 'Predator and prey · MS-LS2-2',
      tpt: '$2.99', tptUrl: 'https://www.teacherspayteachers.com/Product/Predator-Prey-Simulation-Lesson-Plan-Wolves-Deer-MS-LS2-2-Guide-18500493',
      storagePath: 'facilitator-guides/wolves-and-deer.pdf' },
];

// Shown under the grid on the free plan only.
export const GUIDE_BUNDLE = {
    title: 'Simulation guides bundle (Seasons, Wolves & Deer, The Snowball)',
    tpt: '$6.99',
    tptUrl: 'https://www.teacherspayteachers.com/Product/Simulation-Facilitator-Guides-Bundle-Seasons-Predator-Prey-Compound-Interest-18500658',
};
