# Allgood Academy — Go

Static site for [allgoodacademy.com](https://www.allgoodacademy.com), deployed via Firebase Hosting.
Each page is a standalone HTML file (Tailwind + vanilla JS + Firebase Auth/Firestore), no build step required.

## Structure

```
public/
  index.html                                     # Allgood Academy dashboard (home page)
  insider/index.html                             # Insider (internal agent/intel view)
  educational-games/
    digital-decisions/index.html                 # Digital Decisions Challenge
    jolenes-lemonade-challenge/index.html         # Jolene's Lemonade Challenge
```

Firebase project: `allgood-academy` (see `.firebaserc`).

## Connecting GitHub to Firebase Hosting (one-time, no terminal needed)

1. Go to the [Firebase console](https://console.firebase.google.com/) → **allgood-academy** project → **Hosting**.
2. Click **Connect to GitHub** (or **Add another site** → GitHub integration) and authorize the `allgoodacademy` org if prompted.
3. Pick this repo (`allgoodacademy/AllgoodAcademyGo`) and the `main` branch as the deploy source.
4. Firebase opens a PR on this repo adding `.github/workflows/firebase-hosting-merge.yml` (deploys on merge to `main`) and a preview-deploy workflow for pull requests, plus a `FIREBASE_SERVICE_ACCOUNT_*` secret. Merge that PR.

After that, every push to `main` auto-deploys to allgoodacademy.com — no CLI required.

## Adding a new module

Drop a new folder with an `index.html` under `public/`, matching the URL path you want it served at, then push to `main`.
