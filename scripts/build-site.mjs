import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir, rm, cp, readdir} from 'node:fs/promises';
import {releaseFromGitHub, validSnapshot, compareVersions, RELEASE_API} from '../js/release.js';
import {renderRelease} from './render-release.mjs';
let release = validSnapshot(JSON.parse(await readFile('release.json', 'utf8')));
if (process.env.RELEASE_FIXTURE) {
  release = releaseFromGitHub(JSON.parse(await readFile(process.env.RELEASE_FIXTURE, 'utf8')));
} else {
  try {
    const response = await fetch(RELEASE_API, {headers:{Accept:'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? {Authorization:`Bearer ${process.env.GITHUB_TOKEN}`} : {})}, signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
    const next = releaseFromGitHub(await response.json());
    if (!next) throw new Error('Stable x64 installer not found');
    release = next;
  } catch (error) { console.warn(`Release source unavailable: ${error.message}. Trying the previously published snapshot.`);
    try {
      const response = await fetch('https://drugalochek.github.io/MokuIsland/release.json', {signal:AbortSignal.timeout(10000), cache:'no-store'});
      const previous = response.ok ? validSnapshot(await response.json()) : null;
      if (previous && (!release || compareVersions(previous.version, release.version) >= 0)) release = previous;
    } catch { /* A checked-in real installer remains the final offline fallback. */ } }
}
if (!release) throw new Error('No valid installer snapshot; refusing to publish broken download links.');
await rm('dist', {recursive:true, force:true}); await mkdir('dist');
for (const file of ['styles.css','js','assets','Moku.ico','.nojekyll']) await cp(file, `dist/${file}`, {recursive:true});
// Keep only the original social preview image from the root, never source archives or credentials.
for (const file of await readdir('.')) if (/\.png$/i.test(file)) await cp(file, `dist/${file}`);
const scripts = (await readdir('dist/js')).filter(f => f.endsWith('.js')).sort();
const hash = createHash('sha256').update(await readFile('dist/styles.css'));
for (const file of scripts) hash.update(await readFile(`dist/js/${file}`));
const cacheKey = hash.digest('hex').slice(0, 12);
for (const file of scripts) {
  const text = await readFile(`dist/js/${file}`, 'utf8');
  await writeFile(`dist/js/${file}`, text.replace(/(['"])(\.\/[a-zA-Z0-9_.-]+\.js)(?:\?[^'"]*)?\1/g, (_, q, path) => `${q}${path}?v=${cacheKey}${q}`));
}
let html = renderRelease(await readFile('index.html','utf8'), release);
html = html.replace(/((?:src|href)=")(styles\.css|js\/[a-zA-Z0-9_.-]+\.js)(?:\?[^"]*)?(")/g, (_, prefix, path, quote) => `${prefix}${path}?v=${cacheKey}${quote}`);
await writeFile('dist/index.html', html);
await writeFile('dist/release.json', JSON.stringify(release, null, 2)+'\n');
console.log(`Built Moku ${release.version}; ${release.size} MiB; ${release.features.length} release features.`);
