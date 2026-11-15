import test from 'node:test';
import assert from 'node:assert/strict';
import { createEyeState, updateEyeState, eyeMood, gazeForPoint, springStep, IDLE_AFTER, HAPPY_FOR } from '../js/eye-state.js';
import { installerFromRelease } from '../js/release.js';

test('each expression has a clear event and a finite lifetime', () => {
  let state = createEyeState(0);
  assert.equal(eyeMood(state, 10), 'neutral');
  state = updateEyeState(state, 'pointer', 10); assert.equal(eyeMood(state, 11), 'tracking');
  state = updateEyeState(state, 'enter', 20); assert.equal(eyeMood(state, 21), 'curious');
  state = updateEyeState(state, 'click', 30); assert.equal(eyeMood(state, 31), 'happy');
  assert.equal(eyeMood(state, 30 + HAPPY_FOR), 'curious');
  state = updateEyeState(state, 'leave', 40); assert.equal(eyeMood(state, 30 + HAPPY_FOR), 'neutral');
  assert.equal(eyeMood(state, 30 + IDLE_AFTER), 'sleepy');
  state = updateEyeState(state, 'pointer', 50000); assert.equal(eyeMood(state, 50001), 'tracking');
});
test('keyboard focus is meaningful, not interpreted as an idle visitor', () => {
  let state = updateEyeState(createEyeState(0), 'focus', 50);
  assert.equal(eyeMood(state, 99999), 'curious');
  state = updateEyeState(state, 'blur', 100000); assert.equal(eyeMood(state, 100001), 'sleepy');
  state = updateEyeState(state, 'wake', 100002); assert.equal(eyeMood(state, 100003), 'neutral');
});
test('gaze is bounded in every direction and centers when the pointer leaves', () => {
  const rect = { left: 0, top: 0, width: 100, height: 50 };
  assert.deepEqual(gazeForPoint({ x: 50, y: 25 }, rect), { x: 0, y: 0 });
  assert.deepEqual(gazeForPoint(null, rect), { x: 0, y: 0 });
  assert.deepEqual(gazeForPoint({ x: NaN, y: 5 }, rect), { x: 0, y: 0 });
  for (const x of [-1e9, -100, 0, 100, 1e9]) for (const y of [-1e9, -100, 0, 100, 1e9]) {
    const g = gazeForPoint({ x, y }, rect); assert.ok(Math.abs(g.x) <= 4.5 && Math.abs(g.y) <= 3);
  }
});
test('spring remains finite across dropped frames and settles without perpetual shaking', () => {
  let value = 0, velocity = 0;
  for (let i = 0; i < 400; i++) { const next = springStep(value, velocity, 4.5, i % 10 ? 1 / 60 : 2); value = next.value; velocity = next.velocity; assert.ok(Number.isFinite(value) && Math.abs(value) < 6); }
  assert.equal(value, 4.5); assert.equal(velocity, 0);
  assert.deepEqual(springStep(NaN, NaN, 2, 1 / 60), { value: 2, velocity: 0 });
});
function asset(version, overrides = {}) { return { name: `Moku-Setup-${version}-x64.exe`, browser_download_url: `https://github.com/drugalochek/Moku/releases/download/Release/Moku-Setup-${version}-x64.exe`, size: 144345279, ...overrides }; }
test('installer filename owns the version, not a potentially stale release title', () => {
  const r = installerFromRelease({ name: 'Moku 1.0', tag_name: 'Release', assets: [asset('2.12.6')] });
  assert.equal(r.version, '2.12.6'); assert.equal(r.size, 138);
});
test('multiple installer assets select highest semantic version rather than asset order', () => {
  assert.equal(installerFromRelease({ assets: [asset('2.9.0'), asset('2.12.6'), asset('2.12.4')] }).version, '2.12.6');
});
test('draft/prerelease and untrusted/missing installer URLs never replace the real fallback', () => {
  assert.equal(installerFromRelease(null), null);
  assert.equal(installerFromRelease({ draft: true, assets: [asset('2.12.6')] }), null);
  assert.equal(installerFromRelease({ prerelease: true, assets: [asset('2.12.6')] }), null);
  assert.equal(installerFromRelease({ assets: [] }), null);
  for (const url of ['javascript:alert(1)', 'https://evil.example/setup.exe', 'https://github.com/other/Moku/releases/download/x/a.exe', 'http://github.com/drugalochek/Moku/releases/download/x/a.exe']) assert.equal(installerFromRelease({ assets: [asset('2.12.6', { browser_download_url: url })] }), null);
});
