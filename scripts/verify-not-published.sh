#!/bin/bash
# Regression guard: fails fast if the current package.json version has
# already been published to npm. Without this, a forgotten version bump
# only surfaces as a confusing "npm error 403 ... You cannot publish over
# the previously published versions" deep inside the "publish" job, after
# provenance has already been signed. Catching it in "verify" instead
# gives a clear, actionable message before any publish attempt is made.
#
# Run via: npm run verify:not-published

set -euo pipefail

PKG_NAME=$(node -p "require('./package.json').name")
PKG_VERSION=$(node -p "require('./package.json').version")

echo "Checking whether $PKG_NAME@$PKG_VERSION is already on npm..."

# `npm view <pkg>@<version> version` prints the version and exits 0 if it
# exists, or exits non-zero (E404) if it doesn't. We only care about the
# exit code, and don't want set -e to kill the script on the expected
# "not found" case, so it's guarded explicitly.
if npm view "${PKG_NAME}@${PKG_VERSION}" version >/dev/null 2>&1; then
  echo "✗ ${PKG_NAME}@${PKG_VERSION} is already published to npm."
  echo ""
  echo "Bump the version first: scripts/update-versions.sh <new-version>,"
  echo "commit the result, then push a new tag matching the new version."
  exit 1
fi

echo "✓ ${PKG_NAME}@${PKG_VERSION} has not been published yet."