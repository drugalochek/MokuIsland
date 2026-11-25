/** Public release metadata only. Never execute release Markdown or trust its download links. */
export const RELEASE_API = 'https://api.github.com/repos/drugalochek/Moku/releases/latest';
const REPO = 'https://github.com/drugalochek/Moku';
const versionPattern = /^\d+(?:\.\d+){1,3}$/;
export function compareVersions(a, b) {
  const av = a.split('.').map(Number), bv = b.split('.').map(Number);
  for (let i = 0; i < Math.max(av.length, bv.length); i++) if ((av[i] || 0) !== (bv[i] || 0)) return (av[i] || 0) - (bv[i] || 0);
  return 0;
}
function repoURL(value, path) {
  try { const u = new URL(value); return u.protocol === 'https:' && u.origin === 'https://github.com' && !u.username && !u.password && u.pathname.startsWith('/drugalochek/Moku/' + path) && !u.search && !u.hash ? u.href : null; } catch { return null; }
}
function fileName(url) { try { return decodeURIComponent(new URL(url).pathname.split('/').pop()); } catch { return null; } }
const plain = value => String(value || '').replace(/<[^>]*>/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
const iso = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
function candidates(release) {
  if (!release || release.draft || release.prerelease || !Array.isArray(release.assets)) return [];
  return release.assets.flatMap(asset => {
    const match = /^Moku-Setup-(\d+(?:\.\d+){1,3})-x64\.exe$/i.exec(asset.name || '');
    const url = repoURL(asset.browser_download_url, 'releases/download/');
    if (!match || !url || fileName(url) !== asset.name) return [];
    return [{version: match[1], url, bytes: Math.max(0, Number(asset.size) || 0), assetUpdatedAt: iso(asset.updated_at || asset.created_at)}];
  }).sort((a, b) => compareVersions(b.version, a.version));
}
/** Android companion: the APK filename owns its version (MokuMobile-1.0.0.apk). */
export function mobileFromRelease(release) {
  if (!release || release.draft || release.prerelease || !Array.isArray(release.assets)) return null;
  const apks = release.assets.flatMap(asset => {
    const match = /^MokuMobile-(\d+(?:\.\d+){1,3})\.apk$/i.exec(asset.name || '');
    const url = repoURL(asset.browser_download_url, 'releases/download/');
    if (!match || !url || fileName(url) !== asset.name) return [];
    return [{version: match[1], url, bytes: Math.max(0, Number(asset.size) || 0)}];
  }).sort((a, b) => compareVersions(b.version, a.version));
  return apks[0] ? {...apks[0], size: mobileSize(apks[0].bytes)} : null;
}
export function mobileSize(bytes) { const mb = bytes / 1048576; return mb >= 10 ? Math.round(mb) : Math.max(0.1, Math.round(mb * 10) / 10); }
function validMobile(value) {
  if (!value || !versionPattern.test(value.version || '') || !repoURL(value.url, 'releases/download/') || fileName(value.url) !== `MokuMobile-${value.version}.apk` || !Number.isFinite(value.bytes) || value.bytes < 0) return null;
  return {version: value.version, url: value.url, bytes: value.bytes, size: mobileSize(value.bytes)};
}
export function installerFromRelease(release) {
  const asset = candidates(release)[0];
  return asset ? {version: asset.version, url: asset.url, size: Math.round(asset.bytes / 1048576)} : null;
}
export function featuresFromBody(body) {
  const lines = String(body || '').slice(0, 200000).split(/\r?\n/);
  const start = lines.findIndex(line => /^#{1,4}\s+.*(?:Возможности|Features)\s*$/iu.test(line.trim()));
  if (start < 0) return [];
  const features = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,4}\s|^---\s*$/.test(line)) break;
    if (!/^\s*[-*]\s+/.test(line)) continue;
    const text = plain(line.replace(/^\s*[-*]\s+/, '')).slice(0, 1200);
    const parts = text.split(/\s+[—–]\s+/);
    if (parts.length > 1) features.push({title: parts.shift().slice(0, 120), text: parts.join(' — ')});
    else if (text) features.push({title: text.slice(0, 120), text: ''});
    if (features.length === 30) break;
  }
  return features;
}
export function releaseFromGitHub(release) {
  const asset = candidates(release)[0];
  if (!asset) return null;
  const githubName = plain(release.name || release.tag_name || 'Moku').slice(0, 180);
  const name = /\d+(?:\.\d+){1,3}/.test(githubName) ? githubName.replace(/\d+(?:\.\d+){1,3}/, asset.version) : `${githubName} · ${asset.version}`;
  const firstParagraph = String(release.body || '').split(/\r?\n/).find(line => line.trim() && !/^\s*(?:#|[-*]|<|!\[)/.test(line));
  return {schemaVersion: 1, ...asset, name, githubName, tag: plain(release.tag_name).slice(0, 100), size: Math.round(asset.bytes / 1048576), publishedAt: iso(release.published_at), releaseUrl: repoURL(release.html_url, 'releases/tag/') || `${REPO}/releases/latest`, summary: plain(firstParagraph).slice(0, 600) || 'Музыка, окна, буфер обмена, файлы и игры Steam в одном островке для Windows.', features: featuresFromBody(release.body), mobile: mobileFromRelease(release)};
}
export function validSnapshot(value) {
  if (!value || value.schemaVersion !== 1 || !versionPattern.test(value.version || '') || !repoURL(value.url, 'releases/download/') || !repoURL(value.releaseUrl, 'releases/')) return null;
  const filename = fileName(value.url);
  if (filename !== `Moku-Setup-${value.version}-x64.exe` || !Number.isFinite(value.bytes) || value.bytes < 0 || (!Array.isArray(value.features) || value.features.some(f => !f || typeof f !== 'object'))) return null;
  return {...value, name: plain(value.name).slice(0, 180), githubName: plain(value.githubName).slice(0, 180), summary: plain(value.summary).slice(0, 600), size: Math.round(value.bytes / 1048576), publishedAt: iso(value.publishedAt), assetUpdatedAt: iso(value.assetUpdatedAt), features: value.features.slice(0,30).map(f => ({title: plain(f.title).slice(0,120), text: plain(f.text).slice(0,1200)})), mobile: validMobile(value.mobile)};
}
export function releaseDate(release) { return release.assetUpdatedAt || release.publishedAt; }
export function dateLabel(value) { return value ? new Intl.DateTimeFormat('ru-RU', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'}).format(new Date(value)) : ''; }
