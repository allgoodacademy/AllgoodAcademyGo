/* THE HELP CENTER'S CONTENT (storyboard: claude/help-center-storyboard-v1.0.md, approved 2026-11-27).
 *
 * One file for every article, tour and shortcut, read by /help/ and by the ? panel on the
 * dashboard (/help/help.js). Edit words here; nothing else needs to change.
 *
 * ARTICLES
 *   id        stable slug: telemetry and deep links (/help/#a/<id>) use it. Never rename one.
 *   who       'teacher' | 'student'
 *   group     the heading it sits under on /help/
 *   title     a "How do I…?" answer, in the words people search with
 *   steps     one sentence each. **Bold** is a button or label exactly as it appears on
 *             screen: scripts/check-help.js fails the build if that text disappears from the
 *             dashboard's source (list a label in `dynamic` when the screen builds it from
 *             parts, e.g. "Assign to these 3").
 *   tip       optional "Good to know" line
 *   tour      optional tour id (TOURS below) -> a "Show me" button
 *   shortcuts optional shortcut ids (SHORTCUTS below) -> "Do it for me" buttons
 *   success   optional success key: the dashboard announces it (ag:track) when the job is
 *             actually done, and help.js records help_success if that happens within
 *             10 minutes of reading this article or touring it. See SUCCESS below.
 *   words     extra search words (what people type that isn't in the title)
 *
 * TOURS: each step rings `target` (a CSS selector on the dashboard) and moves on when the
 * person does the thing: clicks something matching `click`, or `done()` becomes true.
 * `mine: true` marks the step that changes something: the tour rings the button and the
 * person presses it; a tour never presses anything. `check` lists the literal strings the
 * dashboard's source must contain for the step's target to exist (scripts/check-help.js).
 */

export const SUCCESS = {
    // dashboard event name (ag:track detail.name) -> success key
    content_assigned: 'assign',
    class_created: 'class',
    class_deleted: 'class',
    guide_download: 'guide',
    get_pro_click: 'pro',
    save_code_created: 'save',
    save_google: 'save',
    class_joined: 'join',
    save_code_used: 'device',
};

export const GROUPS = {
    teacher: ['Getting started', 'Your class', 'Pro and guides', 'Students and privacy'],
    student: ['Getting started', 'Saving your progress', 'More'],
};

