import { expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthService } from '../../../src/features/auth/auth-service';
it('opens the Google account chooser for volunteers sharing a laptop', async () => {
  let options: unknown;
  const client = {
    auth: {
      signInWithOAuth: async (request: { options: unknown }) => {
        options = request.options;
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
  const result = await createAuthService(client, async () => ({
    ok: true,
    value: true,
  })).signInWithGoogle();
  expect(result.ok).toBe(true);
  expect(options).toMatchObject({ queryParams: { prompt: 'select_account' } });
});
