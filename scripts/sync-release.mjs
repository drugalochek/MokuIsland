// Updates the files GitHub Pages serves from main (index.html, release.json) with the latest Moku release.
import {readFile, writeFile} from 'node:fs/promises';
import {releaseFromGitHub, validSnapshot, RELEASE_API} from '../js/release.js';
import {renderRelease} from './render-release.mjs';
let release;
if (process.env.RELEASE_FIXTURE) release = releaseFromGitHub(JSON.parse(await readFile(process.env.RELEASE_FIXTURE, 'utf8')));
else {
  const response = await fetch(RELEASE_API, {headers:{Accept:'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? {Authorization:`Bearer ${process.env.GITHUB_TOKEN}`} : {})}, signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  release = releaseFromGitHub(await response.json());
}
release = validSnapshot(release);
if (!release) throw new Error('Stable x64 installer not found; keeping the published files.');
await writeFile('index.html', renderRelease(await readFile('index.html', 'utf8'), release));
await writeFile('release.json', JSON.stringify(release, null, 2) + '\n');
console.log(`Synced Moku ${release.version}${release.mobile ? ` + Moku Mobile ${release.mobile.version}` : ''}.`);