export const ARTICLES = [
    /* ---------- teachers ---------- */
    {
        id: 'first-5-minutes', who: 'teacher', group: 'Getting started', read: '45-second read',
        title: 'Your first 5 minutes: start a class and share the code',
        steps: [
            'Press **Teacher sign in** at the top of the site and sign in with Google or email. The first time, name your class and press **Create my class**. You land on your dashboard.',
            'Your class is at the top of the left menu, with its class code. Press **Copy** to copy the code, or **Show on screen** to put it on the projector.',
            'Students go to allgoodacademy.com/join and type the code. They don\'t need accounts or email.',
            'Open **Lab Packs**, **Games** or **Simulations** and press **Assign** on anything. It turns to **Assigned ✓** and appears on every student\'s dashboard.',
            'Open **Class overview** to see who has joined, who is done and who could use a check-in.',
        ],
        tip: 'Mission Control is the teacher part of the left menu: Class overview, Students, Reports and Teacher guides.',
        tour: 'first5', shortcuts: ['copy-code', 'show-code'], success: 'assign',
        words: 'mission control setup start begin new class code join share projector where is',
    },
    {
        id: 'assign-whole-class', who: 'teacher', group: 'Getting started', read: '30-second read',
        title: 'Assign work to the whole class',
        steps: [
            'Find the lesson, game or simulation in **Lab Packs**, **Games**, **Simulations** or **Español**.',
            'Press **Try it** to play it yourself first, if you like.',
            'Press **Assign**. It turns to **Assigned ✓** and shows on every student\'s dashboard under "Assigned by" your name.',
            'Changed your mind? Press **Assigned ✓** again to take it off.',
            'Planning a whole unit? In **Class overview**, press **Assign several**, tick everything, then **Save assignments**.',
        ],
        tip: 'Students who join later see everything already assigned.',
        shortcuts: ['open-assign-several'], success: 'assign',
        words: 'assign homework give lesson unit several many bulk unassign remove',
        dynamic: ['Save assignments'],
    },
    {
        id: 'assign-group', who: 'teacher', group: 'Your class', read: '30-second read',
        title: 'Assign to one student or a group',
        steps: [
            'Open **Students** in the left menu.',
            'Tick the students who need it. A button appears: **Assign to these** students (or **Assign to this student**).',
            'Tick the work, then press **Save assignments**.',
            'For one student, you can also open their name and press **Assign something just for** them.',
        ],
        tip: 'Their extra work adds to what the whole class has. It doesn\'t replace it, and nobody else\'s list changes.',
        tour: 'group', shortcuts: ['open-students'], success: 'assign',
        words: 'individual one student small group differentiate extra intervention just for',
        dynamic: ['Assign to these', 'Assign to this student', 'Assign something just for', 'Save assignments'],
    },
    {
        id: 'see-where-stuck', who: 'teacher', group: 'Your class', read: '30-second read',
        title: 'See where your class got stuck',
        steps: [
            'Open **Reports** in the left menu and pick the kind of work: lessons, Challenges, games, simulations or Español.',
            'Open an assignment to see how far the class got, step by step, and where they split on a choice.',
            'Each report ends with one thing worth five minutes in class tomorrow.',
            '**Class overview** lists who **Could use a check-in**. Open **Students** and tap a name for that student\'s step-by-step detail.',
        ],
        shortcuts: ['open-reports'],
        words: 'reports data results scores progress drill down analytics stuck struggling check in',
    },
    {
        id: 'more-classes', who: 'teacher', group: 'Your class', read: '30-second read',
        title: 'Run more than one class (switch, rename or delete)',
        steps: [
            'Press your class name at the top of the left menu. The menu lists your classes: pick one to switch.',
            'Choose **+ New class** to add one. More than one class is part of Pro.',
            'Choose **Rename this class** or **Delete this class** for the class you\'re in.',
        ],
        tip: 'Your only class and your first class can\'t be deleted (your first class stays free if Pro ends). Rename them instead. Students in a deleted class keep their own work.',
        success: 'class',
        words: 'section period another second multiple switch rename delete remove class',
        dynamic: ['+ New class'],
    },
    {
        id: 'pro', who: 'teacher', group: 'Pro and guides', read: '30-second read',
        title: 'Pro: what you get and how to pay',
        steps: [
            'Free: 1 class, and Mission Control shows the first 30 students. Every student can still join and play, and everyone\'s progress is saved.',
            'Pro is $49 a year: unlimited classes and students, every facilitator guide, and a CSV export of every choice.',
            'Press the **FREE** label on your class card, then **Get Pro**. Pro turns on by itself once you\'ve paid.',
            'Paying by school invoice or purchase order? Email learning@allgoodacademy.com.',
        ],
        success: 'pro',
        words: 'price cost pay buy upgrade subscription invoice purchase order receipt plan free limit',
    },
    {
        id: 'guides', who: 'teacher', group: 'Pro and guides', read: '20-second read',
        title: 'Download the facilitator guides',
        steps: [
            'Open **Teacher guides** in the left menu.',
            'Press **Download facilitator guide** on any guide.',
            'Free guides download for everyone. Paid guides download with Pro; on the free plan, the button opens the guide on Teachers Pay Teachers.',
        ],
        shortcuts: ['open-guides'], success: 'guide',
        words: 'facilitator guide lesson plan pdf download teachers pay teachers tpt answer key',
    },
    {
        id: 'lost-progress', who: 'teacher', group: 'Students and privacy', read: '30-second read',
        title: 'A student lost their progress',
        steps: [
            'A student\'s progress lives on the device they used, until they save it.',
            'If they saved with a code: on the new device, go to allgoodacademy.com/dashboard, choose **I have a save code** and type it.',
            'If they saved with Google: on the new device, sign in with **Continue with Google**.',
            'If they never saved: their progress is still on the first device. Have them open their dashboard there and choose **Save my progress**.',
        ],
        tip: 'The best fix is ahead of time: ask students to save once, on day one.',
        words: 'lost progress missing gone reset new computer chromebook save code recover',
    },
    {
        id: 'privacy', who: 'teacher', group: 'Students and privacy', read: '30-second read',
        title: 'What you can see about your students, and what you can\'t',
        steps: [
            'You see the name each student chose (a first name or a nickname), what they finished, their scores, and their step-by-step choices on the work in your class.',
            'You see when they were active and for how long.',
            'You don\'t see emails or accounts, because students don\'t have them. You never see another teacher\'s class.',
            'Allgood Academy has no ads, and student data is never sold or shared.',
        ],
        words: 'privacy data ferpa coppa safe what can i see student information parents',
    },

    /* ---------- students ---------- */
    {
        id: 'join', who: 'student', group: 'Getting started', read: '20-second read',
        title: 'Join your class',
        steps: [
            'Go to allgoodacademy.com/join, or find **Join your class** on your dashboard.',
            'Type the class code your teacher gives you.',
            'Use your first name or a nickname. No last names.',
        ],
        tip: 'Joined the wrong class? Ask your teacher for the right code and join again.',
        success: 'join',
        words: 'join class code teacher enter',
    },
    {
        id: 'find-assigned', who: 'student', group: 'Getting started', read: '15-second read',
        title: 'Find what your teacher assigned',
        steps: [
            'Open **Home** on your dashboard.',
            'Look for **Assigned by** your teacher. Everything your teacher gave you is there.',
            'Press one to start. Your place is saved as you go.',
        ],
        words: 'assigned homework teacher todo what do i do where',
        dynamic: ['Assigned by'],
    },
    {
        id: 'save', who: 'student', group: 'Saving your progress', read: '30-second read',
        title: 'Save your progress',
        steps: [
            'Press **Save my progress** in the left menu.',
            'Answer one question about your age. Either answer is fine.',
            'Type your first name or a nickname, then press **Get my save code**.',
            'Take a photo of your code or write it down. Then press **I saved it**.',
        ],
        tip: 'Your save code is the only way to get your progress on a different computer. We can\'t email it to you.',
        tour: 'save', success: 'save',
        words: 'save progress code keep account lose',
        dynamic: ['I saved it'],
    },
    {
        id: 'other-device', who: 'student', group: 'Saving your progress', read: '20-second read',
        title: 'Open your progress on another computer or device',
        steps: [
            'On the new device, go to allgoodacademy.com/dashboard.',
            'Choose **I have a save code** and type your code. It looks like WORD-WORD-WORD-1234.',
            'Saved with Google instead? Press **Continue with Google**.',
        ],
        success: 'device',
        words: 'another new different computer device home chromebook phone tablet login sign in code',
    },
    {
        id: 'sign-out', who: 'student', group: 'Saving your progress', read: '20-second read',
        title: 'Sign out on a shared computer',
        steps: [
            'Press **Sign out** at the bottom of the left menu. On a phone, it\'s in **Profile**.',
            'If you haven\'t saved yet, it asks you to save first. Save, or your progress stays on this computer only.',
        ],
        words: 'sign out log out shared computer leave',
    },
    {
        id: 'badges', who: 'student', group: 'More', read: '15-second read',
        title: 'Earn badges',
        steps: [
            'Open **Home** and scroll to **Badges**.',
            'You earn them by finishing lessons, games, whole Lab Packs and Challenges.',
            'Locked badges show what you need to do to earn them.',
        ],
        words: 'badges awards earn unlock',
    },
    {
        id: 'message-us', who: 'student', group: 'More', read: '15-second read',
        title: 'Send us a message',
        steps: [
            'Press the speech-bubble button at the top of your dashboard, next to your name.',
            'Type your question and send it. We read every message.',
            'Don\'t put your last name, address or phone number in a message.',
        ],
        shortcuts: ['open-comms'],
        words: 'message contact help question bug problem report',
    },
];

