import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createWorkspaceService } from '../../../src/features/workspaces/workspace-service';
const churchId = '11111111-1111-4111-8111-111111111111';
const personId = '22222222-2222-4222-8222-222222222222';
const origin = 'https://gather.example';
function fixture(
  options: { data?: unknown; rows?: unknown; code?: string; throws?: boolean } = {},
) {
  const calls: { name: string; args: unknown }[] = [];
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    order: async () => ({ data: options.rows ?? [], error: null }),
  };
  const client = {
    from: () => query,
    rpc: async (name: string, args: unknown) => {
      calls.push({ name, args });
      if (options.throws) throw new Error('connection unavailable');
      return {
        data: options.data ?? null,
        error: options.code ? { code: options.code, message: 'internal table details' } : null,
      };
    },
  } as unknown as SupabaseClient;
  return { service: createWorkspaceService(client, origin), calls };
}
describe('workspace service trust boundary', () => {
  it('rejects blank and overlong names before making a server request', async () => {
    const { service, calls } = fixture();
    for (const name of ['   ', 'x'.repeat(121)]) {
      const result = await service.createChurch(name);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    }
    expect(calls).toHaveLength(0);
  });
  it('validates UUIDs and invitation tokens before mutation', async () => {
    const { service, calls } = fixture();
    for (const result of [
      await service.inviteMember('wrong', 'member@example.invalid'),
      await service.removeMember(churchId, 'wrong'),
      await service.transferOwner('wrong', personId),
      await service.revokeInvite(churchId, 'wrong'),
      await service.leaveChurch('wrong'),
      await service.acceptInvite('bad-token'),
    ]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('VALIDATION');
    }
    expect(calls).toHaveLength(0);
  });
  it('normalizes names and requires a verified UUID response', async () => {
    const good = fixture({ data: churchId });
    expect(await good.service.createChurch('  Church team  ')).toEqual({
      ok: true,
      value: churchId,
    });
    expect(good.calls[0]).toEqual({
      name: 'create_church_workspace',
      args: { p_name: 'Church team' },
    });
    const bad = await fixture({ data: 'not-a-workspace' }).service.createChurch('Church team');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe('VALIDATION');
  });
  it('normalizes recipient email and keeps the single-use token out of the URL query', async () => {
    const token = 'ab'.repeat(32),
      expiresAt = '2026-11-03T00:00:00+00:00';
    const { service, calls } = fixture({ data: { id: personId, token, expiresAt } });
    const result = await service.inviteMember(churchId, ' Member@Example.Invalid ');
    expect(result).toEqual({
      ok: true,
      value: { url: origin + '/invite#token=' + token, expiresAt },
    });
    expect(calls[0].args).toEqual({ p_workspace_id: churchId, p_email: 'member@example.invalid' });
    if (result.ok) expect(new URL(result.value.url).search).toBe('');
  });
  it('rejects malformed server invitation data', async () => {
    const result = await fixture({
      data: { id: personId, token: 'short', expiresAt: 'tomorrow' },
    }).service.inviteMember(churchId, 'member@example.invalid');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });
  it('maps authorization failures without displaying internal SQL details', async () => {
    const result = await fixture({ code: '42501' }).service.removeMember(churchId, personId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FORBIDDEN');
      expect(result.error.message).not.toContain('internal table');
    }
  });
  it('reports capacity and unknown transport failures without success', async () => {
    const limit = await fixture({ code: 'P0001' }).service.inviteMember(
      churchId,
      'member@example.invalid',
    );
    expect(limit.ok).toBe(false);
    if (!limit.ok) expect(limit.error.code).toBe('CAPACITY');
    const network = await fixture({ throws: true }).service.createChurch('Church team');
    expect(network.ok).toBe(false);
    if (!network.ok) expect(network.error.code).toBe('NETWORK');
  });
  it('rejects unknown roles rather than enabling owner controls', async () => {
    const result = await fixture({
      rows: [
        {
          role: 'admin',
          workspaces: { id: churchId, kind: 'church', name: 'Team', owner_id: personId },
        },
      ],
    }).service.list();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });
  it('returns a useful configuration failure when Supabase is absent', async () => {
    const result = await createWorkspaceService(null, origin).createChurch('Church team');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });
  it('rejects an unsafe avatar response as validation rather than a transport failure', async () => {
    const result = await fixture({
      data: [{ userId: personId, displayName: 'Volunteer', avatarUrl: 'https://', role: 'member' }],
    }).service.team(churchId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION');
  });
});
