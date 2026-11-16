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
await writeFile('dist/index.html', renderRelease(await readFile('index.html','utf8'), release));
await writeFile('dist/release.json', JSON.stringify(release, null, 2)+'\n');
console.log(`Built Moku ${release.version}; ${release.size} MiB; ${release.features.length} release features.`);
