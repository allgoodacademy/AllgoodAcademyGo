# Allgood Academy — Go

Static site for [allgoodacademy.com](https://www.allgoodacademy.com), deployed via Firebase Hosting.
Each page is a standalone HTML file (Tailwind + vanilla JS + Firebase Auth/Firestore). Pages are
served exactly as committed — the two generators in `scripts/` (`build:css`, `build:nav`) write
their output into the repo, so there is no build step between a commit and the deploy.

Mirrors the local `Allgood_OS_Host` Firebase Hosting folder, plus `insider/` (not part of the
original local folder, added separately).

## Structure

```
public/
  index.html                                     # Marketing landing page (signed-out home) — zero third-party requests
  for-teachers/index.html                        # Marketing: teacher-facing page
  about/index.html                               # Marketing: about + contact
  dashboard/index.html                           # Allgood Academy dashboard (signed-in home)
  insider/index.html                             # Insider (owner BI dashboard: users, courses, classrooms, inbox, tools)
  js/telemetry.js                                # Shared learning-analytics telemetry (sessions + events) — see docs/insider-analytics.md
  educational-games/                              # conflict-resolution, digital-decisions,
                                                    # jolenes-lemonade-challenge, master-your-story,
                                                    # purposeful-communicator
  goodblocks/                                      # aico-pilot, airport-navigator, cogat-logic-lab,
                                                    # cogat-verbal-practice, digital-asset-defense,
                                                    # testing, your-digital-identity
  jsh/                                             # finding-yourself, rage-revenue
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
to the games hub at all, and the legal pages had no route to a lesson or to sign in.

Two skins are deliberately kept separate — the light pill bar and the games hub's dark bar. They
share the link set and the markup shape, not the CSS; each page still owns its own styling.

## Connecting GitHub to Firebase Hosting (one-time, no terminal needed)

1. Go to the [Firebase console](https://console.firebase.google.com/) → **allgood-academy** project → **Hosting**.
2. Click **Connect to GitHub** (or **Add another site** → GitHub integration) and authorize the `allgoodacademy` org if prompted.
3. Pick this repo (`allgoodacademy/AllgoodAcademyGo`) and the `main` branch as the deploy source.
4. Firebase opens a PR on this repo adding `.github/workflows/firebase-hosting-merge.yml` (deploys on merge to `main`) and a preview-deploy workflow for pull requests, plus a `FIREBASE_SERVICE_ACCOUNT_*` secret. Merge that PR.

After that, every push to `main` auto-deploys to allgoodacademy.com — no CLI required.

## Adding a new module

Drop a new folder with an `index.html` under `public/`, matching the URL path you want it served at, then push to `main`.
