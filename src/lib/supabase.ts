import { createClient } from '@supabase/supabase-js';
import { failure, type Result } from '../domain/result';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const supabase = url && key
  ? createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } })
  : null;
export async function checkGoogleProvider(): Promise<Result<boolean>> {
  if (!url || !key) return failure('VALIDATION', 'The administrator needs to connect Supabase first.');
  try {
    const response = await fetch(url + '/auth/v1/settings', { headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) return failure('NETWORK', 'Sign-in settings could not be checked. Please try again.');
    const settings: unknown = await response.json();
    if (!settings || typeof settings !== 'object' || !('external' in settings)
      || !settings.external || typeof settings.external !== 'object' || !('google' in settings.external)
      || typeof settings.external.google !== 'boolean') return failure('VALIDATION', 'Google sign-in settings could not be verified.');
    return { ok: true, value: settings.external.google };
  } catch { return failure('NETWORK', 'Google sign-in could not be checked. Check your connection and try again.'); }
}
