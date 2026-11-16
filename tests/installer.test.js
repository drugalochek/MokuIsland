import test from 'node:test';
import assert from 'node:assert/strict';
import {installerFromRelease} from '../js/release.js';
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
