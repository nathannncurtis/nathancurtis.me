import assert from 'node:assert/strict';
import { test } from 'node:test';
import { androidVersion } from './android-version.mjs';

function fixture({ packageName = 'com.android.chrome', version = '157.0.8103.14', api = '35', abi = 'x86_64', build = 'google/sdk_gphone64_x86_64/emu64x:17/test' } = {}) {
  const adbCalls = [];
  const artifacts = [];
  const adb = (...args) => {
    adbCalls.push(args);
    if (args[0] === 'shell' && args[1] === 'dumpsys') return ` versionName=${version}`;
    if (args[1] === 'getprop' && args[2] === 'ro.build.version.sdk') return api;
    if (args[1] === 'getprop' && args[2] === 'ro.build.version.release') return '17';
    if (args[1] === 'getprop' && args[2] === 'ro.product.cpu.abilist') return abi;
    if (args[1] === 'getprop' && args[2] === 'ro.build.fingerprint') return build;
    if (args[1] === 'getprop' && args[2] === 'ro.dalvik.vm.native.bridge') return '0';
    throw Error(`Unexpected adb call: ${args.join(' ')}`);
  };
  const fetchStable = async (url) => {
    assert.match(url, /^https:\/\/versionhistory\.googleapis\.com\/v1\/chrome\/platforms\/android\/channels\/stable\/versions/);
    return { ok: true, json: async () => ({ versions: [{ version: '157.0.8103.14' }] }) };
  };
  return {
    adb, adbCalls, artifacts,
    run: (options = {}) => androidVersion({ adb, fetchStable, expectedApi: '35', writeArtifact: (info) => artifacts.push(info), ...options }),
    withPackage: (name) => { process.env.ANDROID_BROWSER_PACKAGE = name; },
    cleanup: () => { delete process.env.ANDROID_BROWSER_PACKAGE; delete process.env.ANDROID_SUPPLEMENTAL; }
  };
}

test('accepts official Chrome at or above official stable on the expected API', async () => {
  const f = fixture();
  const info = await f.run();
  assert.equal(info.product, 'Google Chrome');
  assert.equal(info.api, '35');
  assert.equal(f.artifacts.length, 1);
});

test('rejects a stale official Chrome version', async () => {
  const f = fixture({ version: '145.0.7632.218' });
  await assert.rejects(f.run(), /Stale Google Chrome: 145\.0\.7632\.218; current Chrome stable is 157\.0\.8103\.14/);
});

test('rejects a Chrome patch behind stable even when the major matches', async () => {
  const f = fixture({ version: '157.0.8103.1' });
  await assert.rejects(f.run(), /Stale Google Chrome: 157\.0\.8103\.1; current Chrome stable is 157\.0\.8103\.14/);
});

test('the API 37 fixture still rejects the observed bundled Chrome 145 against stable 157', async () => {
  const f = fixture({ version: '145.0.7632.218', api: '37', abi: 'arm64-v8a', build: 'google/sdk_gphone64_arm64/emu64a:17/CE2A.260420.051.A2/16418371:user/release-keys' });
  await assert.rejects(f.run({ expectedApi: '37' }), /Stale Google Chrome: 145\.0\.7632\.218; current Chrome stable is 157\.0\.8103\.14/);
  assert.equal(f.artifacts[0].api, '37');
});

test('rejects an unexpected Android API while retaining provenance', async () => {
  const f = fixture({ api: '37' });
  await assert.rejects(f.run(), /Android API 37, expected 35/);
  assert.equal(f.artifacts[0].api, '37');
});

test('rejects the wrong package instead of treating Chromium as Chrome', async () => {
  const f = fixture();
  f.withPackage('org.chromium.chrome');
  try {
    await assert.rejects(f.run(), /Chromium cannot satisfy the required Google Chrome job/);
    assert.equal(f.adbCalls.length, 0);
  } finally { f.cleanup(); }
});

test('rejects an unexpected browser package', async () => {
  const f = fixture();
  f.withPackage('com.example.browser');
  try { await assert.rejects(f.run(), /Unexpected browser package com\.example\.browser/); }
  finally { f.cleanup(); }
});

test('fails closed when official Version History is unavailable', async () => {
  const f = fixture();
  await assert.rejects(f.run({ fetchStable: async () => ({ ok: false, status: 503 }) }), /Official Chrome version lookup failed: 503/);
});

test('fails closed when official stable metadata is malformed', async () => {
  const f = fixture();
  await assert.rejects(f.run({ fetchStable: async () => ({ ok: true, json: async () => ({ versions: [] }) }) }), /Invalid official Chrome stable version/);
});
