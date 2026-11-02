const seenKey = 'praisepoint-entrance-seen';

export function shouldPlayLoginEntrance() {
  if (typeof window.matchMedia !== 'function' || !navigator.onLine) return false;
  if (!window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return sessionStorage.getItem(seenKey) !== '1'; } catch { return false; }
}

export function rememberLoginEntrance() {
  try { sessionStorage.setItem(seenKey, '1'); } catch { /* Login remains available when storage is blocked. */ }
}
