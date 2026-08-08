#!/bin/bash

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
  echo "Usage: $0 <new-version>"
  exit 1
fi

# Update root package.json
jq ".version = \"$NEW_VERSION\"" package.json > package.json.tmp && mv package.json.tmp package.json

# Update all workspace package.json files
for pkg in packages/*/package.json; do
  jq ".version = \"$NEW_VERSION\"" "$pkg" > "$pkg.tmp" && mv "$pkg.tmp" package.json
done

echo "Updated all versions to $NEW_VERSION"