import { failure, type Result } from '../../domain/result';
import { INVITATION_TOKEN_PATTERN } from '../../domain/limits';
const key = 'gather-pending-invitation';
export function readPendingInvitation(): string | null {
  try {
    const value = sessionStorage.getItem(key);
    if (value && INVITATION_TOKEN_PATTERN.test(value)) return value;
    sessionStorage.removeItem(key);
  } catch {
    /* An unavailable handoff cannot trigger an automatic redirect. */
  }
  return null;
}
export function clearPendingInvitation(): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* A consumed token cannot be reused. */
  }
}
export function captureInvitation(): Result<string> {
  const fragment = window.location.hash;
  if (!fragment) {
    const pending = readPendingInvitation();
    return pending
      ? { ok: true, value: pending }
      : failure('VALIDATION', 'Open the invitation link your church owner shared with you.');
  }
  try {
    history.replaceState(history.state, '', window.location.pathname + window.location.search);
    sessionStorage.removeItem(key);
    if (fragment.length > 512) return failure('VALIDATION', 'This invitation link is not valid.');
    const params = new URLSearchParams(fragment.slice(1)),
      tokens = params.getAll('token');
    if (tokens.length !== 1 || !INVITATION_TOKEN_PATTERN.test(tokens[0]))
      return failure('VALIDATION', 'This invitation link is not valid.');
    sessionStorage.setItem(key, tokens[0]);
    return { ok: true, value: tokens[0] };
  } catch {
    return failure(
      'STORAGE_UNAVAILABLE',
      'Your browser could not keep the invitation for sign-in. Allow browser storage, then reopen the original invitation link.',
    );
  }
}
