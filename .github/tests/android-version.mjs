// A stale emulator browser must fail explicitly, rather than silently claiming current Chrome coverage.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
export async function androidVersion({ adb = (...args) => execFileSync(process.env.ADB ?? 'adb', args, { encoding: 'utf8' }).trim(), fetchStable = globalThis.fetch, expectedApi = process.env.ANDROID_EXPECT_API ?? '35', writeArtifact = (info) => {
  mkdirSync('../../test-results/android', { recursive: true });
  writeFileSync('../../test-results/android/browser-version.json', JSON.stringify(info, null, 2));
} } = {}) {
  const packageName = process.env.ANDROID_BROWSER_PACKAGE ?? 'com.android.chrome';
  if (!['com.android.chrome', 'org.chromium.chrome'].includes(packageName)) throw Error(`Unexpected browser package ${packageName}`);
  if (packageName !== 'com.android.chrome' && process.env.ANDROID_SUPPLEMENTAL !== '1') throw Error('Chromium cannot satisfy the required Google Chrome job; set ANDROID_SUPPLEMENTAL=1 only for explicitly supplemental validation');
  const packageInfo = adb('shell', 'dumpsys', 'package', packageName);
  const version = packageInfo.match(/versionName=([\d.]+)/)?.[1];
  if (!version) throw Error(`No browser version reported for ${packageName}`);
  const response = await fetchStable('https://versionhistory.googleapis.com/v1/chrome/platforms/android/channels/stable/versions?pageSize=1', { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw Error(`Official Chrome version lookup failed: ${response.status}`);
  const stable = (await response.json()).versions?.[0]?.version;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(stable ?? '')) throw Error('Invalid official Chrome stable version');
  const info = { packageName, product: packageName === 'com.android.chrome' ? 'Google Chrome' : 'Chromium snapshot (supplemental, not Chrome)', version, stableChrome: stable, android: adb('shell', 'getprop', 'ro.build.version.release'), api: adb('shell', 'getprop', 'ro.build.version.sdk'), abi: adb('shell', 'getprop', 'ro.product.cpu.abilist'), build: adb('shell', 'getprop', 'ro.build.fingerprint'), nativeBridge: adb('shell', 'getprop', 'ro.dalvik.vm.native.bridge') };
  writeArtifact(info);
  console.log('Android browser provenance:', JSON.stringify(info));
  if (info.api !== expectedApi) throw Error(`Android API ${info.api}, expected ${expectedApi}`);
  const installed = version.split('.').map(Number), current = stable.split('.').map(Number);
  if (installed.some((part, i) => part < current[i] && installed.slice(0, i).every((prior, j) => prior === current[j])))
    throw Error(`Stale ${info.product}: ${version}; current Chrome stable is ${stable}. See .github/ANDROID.md. No legacy exemption is accepted.`);
  return info;
}
if (process.argv[1]?.endsWith('/android-version.mjs')) await androidVersion();
