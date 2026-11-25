import { dateLabel, releaseDate } from '../js/release.js';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderRelease(html, release) {
  const e = escapeHTML, date = releaseDate(release);
  html = html.replace(/(<span\b[^>]*data-version[^>]*>)[^<]*(<\/span>)/g, `$1${e(release.version)}$2`)
    .replace(/(<span\b[^>]*data-size[^>]*>)[^<]*(<\/span>)/g, `$1${e(release.size)} МБ$2`)
    .replace(/<a\b[^>]*data-download[^>]*>/g, tag => tag.replace(/href="[^"]*"/, `href="${e(release.url)}"`))
    .replace(/<a\b[^>]*data-release-link[^>]*>/g, tag => tag.replace(/href="[^"]*"/, `href="${e(release.releaseUrl)}"`))
    .replace(/(<h3 data-release-name>)[\s\S]*?(<\/h3>)/, `$1${e(release.name)}$2`)
    .replace(/<time data-release-date[^>]*>[\s\S]*?<\/time>/, `<time data-release-date${date ? ` datetime="${e(date)}"` : ' hidden'}>${e(dateLabel(date))}</time>`)
    .replace(/(<p data-release-summary>)[\s\S]*?(<\/p>)/, `$1${e(release.summary)}$2`)
    .replace(/(<ul id="release-features">)[\s\S]*?(<\/ul>)/, `$1${release.features.map(f => `<li><strong>${e(f.title)}</strong>${f.text ? ` — ${e(f.text)}` : ''}</li>`).join('')}$2`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>Moku — живой островок для Windows · ${e(release.version)}</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1Moku ${e(release.version)} — живой островок для Windows$2`);
  const m = release.mobile;
  html = html.replace(/\bdata-apk(?: hidden)?(?=[\s>])/g, m ? 'data-apk' : 'data-apk hidden');
  if (m) html = html.replace(/(<span\b[^>]*data-apk-version[^>]*>)[^<]*(<\/span>)/g, `$1${e(m.version)}$2`)
    .replace(/(<span\b[^>]*data-apk-size[^>]*>)[^<]*(<\/span>)/g, `$1${e(String(m.size).replace('.', ','))} МБ$2`)
    .replace(/<a\b[^>]*data-apk-download[^>]*>/g, tag => tag.replace(/href="[^"]*"/, `href="${e(m.url)}"`));
  return html;
}
