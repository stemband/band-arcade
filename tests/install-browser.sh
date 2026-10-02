#!/usr/bin/env bash
# Install one Playwright browser on a CI machine (tests.yml). Test tooling only.
#   chromium: GitHub's ubuntu-latest already has every library Chrome needs, so only the browser itself (no apt).
#   webkit:   its system libraries come from apt, and a slow Ubuntu mirror made that step take 6–22 minutes now and
#             then (October 2026). So the downloaded packages are kept in ~/.cache/apt-webkit, which tests.yml caches
#             with the browser: with them in apt's archive, apt installs without downloading anything. On top of that,
#             apt gives up on a stalled download after 20 s and tries again, and a failed install is tried again after
#             waiting for apt's lock. (Never kill apt from outside: it keeps the lock and the next try can't start.)
# The browser download itself is cached by tests.yml (~/.cache/ms-playwright): then `install` does nothing.
set -uo pipefail
b="$1"
npx playwright install "$b" || exit 1
[ "$b" = webkit ] || exit 0
KEEP="$HOME/.cache/apt-webkit"
mkdir -p "$KEEP"
printf 'Acquire::Retries "5";\nAcquire::http::Timeout "20";\nAcquire::https::Timeout "20";\nDPkg::Lock::Timeout "300";\nAPT::Keep-Downloaded-Packages "true";\nBinary::apt::APT::Keep-Downloaded-Packages "true";\n' \
  | sudo tee /etc/apt/apt.conf.d/99-band-arcade-ci > /dev/null
n=$(ls "$KEEP"/*.deb 2>/dev/null | wc -l)
echo "WebKit's libraries: $n packages from the cache"
[ "$n" -gt 0 ] && sudo cp "$KEEP"/*.deb /var/cache/apt/archives/
ok=0
for try in 1 2 3; do
  if npx playwright install-deps webkit; then ok=1; break; fi
  echo "::warning::installing WebKit's libraries failed (try $try of 3); trying again"
  sleep 10
done
[ "$ok" = 1 ] || exit 1
cp /var/cache/apt/archives/*.deb "$KEEP"/ 2>/dev/null || true      # for the next run's cache
exit 0
