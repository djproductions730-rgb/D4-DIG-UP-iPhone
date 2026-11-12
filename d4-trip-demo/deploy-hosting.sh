#!/usr/bin/env bash
# Deploy ONLY the existing D4 Trip Firebase Hosting site.
# Never deploys Firestore rules/functions or changes/deletes user data.
set -euo pipefail

PROJECT="d4-trip"
BRANCH="dev/d4-trip-live-premium-20261105"
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is missing in this Codespace; cannot continue." >&2
  exit 1
fi

ACTUAL_BRANCH="$(git branch --show-current)"
if [[ "$ACTUAL_BRANCH" != "$BRANCH" ]]; then
  echo "STOP: wrong branch ($ACTUAL_BRANCH). Expected $BRANCH." >&2
  exit 1
fi

echo "D4 Trip hosting release | project: $PROJECT | branch: $BRANCH"
echo "This updates Hosting files only. Firestore data and rules are left untouched."
echo "The shared Delete Trip feature needs separately reviewed deployed Firestore rules."
echo "IMPORTANT: export a JSON backup of your existing trip data before releasing."
echo
node check.cjs

# npx installs the CLI in the remote Codespace environment, not on the office laptop.
echo "Checking Firebase CLI and project authorization..."
npx --yes firebase-tools --version
if ! npx --yes firebase-tools projects:list --json --non-interactive > /tmp/d4-trip-firebase-projects.json 2>/dev/null; then
  echo
  echo "Firebase sign-in is needed. Use the browser link/code shown below."
  echo "Do not share passwords, verification codes or credentials with anyone."
  npx --yes firebase-tools login --no-localhost
  npx --yes firebase-tools projects:list --json --non-interactive > /tmp/d4-trip-firebase-projects.json
fi
if ! grep -Eq '"projectId"[[:space:]]*:[[:space:]]*"d4-trip"' /tmp/d4-trip-firebase-projects.json; then
  echo "STOP: signed-in Google account has no access to the d4-trip Firebase project." >&2
  exit 1
fi

echo
echo "Ready for existing site: https://d4-trip.web.app"
echo "This does NOT deploy Firestore rules, Functions, or the image-only concept mockup."
read -r -p "Type DEPLOY to update existing Firebase Hosting: " answer
if [[ "$answer" != "DEPLOY" ]]; then
  echo "Cancelled. No deployment performed."
  exit 0
fi

npx --yes firebase-tools deploy --only hosting --project "$PROJECT" --config firebase.json
echo "Hosting deployed. Verify https://d4-trip.web.app and its login/expense/roster screens."
