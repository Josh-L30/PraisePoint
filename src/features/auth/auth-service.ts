import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { failure, type Result } from '../../domain/result';
import { readDeviceSession, setDeviceSession, purgeProfileData } from '../../lib/device-session';
import { supabase, checkGoogleProvider } from '../../lib/supabase';

const profileSchema = z.object({
  profileId: z.uuid(), workspaceId: z.uuid(), displayName: z.string().min(1).max(120),
  avatarUrl: z.url().refine(url => new URL(url).protocol === 'https:').nullable(),
});
export type ProfileWorkspace = z.infer<typeof profileSchema>;
export type AuthService = {
  getSession(): Promise<Result<Session | null>>;
  signInWithGoogle(): Promise<Result<void>>;
  finishSignIn(): Promise<Result<ProfileWorkspace>>;
  signOut(): Promise<Result<void>>;
  subscribe(callback: () => void): () => void;
};
export function createAuthService(client: SupabaseClient | null, providerReady: () => Promise<Result<boolean>> = checkGoogleProvider): AuthService {
  return {
    async getSession() {
      if (!client) return { ok: true, value: null };
      try {
        const { data, error } = await client.auth.getSession();
        return error ? failure('NETWORK', 'Your session could not be checked. Try again.') : { ok: true, value: data.session };
      } catch { return failure('NETWORK', 'Your session could not be checked. Check your connection and try again.'); }
    },
    async signInWithGoogle() {
      if (!client) return failure('VALIDATION', 'Google sign-in is not ready. The administrator needs to connect Supabase first.');
      try {
        const ready = await providerReady();
        if (!ready.ok) return ready;
        if (!ready.value) return failure('FORBIDDEN', 'Google sign-in is not enabled yet. The administrator needs to finish connecting Google.');
        const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: {
          redirectTo: window.location.origin + '/auth/callback', scopes: 'openid email profile',
          queryParams: { prompt: 'select_account' },
        } });
        return error ? failure('NETWORK', 'Google sign-in could not start. Check your connection or ask the administrator to check Google settings.')
          : { ok: true, value: undefined };
      } catch { return failure('NETWORK', 'Google sign-in could not start. Check your connection and try again.'); }
    },
    async finishSignIn() {
      if (!client) return failure('VALIDATION', 'Supabase is not connected yet.');
      try {
        const sessionResult = await this.getSession();
        if (!sessionResult.ok) return sessionResult;
        if (!sessionResult.value) return failure('UNAUTHENTICATED', 'Sign in with Google to open your workspace.');
        const { data: verified, error: userError } = await client.auth.getUser();
        if (userError || !verified.user || verified.user.id !== sessionResult.value.user.id)
          return failure('UNAUTHENTICATED', 'Your session has expired. Sign in with Google again.');
        const { data, error } = await client.rpc('ensure_personal_workspace');
        if (error) return failure('NETWORK', 'Your workspace could not be opened. Try again, or ask the administrator to check the connection.');
        const parsed = profileSchema.safeParse(data);
        if (!parsed.success || parsed.data.profileId !== verified.user.id)
          return failure('VALIDATION', 'Your workspace response could not be verified. Please try again.');
        await setDeviceSession(parsed.data.profileId);
        return { ok: true, value: parsed.data };
      } catch { return failure('NETWORK', 'Your workspace could not be opened. Check your connection and try again.'); }
    },
    async signOut() {
      try {
        const device = await readDeviceSession();
        if (device) {
          const clean = await purgeProfileData(device.profileId);
          if (!clean.ok) return clean;
        }
        if (client) {
          const { error } = await client.auth.signOut({ scope: 'local' });
          if (error) return failure('NETWORK', 'Sign-out did not finish. Your local files were cleared; please try again.');
        }
        return { ok: true, value: undefined };
      } catch { return failure('STORAGE_UNAVAILABLE', 'Local data could not be cleared. Please try signing out again before changing accounts.'); }
    },
    subscribe(callback) {
      if (!client) return () => {};
      const { data } = client.auth.onAuthStateChange(event => {
        // Auth callbacks must not await other Supabase auth operations.
        if (event !== 'INITIAL_SESSION') queueMicrotask(callback);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
export const authService = createAuthService(supabase);
