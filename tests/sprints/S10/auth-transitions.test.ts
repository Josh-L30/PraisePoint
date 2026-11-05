import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import { createAuthService } from '../../../src/features/auth/auth-service';
import {
  setDeviceSession,
  readDeviceSession,
  purgeProfileData,
} from '../../../src/lib/device-session';
import { openBrowserDB } from '../../../src/lib/browser-db';
import { installTestLocks } from '../../support/web-locks';
const runtime = vi.hoisted(() => ({ busy: 0 }));
vi.mock('../../../src/features/offline/runtime-client', () => ({
  markRuntimeBusy: () => {
    runtime.busy++;
    return () => {
      runtime.busy--;
    };
  },
  acquireRuntimeActivity: vi.fn(),
}));
const a = 'a1000000-0000-4000-8000-000000000001',
  b = 'a1000000-0000-4000-8000-000000000002';
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture() {
  let current: string | null = a;
  const client = {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: current ? ({ user: { id: current }, access_token: current } as Session) : null,
        },
        error: null,
      })),
      getUser: vi.fn(async () => ({
        data: { user: current ? { id: current } : null },
        error: null,
      })),
      signOut: vi.fn(async () => {
        current = null;
        return { error: null };
      }),
    },
    rpc: vi.fn(async () => ({ data: profile(current!), error: null })),
  } as unknown as SupabaseClient;
  return {
    client,
    change: (id: string | null) => {
      current = id;
    },
  };
}
const profile = (id: string) => ({
  profileId: id,
  workspaceId: 'a1000000-0000-4000-8000-000000000003',
  displayName: 'Volunteer',
  avatarUrl: null,
});
let locks: ReturnType<typeof installTestLocks>;
beforeEach(() => {
  localStorage.clear();
  runtime.busy = 0;
  locks = installTestLocks();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await purgeProfileData(a);
  await purgeProfileData(b);
  localStorage.clear();
  locks.restore();
});
it('a delayed A response cannot purge media committed by profile B in another tab', async () => {
  const f = fixture(),
    response = deferred<{ data: ReturnType<typeof profile>; error: null }>();
  vi.mocked(f.client.rpc).mockImplementationOnce(() => response.promise as never);
  const old = createAuthService(f.client).finishSignIn();
  await vi.waitFor(() => expect(f.client.rpc).toHaveBeenCalledOnce());
  f.change(b);
  expect((await createAuthService(f.client).finishSignIn()).ok).toBe(true);
  const db = await openBrowserDB();
  await db.put('mediaFiles', {
    profileId: b,
    descriptor: {
      id: crypto.randomUUID(),
      workspaceId: profile(b).workspaceId,
      kind: 'video',
      location: 'local',
      mime: 'video/mp4',
      bytes: 3,
      sha256: 'a'.repeat(64),
      revision: 1,
      originalName: 'Keep original.mp4',
    },
    blob: new Blob(['abc']),
  });
  db.close();
  response.resolve({ data: profile(a), error: null });
  expect((await old).ok).toBe(false);
  expect(await readDeviceSession()).toMatchObject({ profileId: b, signedOut: false });
  const check = await openBrowserDB();
  expect(await check.count('mediaFiles')).toBe(1);
  check.close();
});
it('a delayed completion after sign-out cannot recreate device access', async () => {
  const f = fixture(),
    response = deferred<{ data: ReturnType<typeof profile>; error: null }>(),
    service = createAuthService(f.client);
  vi.mocked(f.client.rpc).mockImplementationOnce(() => response.promise as never);
  await setDeviceSession(a);
  const old = service.finishSignIn();
  await vi.waitFor(() => expect(f.client.rpc).toHaveBeenCalledOnce());
  expect((await service.signOut()).ok).toBe(true);
  response.resolve({ data: profile(a), error: null });
  expect((await old).ok).toBe(false);
  expect(await readDeviceSession()).toBeNull();
});
it('refuses a competing sign-in while another tab is completing logout', async () => {
  const first = fixture(),
    second = fixture(),
    gate = deferred<{ error: null }>();
  second.change(b);
  vi.mocked(first.client.auth.signOut).mockImplementationOnce(() => gate.promise);
  await setDeviceSession(a);
  const logout = createAuthService(first.client).signOut();
  await vi.waitFor(() => expect(first.client.auth.signOut).toHaveBeenCalledOnce());
  let finished = false;
  const login = createAuthService(second.client)
    .finishSignIn()
    .then((value) => {
      finished = true;
      return value;
    });
  await new Promise((resolve) => setTimeout(resolve, 25));
  expect(finished).toBe(true);
  expect((await login).ok).toBe(false);
  gate.resolve({ error: null });
  await logout;
  expect(locks.request).toHaveBeenCalled();
});
it('holds runtime busy until token removal has completed', async () => {
  const f = fixture(),
    gate = deferred<{ error: null }>();
  vi.mocked(f.client.auth.signOut).mockImplementationOnce(() => gate.promise);
  await setDeviceSession(a);
  const logout = createAuthService(f.client).signOut();
  await vi.waitFor(() => expect(f.client.auth.signOut).toHaveBeenCalledOnce());
  expect(runtime.busy).toBeGreaterThan(0);
  gate.resolve({ error: null });
  await logout;
  expect(runtime.busy).toBe(0);
});
it('a failed token removal cannot silently sign back in after a reload', async () => {
  const f = fixture();
  await setDeviceSession(a);
  vi.mocked(f.client.auth.signOut).mockResolvedValueOnce({
    error: { message: 'Offline' },
  } as never);
  expect((await createAuthService(f.client).signOut()).ok).toBe(false);
  expect((await createAuthService(f.client).finishSignIn()).ok).toBe(false);
  expect(await readDeviceSession()).toBeNull();
});
it('failed cleanup remains blocked on reload and can be retried explicitly', async () => {
  const f = fixture();
  await setDeviceSession(a);
  const remove = vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(() => {
    throw new Error('Synthetic cleanup failure');
  });
  expect((await createAuthService(f.client).signOut()).ok).toBe(false);
  remove.mockRestore();
  expect((await createAuthService(f.client).finishSignIn()).ok).toBe(false);
  expect(await readDeviceSession()).toMatchObject({ signedOut: true });
  expect((await createAuthService(f.client).signOut()).ok).toBe(true);
  expect(await readDeviceSession()).toBeNull();
});
