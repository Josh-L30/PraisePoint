export type Theme = 'light' | 'dark';
const key = 'praisepoint-theme',
  eventName = 'praisepoint-theme-change';
let workspaceThemeEnabled = false;
function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(key);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}
function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new Event(eventName));
}
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(key, theme);
  } catch {
    /* The current session can still change theme. */
  }
  apply(theme);
}
function preferredTheme(): Theme {
  return (
    savedTheme() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}
export function setThemeAccess(authenticated: boolean) {
  workspaceThemeEnabled = authenticated;
  apply(authenticated ? preferredTheme() : 'light');
}
export function initializeTheme() {
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const update = () => apply(workspaceThemeEnabled ? preferredTheme() : 'light');
  update();
  system.addEventListener('change', update);
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) update();
  });
}
export function subscribeTheme(listener: () => void) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}
