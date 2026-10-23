#!/usr/bin/env bash
# Inside the Android emulator: Chrome without its first-run screens, its DevTools socket on localhost:9222,
# then the page checks. wrangler dev is already listening on this machine, which the emulator sees as 10.0.2.2.
set -euo pipefail
adb wait-for-device
PACKAGE="${ANDROID_BROWSER_PACKAGE:-com.android.chrome}"
for _ in $(seq 60); do
  [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ] && break
  sleep 2
done
[ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ] || { echo 'Android did not boot in 120 seconds'; exit 1; }
# android.mjs performs the strict package, API and official stable-version check once, after boot.
# A debug app reads /data/local/tmp/chrome-command-line, even on a device that isn't rooted.
adb shell am set-debug-app --persistent "$PACKAGE"
adb shell "echo '_ --disable-fre --no-default-browser-check --no-first-run --disable-features=SigninPromo' > /data/local/tmp/chrome-command-line"
adb shell am start -n "$PACKAGE/com.google.android.apps.chrome.Main" -d about:blank
sleep 8
adb forward tcp:9222 localabstract:chrome_devtools_remote
for _ in $(seq 30); do curl -sf http://127.0.0.1:9222/json/version && break; sleep 2; done
cd .github/tests && node android.mjs
