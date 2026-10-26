import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureInvitation, readPendingInvitation, clearPendingInvitation } from '../../../src/features/workspaces/invitation-state';
const token = 'ab'.repeat(32);
beforeEach(() => { sessionStorage.clear(); history.replaceState({ key: 'test-page' },'', '/invite'); });
describe('invitation handoff across Google sign-in', () => {
  it('captures the fragment, immediately scrubs it, and preserves route state', () => {
    history.replaceState({ key: 'keep-this' },'', '/invite?source=team#token=' + token);
    expect(captureInvitation()).toEqual({ ok: true, value: token });
    expect(location.hash).toBe('');
    expect(location.search).toBe('?source=team');
    expect(history.state).toEqual({ key: 'keep-this' });
    expect(readPendingInvitation()).toBe(token);
  });
  it('restores the invitation after the OAuth redirect returns without a fragment', () => {
    history.replaceState(null,'','/invite#token=' + token);
    captureInvitation();
    history.replaceState(null,'','/invite');
    expect(captureInvitation()).toEqual({ ok: true, value: token });
  });
  it('rejects duplicate or invalid new links and discards an older pending invite', () => {
    history.replaceState(null,'','/invite#token=' + token);
    captureInvitation();
    history.replaceState(null,'','/invite#token=' + token + '&token=' + token);
    const result = captureInvitation();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    expect(location.hash).toBe('');
    expect(readPendingInvitation()).toBeNull();
  });
  it('reports blocked storage before starting an OAuth handoff, without exposing the token', () => {
    history.replaceState(null,'','/invite#token=' + token);
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(() => { throw new DOMException('Blocked','SecurityError'); });
    const result = captureInvitation();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('STORAGE_UNAVAILABLE');
      expect(result.error.message).not.toContain(token);
    }
    expect(location.hash).toBe('');
  });
  it('clears only the invitation after processing', () => {
    history.replaceState(null,'','/invite#token=' + token);
    captureInvitation();
    expect(readPendingInvitation()).toBe(token);
    sessionStorage.setItem('other-app-state','keep');
    clearPendingInvitation();
    expect(readPendingInvitation()).toBeNull();
    expect(sessionStorage.getItem('other-app-state')).toBe('keep');
  });
  it('rejects an oversized fragment before retaining any invitation', () => {
    history.replaceState(null,'','/invite#token=' + 'a'.repeat(600));
    const result = captureInvitation();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    expect(location.hash).toBe('');
    expect(readPendingInvitation()).toBeNull();
  });
});
