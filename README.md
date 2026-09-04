# Allgood Academy — Go

Static site for [allgoodacademy.com](https://www.allgoodacademy.com), deployed via Firebase Hosting.
Each page is a standalone HTML file (Tailwind + vanilla JS + Firebase Auth/Firestore), no build step required.

Mirrors the local `Allgood_OS_Host` Firebase Hosting folder, plus `insider/` (not part of the
original local folder, added separately).

## Structure

```
public/
  index.html                                     # Allgood Academy dashboard (home page)
  insider/index.html                             # Insider (internal agent/intel view)
  educational-games/                              # conflict-resolution, digital-decisions,
                                                    # jolenes-lemonade-challenge, master-your-story,
                                                    # purposeful-communicator
  goodblocks/                                      # aico-pilot, airport-navigator, cogat-logic-lab,
                                                    # cogat-verbal-practice, digital-asset-defense,
                                                    # testing, your-digital-identity
  jsh/                                             # finding-yourself, rage-revenue
  404.html, privacy.html, terms.html, favicon.png
```

Firebase Hosting project: `allgood-academy-goodblocks` (see `.firebaserc`). Note this is a
*different* Firebase project than the one referenced inside the pages' `firebaseConfig`
(`allgood-academy`, used for Auth/Firestore) — that's expected, not a bug.

## Connecting GitHub to Firebase Hosting (one-time, no terminal needed)

1. Go to the [Firebase console](https://console.firebase.google.com/) → **allgood-academy** project → **Hosting**.
2. Click **Connect to GitHub** (or **Add another site** → GitHub integration) and authorize the `allgoodacademy` org if prompted.
3. Pick this repo (`allgoodacademy/AllgoodAcademyGo`) and the `main` branch as the deploy source.
4. Firebase opens a PR on this repo adding `.github/workflows/firebase-hosting-merge.yml` (deploys on merge to `main`) and a preview-deploy workflow for pull requests, plus a `FIREBASE_SERVICE_ACCOUNT_*` secret. Merge that PR.

After that, every push to `main` auto-deploys to allgoodacademy.com — no CLI required.

## Adding a new module

Drop a new folder with an `index.html` under `public/`, matching the URL path you want it served at, then push to `main`.
