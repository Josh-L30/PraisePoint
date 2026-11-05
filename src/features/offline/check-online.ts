import { failure } from '../../domain/result';
import { checkPreparedRevision } from './check-revision';
/** This module is imported only after the user explicitly requests an online check. */
export async function checkPreparedOnline(profileId: string, packageId: string) {
  try {
    const [{ supabase }, { createClient }, { createServiceService }] = await Promise.all([
      import('../../lib/supabase'),
      import('@supabase/supabase-js'),
      import('../services/service-service'),
    ]);
    if (!supabase)
      return failure(
        'NETWORK',
        'Online changes could not be checked. The saved copy remains available.',
      );
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session || data.session.user.id !== profileId)
      return failure(
        'UNAUTHENTICATED',
        'Sign in online with this device profile before checking for changes.',
      );
    const scoped = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { headers: { Authorization: 'Bearer ' + data.session.access_token } },
      },
    );
    return await checkPreparedRevision(
      profileId,
      packageId,
      createServiceService(scoped).buildServiceSnapshot,
    );
  } catch {
    return failure(
      'NETWORK',
      'Online changes could not be checked. The complete saved copy remains available.',
    );
  }
}
