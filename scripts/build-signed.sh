#!/usr/bin/env bash
# Signed + notarized release build. Requires .env.signing (see its comments).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.signing ]]; then
  echo "Missing .env.signing — create it with APPLE_ID / APPLE_PASSWORD / APPLE_TEAM_ID / APPLE_SIGNING_IDENTITY" >&2
  exit 1
fi

set -a
source .env.signing
set +a

if [[ "${APPLE_PASSWORD}" == paste-* ]]; then
  echo "APPLE_PASSWORD in .env.signing is still the placeholder" >&2
  exit 1
fi

echo "Building signed release as: ${APPLE_SIGNING_IDENTITY}"
npm run tauri build
echo
echo "Verifying signature and notarization:"
spctl -a -vv src-tauri/target/release/bundle/macos/Daybird.app
