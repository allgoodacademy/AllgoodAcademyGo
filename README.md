# Allgood Academy — Go

Static site for [allgoodacademy.com](https://www.allgoodacademy.com), deployed via Firebase Hosting.
Each page is a standalone HTML file (Tailwind + vanilla JS + Firebase Auth/Firestore). Pages are
served exactly as committed — the two generators in `scripts/` (`build:css`, `build:nav`) write
their output into the repo, so there is no build step between a commit and the deploy.

Mirrors the local `Allgood_OS_Host` Firebase Hosting folder, plus `insider/` (not part of the
original local folder, added separately).

## Who signs in (identity model, 2026-11-23)

- **Students never sign in and never make an account.** Every page calls
  `AuthCore.startSession()` (`public/js/auth-core.js`) on load: a silent anonymous Firebase
  session, no screen, no question. Progress lives in that session on that device.
- **A student joins a class** at `/join/` with the teacher's class code and a nickname
  (`public/js/classroom-join.js`). Nothing else is asked.
- **Teachers are the only people who sign in**, with Google or with an email and password,
  from "Teacher sign in" in the site nav, which goes to `/mission-control/`. A new teacher accepts the consent notice
  once and creates their class there.
- **Students from before the reset** (Recruit Codes, 13+ Google or email/password accounts)
  use "Have an old code? Get your progress back" on `/dashboard/` until **2027-06-30**. It
  copies their old progress into their anonymous session. Delete the `LEGACY RESTORE` section
  of `auth-core.js`, the restore panel on the dashboard and rule #9's `get` after that date.
- `npm run check:invariants` (`[no-gate]`) fails a build that brings back a pre-play screen, the
  deleted `identity-gate.js`, or a student sign-in path.

## Structure

```
public/
  index.html                                     # Marketing landing page — zero third-party requests on the render path
  for-teachers/index.html                        # Marketing: teacher-facing page
  about/index.html                               # Marketing: about + contact
  dashboard/index.html                           # The student dashboard: every lesson, Challenge, game and simulation, with this device's progress (no sign-in)
  join/index.html                                # Join a class: class code + nickname
  mission-control/index.html                     # Teacher sign in (Google) and the teacher's class view
  insider/index.html                             # Insider (owner BI dashboard: users, courses, classrooms, inbox, tools)
  js/telemetry.js                                # Shared learning-analytics telemetry (sessions + events) — see docs/insider-analytics.md
  educational-games/                              # conflict-resolution, digital-decisions,
                                                    # jolenes-lemonade-challenge, master-your-story,
                                                    # purposeful-communicator
  goodblocks/                                      # aico-pilot, airport-navigator, cogat-logic-lab,
                                                    # cogat-verbal-practice, digital-asset-defense,
                                                    # testing, your-digital-identity
  jsh/                                             # finding-yourself, rage-revenue
  simulations/                                     # Simulations hub (cards from data/simulations.json) + watercycle/, seasons/, wolves-and-deer/, snowball/
  404.html, privacy.html, terms.html, favicon.png
```

Firebase Hosting project: `allgood-academy` (see `.firebaserc`) — this is the same project
already serving `allgoodacademy.com` and `www.allgoodacademy.com`, currently updated by manual
`firebase deploy` runs. Connecting this repo's GitHub integration to it replaces those manual
deploys with auto-deploy on push to `main`.

## The site nav

The top bar on `/`, `/about/`, `/for-teachers/`, `/educational-games/`, `/privacy.html` and
`/terms.html` is generated from one definition:

```
nav/nav.js            # the link set, the CTA, the session script, and the two skins
scripts/build-nav.js  # writes it into each page; --check fails CI when a page drifts
```

**Edit `nav/nav.js`, then run `npm run build:nav`.** Never hand-edit the nav inside a page —
it sits between `<!-- BEGIN GENERATED NAV -->` and `<!-- END GENERATED NAV -->`, the next build
overwrites it, and `npm run check:nav` (wired into the Module registry check workflow) fails the
build when the committed markup no longer matches.

This exists because the six navs used to be hand-maintained copies and they drifted: a "Games"
link added to the homepage reached none of the other five, so a visitor on `/about/` had no route
to the games hub at all, and the legal pages had no route to a lesson. The nav's only sign-in is
"Teacher sign in" (`/mission-control/`); for a browser with a session its button reads "My dashboard".

Two skins are deliberately kept separate — the light pill bar and the games hub's dark bar. They
share the link set and the markup shape, not the CSS; each page still owns its own styling.

## Connecting GitHub to Firebase Hosting (one-time, no terminal needed)

1. Go to the [Firebase console](https://console.firebase.google.com/) → **allgood-academy** project → **Hosting**.
2. Click **Connect to GitHub** (or **Add another site** → GitHub integration) and authorize the `allgoodacademy` org if prompted.
3. Pick this repo (`allgoodacademy/AllgoodAcademyGo`) and the `main` branch as the deploy source.
4. Firebase opens a PR on this repo adding `.github/workflows/firebase-hosting-merge.yml` (deploys on merge to `main`) and a preview-deploy workflow for pull requests, plus a `FIREBASE_SERVICE_ACCOUNT_*` secret. Merge that PR.

After that, every push to `main` auto-deploys to allgoodacademy.com — no CLI required.

## Hidden modules

One module is live, registered, and deliberately absent from every surface of this site:
**Pattern Lab** (`/pattern-lab/` and `/educational-games/pattern-lab/`), a free CogAT-style
practice diagnostic published for parents arriving from search. It is in no navigation, on
no games-hub card, in no dashboard or Lab Pack hub, and it is not assignable in Mission
Control. That absence is the design, not an oversight.

It is registered anyway, with **`"hidden": true`** in `public/data/modules-registry.json`
(plus a required `hiddenSince` and `hiddenReason`). Leaving it out of the registry would
mean `check-modules.js` could verify nothing about it, and the next person finding an
unregistered live module would reasonably read it as a bug and "fix" it by surfacing it.

`hidden` exempts a module from the *must appear on a surface* checks and from nothing else.
`scripts/check-modules.js` still validates its id, url, fields and `Telemetry.init` call, and
additionally **asserts it is absent** from the nav, the games hub, the dashboard, Mission
Control, Insider and every Lab Pack hub. Remove the flag and the check fails by name.

Its telemetry is on a separate stream (`stream: 'pattern-lab'`) that Insider holds out of the
funnel — see `docs/insider-analytics.md`.

## Adding a new module

Drop a new folder with an `index.html` under `public/`, matching the URL path you want it served at, then push to `main`.
