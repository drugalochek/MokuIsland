/** Only use an actual stable x64 installer; its filename owns the displayed version. */
export function installerFromRelease(release) {
  if (!release || release.draft || release.prerelease || !Array.isArray(release.assets)) return null;
  const assets = release.assets.flatMap(asset => {
    const match = /^Moku-Setup-(\d+(?:\.\d+){1,3})-x64\.exe$/i.exec(asset.name || '');
    if (!match) return [];
    try {
      const url = new URL(asset.browser_download_url);
      if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !url.pathname.startsWith('/drugalochek/Moku/releases/download/')) return [];
      return [{ version: match[1], url: url.href, size: Math.round((Number(asset.size) || 0) / 1048576) }];
    } catch { return []; }
  });
  assets.sort((a, b) => {
    const av = a.version.split('.').map(Number), bv = b.version.split('.').map(Number);
    for (let i = 0; i < Math.max(av.length, bv.length); i++) if ((av[i] || 0) !== (bv[i] || 0)) return (bv[i] || 0) - (av[i] || 0);
    return 0;
  });
  return assets[0] || null;
}
