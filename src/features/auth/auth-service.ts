import { acquireRuntimeActivity, markRuntimeBusy } from '../offline/runtime-client';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { failure, type Result } from '../../domain/result';
import {
  readDeviceSession,
  setDeviceSession,
  purgeProfileData,
  beginDeviceSignOut,
  completeDeviceSignOut,
  deviceSignOutPending,
} from '../../lib/device-session';
import { supabase, checkGoogleProvider } from '../../lib/supabase';

const profileSchema = z.object({
  profileId: z.uuid(),
  workspaceId: z.uuid(),
  displayName: z.string().min(1).max(120),
  avatarUrl: z
    .url()
    .refine((url) => new URL(url).protocol === 'https:')
    .nullable(),
});
export type ProfileWorkspace = z.infer<typeof profileSchema>;
export type AuthService = {
  getSession(): Promise<Result<Session | null>>;
  signInWithGoogle(): Promise<Result<void>>;
  finishSignIn(): Promise<Result<ProfileWorkspace>>;
  signOut(): Promise<Result<void>>;
  subscribe(callback: () => void): () => void;
};
async function protectAuth<T>(operation: () => Promise<Result<T>>): Promise<Result<T>> {
  const idle = markRuntimeBusy();
  let release: (() => void) | undefined;
  try {
    if (import.meta.env.PROD) {
      const lease = await acquireRuntimeActivity();
      if (!lease.ok) return lease;
      release = lease.value;
    }
    return await operation();
  } catch {
    return failure(
      'STORAGE_UNAVAILABLE',
      'This browser could not protect the account change. Close idle PraisePoint windows and retry.',
    );
  } finally {
    release?.();
    idle();
  }
}
async function deviceTransition<T>(operation: () => Promise<Result<T>>): Promise<Result<T>> {
  if (!navigator.locks)
    return failure(
      'UNSUPPORTED',
      'Use current Chrome or Edge to safely change accounts on this device.',
    );
  return navigator.locks.request('gather-device-auth-v1', { mode: 'exclusive' }, operation);
}
export function createAuthService(
  client: SupabaseClient | null,
  providerReady: () => Promise<Result<boolean>> = checkGoogleProvider,
): AuthService {
  let generation = 0;
  return {
    async getSession() {
      if (!client) return { ok: true, value: null };
      try {
        const { data, error } = await client.auth.getSession();
        return error
          ? failure('NETWORK', 'Your session could not be checked. Try again.')
          : { ok: true, value: data.session };
      } catch {
        return failure(
          'NETWORK',
          'Your session could not be checked. Check your connection and try again.',
        );
      }
    },
    async signInWithGoogle() {
      if (!client)
        return failure(
          'VALIDATION',
          'Google sign-in is not ready. The administrator needs to connect Supabase first.',
        );
      try {
        if (deviceSignOutPending()) {
          const clean = await this.signOut();
          if (!clean.ok) return clean;
        }
        const ready = await providerReady();
        if (!ready.ok) return ready;
        if (!ready.value)
          return failure(
            'FORBIDDEN',
            'Google sign-in is not enabled yet. The administrator needs to finish connecting Google.',
          );
        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/auth/callback',
            scopes: 'openid email profile',
            queryParams: { prompt: 'select_account' },
          },
        });
        return error
          ? failure(
              'NETWORK',
              'Google sign-in could not start. Check your connection or ask the administrator to check Google settings.',
            )
          : { ok: true, value: undefined };
      } catch {
        return failure(
          'NETWORK',
          'Google sign-in could not start. Check your connection and try again.',
        );
      }
    },
    async finishSignIn() {
      const request = ++generation;
      if (!client) return failure('VALIDATION', 'Supabase is not connected yet.');
      return protectAuth(async () => {
        try {
          if (deviceSignOutPending())
            return failure(
              'UNAUTHENTICATED',
              'Sign-out did not finish. Choose Continue with Google to retry cleanup before signing in.',
            );
          const sessionResult = await this.getSession();
          if (!sessionResult.ok) return sessionResult;
          if (!sessionResult.value)
            return failure('UNAUTHENTICATED', 'Sign in with Google to open your workspace.');
          const { data: verified, error: userError } = await client.auth.getUser();
          if (userError || !verified.user || verified.user.id !== sessionResult.value.user.id)
            return failure(
              'UNAUTHENTICATED',
              'Your session has expired. Sign in with Google again.',
            );
          const { data, error } = await client.rpc('ensure_personal_workspace');
          if (error)
            return failure(
              'NETWORK',
              'Your workspace could not be opened. Try again, or ask the administrator to check the connection.',
            );
          const parsed = profileSchema.safeParse(data);
          if (!parsed.success || parsed.data.profileId !== verified.user.id)
            return failure(
              'VALIDATION',
              'Your workspace response could not be verified. Please try again.',
            );
          return await deviceTransition(async () => {
            const current = await this.getSession();
            if (
              request !== generation ||
              deviceSignOutPending() ||
              !current.ok ||
              current.value?.user.id !== parsed.data.profileId
            )
              return failure(
                'UNAUTHENTICATED',
                'Your account changed. Reopen the current workspace.',
              );
            await setDeviceSession(parsed.data.profileId);
            return { ok: true, value: parsed.data };
          });
        } catch {
          return failure(
            'NETWORK',
            'Your workspace could not be opened. Check your connection and try again.',
          );
        }
      });
    },
    async signOut() {
      generation++;
      return protectAuth(async () => {
        try {
          beginDeviceSignOut();
          return await deviceTransition(async () => {
            const device = await readDeviceSession();
            if (device) {
              const clean = await purgeProfileData(device.profileId);
              if (!clean.ok) return clean;
            }
            if (client) {
              const { error } = await client.auth.signOut({ scope: 'local' });
              if (error)
                return failure(
                  'NETWORK',
                  'Sign-out did not finish. Local access stays blocked; choose Continue with Google to retry cleanup.',
                );
            }
            completeDeviceSignOut();
            return { ok: true, value: undefined };
          });
        } catch {
          return failure(
            'STORAGE_UNAVAILABLE',
            'Local data could not be cleared. Retry signing out before changing accounts.',
          );
        }
      });
    },
    subscribe(callback) {
      if (!client) return () => {};
      const { data } = client.auth.onAuthStateChange((event) => {
        // Auth callbacks must not await other Supabase auth operations.
        if (event !== 'INITIAL_SESSION') {
          generation++;
          queueMicrotask(callback);
        }
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
export const authService = createAuthService(supabase);
