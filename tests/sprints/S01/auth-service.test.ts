import { installTestLocks } from '../../support/web-locks';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { createAuthService } from '../../../src/features/auth/auth-service';
import { readDeviceSession, setDeviceSession } from '../../../src/lib/device-session';

let locks: ReturnType<typeof installTestLocks>;
beforeEach(() => {
  locks = installTestLocks();
  localStorage.removeItem('gather-sign-out-pending');
});
afterEach(() => locks.restore());
const session = { user: { id: '11111111-1111-4111-8111-111111111111' } } as Session;
function clientFixture(
  options: {
    session?: Session | null;
    rpcError?: string;
    signOutError?: string;
    malformed?: boolean;
    expired?: boolean;
    foreignUser?: boolean;
  } = {},
) {
  let rpcCalls = 0;
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: options.session === undefined ? session : options.session },
        error: null,
      }),
      getUser: async () => ({
        data: {
          user: options.foreignUser ? { id: '33333333-3333-4333-8333-333333333333' } : session.user,
        },
        error: options.expired ? { message: 'JWT expired' } : null,
      }),
      signInWithOAuth: async () => ({
        data: { provider: 'google', url: 'https://accounts.google.com/' },
        error: null,
      }),
      signOut: async () => ({
        error: options.signOutError ? { message: options.signOutError } : null,
      }),
    },
    rpc: async (name: string) => {
      if (name !== 'ensure_personal_workspace') throw new Error('Unexpected operation');
      rpcCalls++;
      return options.rpcError
        ? { data: null, error: { message: options.rpcError } }
        : {
            data: options.malformed
              ? { wrong: true }
              : {
                  profileId: session.user.id,
                  workspaceId: '22222222-2222-4222-8222-222222222222',
                  displayName: 'Maria',
                  avatarUrl: null,
                },
            error: null,
          };
    },
  } as unknown as SupabaseClient;
  return { client, rpcCalls: () => rpcCalls };
}
describe('Google auth boundary', () => {
  it('returns an actionable configuration error rather than a fake session', async () => {
    const result = await createAuthService(null).signInWithGoogle();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });
  it('requires a session before workspace initialization', async () => {
    const fixture = clientFixture({ session: null });
    const result = await createAuthService(fixture.client).finishSignIn();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNAUTHENTICATED');
    expect(fixture.rpcCalls()).toBe(0);
  });
  it('returns the persisted workspace identity consistently across repeated initialization', async () => {
    const service = createAuthService(clientFixture().client);
    const first = await service.finishSignIn();
    const second = await service.finishSignIn();
    expect(first).toEqual({
      ok: true,
      value: {
        profileId: session.user.id,
        workspaceId: '22222222-2222-4222-8222-222222222222',
        displayName: 'Maria',
        avatarUrl: null,
      },
    });
    expect(second).toEqual(first);
    // Database uniqueness/idempotence still requires the SQL integration test.
  });
  it.each([{ expired: true }, { foreignUser: true }])(
    'rejects an expired or mismatched verified identity before initialization: %j',
    async (options) => {
      const fixture = clientFixture(options);
      const result = await createAuthService(fixture.client).finishSignIn();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('UNAUTHENTICATED');
      expect(fixture.rpcCalls()).toBe(0);
    },
  );
  it('does not report successful initialization when the server fails', async () => {
    const result = await createAuthService(
      clientFixture({ rpcError: 'database unavailable' }).client,
    ).finishSignIn();
    expect(result.ok).toBe(false);
  });
  it('rejects a malformed profile response at the trust boundary', async () => {
    const result = await createAuthService(
      clientFixture({ malformed: true }).client,
    ).finishSignIn();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });
  it('stays on the website with a useful error when Google is disabled', async () => {
    const service = createAuthService(clientFixture().client, async () => ({
      ok: true,
      value: false,
    }));
    const result = await service.signInWithGoogle();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });
  it('removes the device profile before reporting signed out', async () => {
    await setDeviceSession(session.user.id);
    expect(await readDeviceSession()).toEqual({ profileId: session.user.id, signedOut: false });
    const result = await createAuthService(clientFixture().client).signOut();
    expect(result.ok).toBe(true);
    expect(await readDeviceSession()).toBeNull();
  });
});
