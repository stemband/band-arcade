#!/usr/bin/env bash
# Install one Playwright browser on a CI machine (tests.yml). Test tooling only.
#   chromium: GitHub's ubuntu-latest already has every library Chrome needs, so only the browser itself (no apt).
#   webkit:   its system libraries come from apt. A slow Ubuntu mirror once stalled this step for 12–22 minutes
#             (October 2026), so apt gives up on a stalled download after 20 s and tries it again (5 times), and a
#             failed install is tried again (3 times) after waiting for apt's lock. (Never kill apt from outside: it
#             keeps the lock and the next try can't start.)
# The browser download itself is cached by tests.yml (~/.cache/ms-playwright): then `install` does nothing.
set -uo pipefail
b="$1"
npx playwright install "$b" || exit 1
[ "$b" = webkit ] || exit 0
printf 'Acquire::Retries "5";\nAcquire::http::Timeout "20";\nAcquire::https::Timeout "20";\nDPkg::Lock::Timeout "300";\n' \
  | sudo tee /etc/apt/apt.conf.d/99-band-arcade-ci > /dev/null
for try in 1 2 3; do
  if npx playwright install-deps webkit; then exit 0; fi
  echo "::warning::installing WebKit's libraries failed (try $try of 3); trying again"
  sleep 10
done
exit 1
