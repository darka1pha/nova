#!/bin/bash
# Regression guard: every workspace package under packages/*/package.json
# must have the same version as the root package.json. A mismatch here
# almost always means scripts/update-versions.sh wasn't run (or was run
# before its mv bug was fixed), and publishing in that state produces a
# release where @nova/core and the root "nova" package disagree on version.
#
# Run via: npm run verify:versions-sync
# Wired into .github/workflows/npm-publish.yml's "verify" job so a version
# mismatch fails CI before the "publish" job (which depends on "verify")
# ever runs.

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to run this script." >&2
  exit 1
fi

ROOT_VERSION=$(jq -r '.version' package.json)
MISMATCH=0

echo "Root package.json version: $ROOT_VERSION"

shopt -s nullglob
PKG_FILES=(packages/*/package.json)
shopt -u nullglob

if [ ${#PKG_FILES[@]} -eq 0 ]; then
  echo "No workspace package.json files found under packages/*/package.json."
else
  for pkg in "${PKG_FILES[@]}"; do
    PKG_VERSION=$(jq -r '.version' "$pkg")
    if [ "$PKG_VERSION" != "$ROOT_VERSION" ]; then
      echo "✗ Version mismatch: $pkg has \"$PKG_VERSION\", expected \"$ROOT_VERSION\""
      MISMATCH=1
    else
      echo "✓ $pkg matches ($PKG_VERSION)"
    fi
  done
fi

if [ "$MISMATCH" -eq 1 ]; then
  echo ""
  echo "Version verification failed. Run scripts/update-versions.sh <version> to sync all package.json files, then commit the result."
  exit 1
fi

echo ""
echo "All package versions are in sync ($ROOT_VERSION)."