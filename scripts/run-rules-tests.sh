#!/usr/bin/env bash
# Starts the Firestore emulator and runs the security-rules tests against it.
#   ./scripts/run-rules-tests.sh
# Requires Java (the emulator is a JAR) and the devDependencies in package.json.
#
# WHY THIS PINS ITS TOOLING
# This used to run `npx --yes firebase-tools@13 ...`, which resolves to whatever the newest
# 13.x happens to be at the moment the command runs and downloads whichever Firestore
# emulator JAR that CLI version hardcodes. The rules engine lives in that JAR, so the suite's
# verdict depended on an unpinned dependency: the same commit could pass one day and fail the
# next with no change to the repo at all, and a rules regression could arrive — or be
# concealed — by a CLI release nobody chose. firebase-tools is now an ordinary exact-pinned
# devDependency (no caret, so `npm ci` reproduces it from the lockfile), and the JAR version
# that CLI resolves to is asserted below rather than assumed.
set -euo pipefail
cd "$(dirname "$0")/.."

# The JAR this suite is known to pass against. Bump it deliberately, in the same commit that
# bumps firebase-tools, after re-running the suite — never to make a red run go green.
EXPECTED_EMULATOR_JAR="1.19.8"

if [ ! -x node_modules/.bin/firebase ]; then
  echo "firebase-tools is not installed. Run 'npm ci' first." >&2
  exit 1
fi

# The CLI hardcodes its emulator JAR version; read it back rather than trusting the pin to
# imply it. (FIRESTORE_EMULATOR_BINARY_PATH overrides the JAR entirely if you ever need to
# test against a specific one by hand — this check is about what CI silently gets.)
ACTUAL_EMULATOR_JAR="$(node -e '
  const d = require("firebase-tools/lib/emulator/downloadableEmulators.js");
  process.stdout.write(String(d.DownloadDetails.firestore.version));
')"

if [ "$ACTUAL_EMULATOR_JAR" != "$EXPECTED_EMULATOR_JAR" ]; then
  echo "Firestore emulator JAR drifted: expected v${EXPECTED_EMULATOR_JAR}, firebase-tools" >&2
  echo "$(node -p 'require("firebase-tools/package.json").version') resolves v${ACTUAL_EMULATOR_JAR}." >&2
  echo "The rules engine lives in this JAR. Re-run the suite against the new one and update" >&2
  echo "EXPECTED_EMULATOR_JAR in this script in the same commit as the firebase-tools bump." >&2
  exit 1
fi

echo "Firestore emulator JAR v${ACTUAL_EMULATOR_JAR} (firebase-tools $(node -p 'require("firebase-tools/package.json").version'))"

node_modules/.bin/firebase emulators:exec --only firestore --project allgood-rules-test \
  "node tests/firestore-rules.test.mjs"
