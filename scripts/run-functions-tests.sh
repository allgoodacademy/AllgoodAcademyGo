#!/usr/bin/env bash
# Runs the Cloud Functions tests (functions/test/) against the Firestore and Auth emulators.
#   ./scripts/run-functions-tests.sh      (or: npm run test:functions)
# Requires Java (the emulators are JARs). Installs functions/ dependencies from its lockfile
# when they aren't there yet.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -x node_modules/.bin/firebase ]; then
  echo "firebase-tools is not installed. Run 'npm ci' first." >&2
  exit 1
fi
if [ ! -d functions/node_modules ]; then
  (cd functions && npm ci --no-audit --no-fund)
fi

node_modules/.bin/firebase emulators:exec --only firestore,auth --project allgood-functions-test \
  "node --test functions/test/stripe-webhook.test.js"
