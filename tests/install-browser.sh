#!/usr/bin/env bash
# Install one Playwright browser on a CI machine (tests.yml). Test tooling only.
#   chromium: GitHub's ubuntu-latest already has every library Chrome needs, so only the browser itself (no apt).
#   webkit:   its system libraries come from apt. A slow Ubuntu mirror once stalled this step for 12–22 minutes
#             (October 2026), so each try is capped at 4 minutes, up to 3 tries.
# The browser download itself is cached by tests.yml (~/.cache/ms-playwright): then `install` does nothing.
set -uo pipefail
b="$1"
npx playwright install "$b" || exit 1
[ "$b" = webkit ] || exit 0
for try in 1 2 3; do
  if timeout 240 npx playwright install-deps webkit; then exit 0; fi
  echo "::warning::installing WebKit's libraries stalled or failed (try $try of 3); trying again"
  sudo dpkg --configure -a || true
  sleep 5
done
exit 1
