# Android Chrome coverage status

PR 10 acceptance remains **blocked**. CI now fails explicitly when any of the installed Chrome version's four numeric components places it below official Android Chrome stable, when the Android API differs from the job's declared API, or when a Chromium package is passed off as Google Chrome. Official version lookup errors and malformed version data fail closed. This prevents a stale result from being reported as current coverage; it does not provision or update Chrome.

## Reproduced image and browser

On 2026-10-22, a disposable API 37 ARM64 Google Play emulator was booted from Google's `arm64-v8a-37.0_r08.zip` archive. The Android SDK repository metadata in `playstore.xml` declares the archive SHA-1 as `ac251e27178d78cffb0b7ee577d79643491a89a6`; the downloaded archive has that exact SHA-1. The extracted `source.properties` says `Pkg.Revision=7`, despite the repository path, URL suffix, and matching archive checksum identifying revision 8. The image reported Android 17 / API 37, ABI `arm64-v8a`, fingerprint `google/sdk_gphone64_arm64/emu64a:17/CE2A.260420.051.A2/16418371:user/release-keys`, and package `com.android.chrome` version `145.0.7632.218`.

Google's Android Chrome stable Version History API reported `157.0.8103.14` during the same check. The API 37 guard fixture uses those observed values and fails with `Stale Google Chrome: 145.0.7632.218; current Chrome stable is 157.0.8103.14`. The emulator had no signed-in Google account, and no account setup or update bypass was attempted. No official, unauthenticated route to provision current branded Chrome was established.

This local probe used ARM64 on a Mac. The GitHub Actions job remains API 35 / x86_64, so the API 37 result does not claim that the hosted job was reproduced or fixed. The job's guard expects API 35 and the official Android Chrome Version History endpoint is queried at run time.

Sources:

- Android SDK repository metadata: `https://dl.google.com/android/repository/repository2-3.xml` (system image package `system-images;android-37.0;google_apis_playstore;arm64-v8a`, archive `arm64-v8a-37.0_r08.zip`, SHA-1 above).
- Official Chrome stable metadata: `https://versionhistory.googleapis.com/v1/chrome/platforms/android/channels/stable/versions?pageSize=1`.
- The probe output and archive are local investigation artifacts under `work/android/` and are not committed to this repository.

## Available manual options

For a one-off check without changing CI or enabling a new paid service, use an existing physical Android phone with current Google Chrome installed from Google Play, enable USB debugging, connect it with ADB, forward `chrome_devtools_remote` to port 9222, and run the site's local server plus `.github/tests/android.mjs`. Set `ANDROID_EXPECT_API` to that device's reported API level. The same guard records the exact browser package, version, API, ABI, and build fingerprint in `test-results/android/browser-version.json`.

The repository also has a manually triggered BrowserStack workflow at `.github/workflows/devices.yml`; its documented free trial is limited to 100 minutes total, so it is suitable only if existing trial capacity is available. It is not part of CI, and no paid recurring runs are authorized. A sustainable hosted real-device run needs an explicit budget before it can be proposed as the resolution.

The guard's mocked contract checks run with `node --test .github/tests/android-version.test.mjs` and cover current Chrome, stale Chrome, unexpected API, and attempts to substitute Chromium or another package.