/* "On this page": which articles the ? panel shows first, by dashboard view. */
export const ON_VIEW = {
    teacher: {
        home: ['first-5-minutes', 'assign-whole-class', 'see-where-stuck'],
        class: ['assign-whole-class', 'see-where-stuck', 'first-5-minutes'],
        students: ['assign-group', 'lost-progress', 'privacy'],
        reports: ['see-where-stuck', 'assign-group'],
        guides: ['guides', 'pro'],
        packs: ['assign-whole-class', 'first-5-minutes'], games: ['assign-whole-class'], sims: ['assign-whole-class'], espanol: ['assign-whole-class'],
        profile: ['more-classes', 'pro'],
    },
    student: {
        home: ['find-assigned', 'save', 'join'],
        profile: ['save', 'other-device', 'sign-out'],
        packs: ['find-assigned', 'badges'], games: ['find-assigned', 'badges'], sims: ['find-assigned'], espanol: ['find-assigned'],
    },
};

/* "Do it for me": only things that change nothing. Never assign, delete, pay or sign out. */
export const SHORTCUTS = {
    'copy-code': { label: 'Copy my class code', who: 'teacher', click: '#btn-copy-code', check: ['id="btn-copy-code"'] },
    'show-code': { label: 'Show the code on screen', who: 'teacher', click: '#btn-show-screen', check: ['id="btn-show-screen"'] },
    'open-assign-several': { label: 'Open Assign several', who: 'teacher', view: 'class', click: '#btn-assign-several', check: ['id="btn-assign-several"'] },
    'open-students': { label: 'Open Students', who: 'teacher', view: 'students', check: ['data-view="students"'] },
    'open-reports': { label: 'Open Reports', who: 'teacher', view: 'reports', check: ['data-view="reports"'] },
    'open-guides': { label: 'Open Teacher guides', who: 'teacher', view: 'guides', check: ['data-view="guides"'] },
    'open-comms': { label: 'Open the message box', who: 'any', call: 'openMessageModal', check: ['window.openMessageModal'] },
};

