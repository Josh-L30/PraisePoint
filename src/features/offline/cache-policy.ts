export type ShellEntry = { url: string; integrity?: string; revision?: string | null };
export function isOfflineNavigation(url: URL, origin: string): boolean {
  return (
    url.origin === origin &&
    !/^\/(?:auth\/callback|api|rest|functions|storage|oauth)(?:\/|$)/.test(url.pathname)
  );
}
export function validateShellEntries(entries: ShellEntry[]): boolean {
  if (
    !entries.length ||
    entries.length > 512 ||
    new Set(entries.map((entry) => entry.url)).size !== entries.length
  )
    return false;
  if (
    entries.some(
      (entry) =>
        !/^(?:index\.html|assets\/[a-zA-Z0-9_.-]+\.(?:js|css)|fonts\/Figtree\.ttf|(?:icon|ccf-logo)\.svg|manifest\.webmanifest)$/.test(
          entry.url,
        ) || !/^sha256-[A-Za-z0-9+/]{43}=$/.test(entry.integrity ?? ''),
    )
  )
    return false;
  return (
    entries.some((entry) => entry.url === 'index.html') &&
    entries.some((entry) => entry.url.endsWith('.js')) &&
    entries.some((entry) => entry.url.endsWith('.css')) &&
    entries.some((entry) => entry.url === 'fonts/Figtree.ttf')
  );
}

export function hasExclusiveLease(
  held: readonly { name?: string; mode?: string; clientId?: string }[],
  name: string,
  clientId: string,
): boolean {
  return held.some(
    (lock) => lock.name === name && lock.mode === 'exclusive' && lock.clientId === clientId,
  );
}

export const updateProofName = (nonce: string) => 'gather-update-proof:' + nonce;
export function hasUpdateProof(
  held: readonly { name?: string; mode?: string; clientId?: string }[],
  name: string,
  nonce: unknown,
): boolean {
  if (typeof nonce !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(nonce))
    return false;
  const owner = held.find((lock) => lock.name === name && lock.mode === 'exclusive')?.clientId;
  return !!owner && hasExclusiveLease(held, updateProofName(nonce), owner);
}
