#!/usr/bin/env bash
# Starts the Firestore emulator and runs the security-rules tests against it.
#   ./scripts/run-rules-tests.sh
# Requires Java (the emulator is a JAR) and the devDependencies in package.json.
set -euo pipefail
cd "$(dirname "$0")/.."
npx --yes firebase-tools@13 emulators:exec --only firestore --project allgood-rules-test \
  "node tests/firestore-rules.test.mjs"