export const TOURS = {
    first5: {
        who: 'teacher', article: 'first-5-minutes', title: 'Your first 5 minutes', view: 'home',
        steps: [
            { target: '#btn-copy-code', text: 'This is your class code. Students join with it at allgoodacademy.com/join. Press **Copy** (or **Show on screen** for the projector).', click: ['#btn-copy-code', '#btn-show-screen'], check: ['id="btn-copy-code"', 'id="btn-show-screen"'] },
            { target: 'a.tab[data-view="packs"]', text: 'Now pick something to assign. Open **Lab Packs**.', click: ['a.tab[data-view="packs"]'], check: ['data-view="packs"'] },
            { target: 'section.view[data-view="packs"] [data-assign-card]:not(.on)', text: 'Press **Assign** on any lesson you want your class to do. It turns to **Assigned ✓**. This one\'s yours to press.', click: ['[data-assign-card]'], mine: true, skip: 'Skip: I\'ll assign later', check: ['data-assign-card='] },
            { target: 'a.tab[data-view="class"]', text: 'Last one: **Class overview** is where you\'ll see who joined, who is done and who could use a check-in.', click: ['a.tab[data-view="class"]'], check: ['data-view="class"'] },
        ],
        doneText: 'That\'s it. Students who join with your code will see everything you assigned.',
    },
    group: {
        who: 'teacher', article: 'assign-group', title: 'Assign to a group', view: 'home',
        steps: [
            { target: 'a.tab[data-view="students"]', text: 'Open **Students** in the left menu.', click: ['a.tab[data-view="students"]'], check: ['data-view="students"'] },
            { target: '[data-tick]', text: 'Tick the students who need it.', done: 'ticked', empty: 'No students have joined this class yet. Come back once someone has.', check: ['data-tick='] },
            { target: '#btn-assign-sel', text: 'Press **Assign to these** students.', click: ['#btn-assign-sel'], check: ['id="btn-assign-sel"'] },
            { target: '#pane-assign [data-item]:not([disabled])', text: 'Tick the work they need.', done: 'saveReady', check: ['data-item='] },
            { target: '#btn-save-assign', text: 'Press **Save assignments**. This one\'s yours to press.', click: ['#btn-save-assign'], mine: true, check: ['id="btn-save-assign"'] },
        ],
        doneText: 'Done. Their extra work shows on their dashboards, on top of the whole class\'s.',
    },
    save: {
        who: 'student', article: 'save', title: 'Save your progress', view: 'profile',
        steps: [
            { target: '#rail-save [data-a="save"], #save-card [data-a="save"]', text: 'Press **Save my progress**.', click: ['[data-a="save"]'], already: 'saved', check: ['data-a="save"'] },
            { target: '[data-a="u13"], [data-a="o13"]', text: 'Answer the question. Either answer is fine.', click: ['[data-a="u13"]', '[data-a="o13"]'], check: ['data-a="u13"', 'data-a="o13"'] },
            { target: '#save-name, [data-a="gsave"]', text: 'Type your first name or a nickname, then press **Get my save code**. (Saving with Google? Press **Continue with Google**.)', click: ['[data-a="mkcode"]', '[data-a="gsave"]'], check: ['id="save-name"', 'data-a="mkcode"'] },
            { target: '#big-code', text: 'This is your save code. Take a photo or write it down, then press **I saved it**.', click: ['#saved-it'], mine: true, check: ['id="big-code"', 'id="saved-it"'] },
        ],
        doneText: 'Saved. Your progress is safe, even on a different computer.',
    },
};
