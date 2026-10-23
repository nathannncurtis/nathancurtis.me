#!/usr/bin/env bash
# Inside the Android emulator: Chrome without its first-run screens, its DevTools socket on localhost:9222,
# then the page checks. wrangler dev is already listening on this machine, which the emulator sees as 10.0.2.2.
set -euo pipefail
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
# A debug app reads /data/local/tmp/chrome-command-line, even on a device that isn't rooted.
adb shell am set-debug-app --persistent com.android.chrome
adb shell "echo '_ --disable-fre --no-default-browser-check --no-first-run --disable-features=SigninPromo' > /data/local/tmp/chrome-command-line"
adb shell am start -n com.android.chrome/com.google.android.apps.chrome.Main -d about:blank
sleep 8
adb forward tcp:9222 localabstract:chrome_devtools_remote
for i in $(seq 30); do curl -sf http://127.0.0.1:9222/json/version && break; sleep 2; done
cd .github/tests && node android.mjs
