import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { failure, type Result } from '../../domain/result';
import { LIMITS, INVITATION_TOKEN_PATTERN } from '../../domain/limits';
import { supabase } from '../../lib/supabase';
export type Workspace = { id: string; kind: 'personal' | 'church'; name: string; ownerId: string; role: 'owner' | 'member';deletionPending?:boolean };
export type TeamMember = { userId: string; displayName: string; avatarUrl: string | null; role: 'owner' | 'member' };
export type Invitation = { id: string; email: string; expiresAt: string; acceptedAt: string | null; revokedAt: string | null };
export type WorkspaceService = {
  list(): Promise<Result<Workspace[]>>;
  team(workspaceId: string): Promise<Result<TeamMember[]>>;
  invitations(workspaceId: string): Promise<Result<Invitation[]>>;
  createChurch(name: string): Promise<Result<string>>;
  beginDeleteChurch(workspaceId:string,expectedName:string):Promise<Result<void>>;
  deleteChurch(workspaceId:string,expectedName:string):Promise<Result<void>>;
  inviteMember(workspaceId: string, email: string): Promise<Result<{ url: string; expiresAt: string }>>;
  acceptInvite(token: string): Promise<Result<string>>;
  revokeInvite(workspaceId: string, invitationId: string): Promise<Result<void>>;
  removeMember(workspaceId: string, userId: string): Promise<Result<void>>;
  transferOwner(workspaceId: string, newOwnerId: string): Promise<Result<void>>;
  leaveChurch(workspaceId: string): Promise<Result<void>>;
};
export function createWorkspaceService(client: SupabaseClient | null, origin: string): WorkspaceService {
  const id = z.uuid(), role = z.enum(['owner','member']);
  const nameSchema = z.string().trim().min(1).max(LIMITS.nameCharacters);
  const emailSchema = z.string().trim().max(LIMITS.emailCharacters).email().transform(value => value.toLowerCase());
  const tokenSchema = z.string().regex(INVITATION_TOKEN_PATTERN);
  const date = z.iso.datetime({ offset: true });
  const avatar = z.url().refine(value => value.startsWith('https://')).nullable();
  const teamSchema = z.array(z.object({ userId: id, displayName: z.string().min(1).max(LIMITS.nameCharacters), avatarUrl: avatar, role }).strict());
  const membershipSchema = z.array(z.object({ role, workspaces: z.object({
    id, kind: z.enum(['personal','church']), name: z.string().min(1).max(LIMITS.nameCharacters), owner_id: id,deletion_pending:z.boolean().optional().default(false),
  }).strict() }).strict());
  const invitationSchema = z.array(z.object({ id, normalized_email: z.string().email(), expires_at: date,
    accepted_at: date.nullable(), revoked_at: date.nullable() }).strict());
  const receiptSchema = z.object({ id, token: tokenSchema, expiresAt: date }).strict();
  const invalidId = () => failure('VALIDATION','This workspace or volunteer address is not valid.');
  const unconfigured = () => failure('VALIDATION','The administrator needs to connect Supabase first.');
  function serverFailure(error: unknown): Result<never> {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
    switch (code) {
      case '28000': case 'PGRST301': return failure('UNAUTHENTICATED','Sign in with Google again to continue.');
      case '42501': return failure('FORBIDDEN','Your church permissions may have changed, or this workspace is unavailable. Refresh to continue.');
      case '22023': return failure('VALIDATION','Check the details and try again.');
      case '23505': return failure('CONFLICT','This workspace or membership already exists. You can create one church workspace per account.');
      case 'P0001': return failure('CAPACITY','You have reached the invitation limit. Try again next hour.');
      case 'P0002': return failure('NOT_FOUND','This volunteer or invitation is no longer available. Refresh the team.');
      default: return failure('NETWORK','This request could not be confirmed. Check your connection and refresh before trying again.');
    }
  }
  function verified<T>(schema: z.ZodType<T>, data: unknown): Result<T> {
    const parsed = schema.safeParse(data);
    return parsed.success ? { ok: true, value: parsed.data }
      : failure('VALIDATION','The workspace response could not be verified. Refresh and try again.');
  }
  async function rpc<T>(operation: string, args: Record<string, unknown>, schema: z.ZodType<T>): Promise<Result<T>> {
    if (!client) return unconfigured();
    try {
      const { data, error } = await client.rpc(operation,args);
      return error ? serverFailure(error) : verified(schema,data);
    } catch { return serverFailure(null); }
  }
  async function change(operation: string, args: Record<string, unknown>): Promise<Result<void>> {
    if (!client) return unconfigured();
    try {
      const { error } = await client.rpc(operation,args);
      return error ? serverFailure(error) : { ok: true, value: undefined };
    } catch { return serverFailure(null); }
  }
  async function deleteWorkspace(workspaceId:string,expectedName:string,beginOnly=false):Promise<Result<void>>{
      const name=nameSchema.safeParse(expectedName);if(!id.safeParse(workspaceId).success || !name.success)return invalidId();if(!client)return unconfigured();
      const responseSchema=z.discriminatedUnion('ok',[
        z.object({ok:z.literal(true),value:z.object({complete:z.boolean()}).strict()}).strict(),
        z.object({ok:z.literal(false),error:z.object({code:z.enum(['UNAUTHENTICATED','FORBIDDEN','VALIDATION','CONFLICT','CAPACITY','NOT_FOUND','UNSUPPORTED','STORAGE_UNAVAILABLE','NETWORK']),message:z.string().min(1).max(1000)}).strict()}).strict(),
      ]);
      try{for(let batch=0;batch<500;batch++){
        const {data,error}=await client.functions.invoke('media-upload',{headers:{'x-media-action':beginOnly?'begin-delete-workspace':'delete-workspace'},body:{workspaceId,expectedName:name.data}});let payload:unknown=data;
        if(error){if(error.context instanceof Response)payload=await error.context.json();else return serverFailure(null);}
        const parsed=responseSchema.safeParse(payload);if(!parsed.success)return serverFailure(null);if(!parsed.data.ok)return parsed.data;if(beginOnly || parsed.data.value.complete)return {ok:true,value:undefined};
      }return failure('NETWORK','Deletion is paused. Resume deletion from Church workspace to finish the remaining files.');}
      catch{return serverFailure(null);}
  }
  return {
    async list() {
      if (!client) return unconfigured();
      try {
        const { data, error } = await client.from('workspace_members').select('role,workspaces(id,kind,name,owner_id,deletion_pending)').order('created_at',{ ascending: true });
        if (error) return serverFailure(error);
        const parsed = verified(membershipSchema,data);
        return parsed.ok ? { ok: true, value: parsed.value.map(({ role: memberRole, workspaces: w }) => ({
          id: w.id, kind: w.kind, name: w.name, ownerId: w.owner_id, role: memberRole,...(w.deletion_pending?{deletionPending:true}:{}),
        })).sort((a,b) => Number(b.kind==='personal')-Number(a.kind==='personal') || a.name.localeCompare(b.name)) } : parsed;
      } catch { return serverFailure(null); }
    },
    async team(workspaceId) {
      return id.safeParse(workspaceId).success ? rpc('get_workspace_team',{ p_workspace_id: workspaceId },teamSchema) : invalidId();
    },
    async invitations(workspaceId) {
      if (!id.safeParse(workspaceId).success) return invalidId();
      if (!client) return unconfigured();
      try {
        const { data, error } = await client.from('invitations').select('id,normalized_email,expires_at,accepted_at,revoked_at')
          .eq('workspace_id',workspaceId).is('accepted_at',null).is('revoked_at',null).order('created_at',{ ascending: false });
        if (error) return serverFailure(error);
        const parsed = verified(invitationSchema,data);
        return parsed.ok ? { ok: true, value: parsed.value.map(i => ({
          id: i.id, email: i.normalized_email, expiresAt: i.expires_at, acceptedAt: i.accepted_at, revokedAt: i.revoked_at,
        })) } : parsed;
      } catch { return serverFailure(null); }
    },
    async createChurch(name) {
      const parsed = nameSchema.safeParse(name);
      return parsed.success ? rpc('create_church_workspace',{ p_name: parsed.data },id)
        : failure('VALIDATION','Use a church name between 1 and 120 characters.');
    },
    async inviteMember(workspaceId,email) {
      if (!id.safeParse(workspaceId).success) return invalidId();
      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) return failure('VALIDATION','Enter a valid volunteer email address.');
      let url: URL;
      try { url = new URL('/invite',origin); } catch { return failure('VALIDATION','The website address could not be verified.'); }
      if (!['http:','https:'].includes(url.protocol)) return failure('VALIDATION','The website address could not be verified.');
      const receipt = await rpc('create_team_invitation',{ p_workspace_id: workspaceId, p_email: parsed.data },receiptSchema);
      if (!receipt.ok) return receipt;
      url.hash = 'token=' + receipt.value.token;
      return { ok: true, value: { url: url.href, expiresAt: receipt.value.expiresAt } };
    },
    async acceptInvite(token) {
      if (!tokenSchema.safeParse(token).success) return failure('VALIDATION','This invitation link is not valid.');
      const result = await rpc('accept_team_invitation',{ p_token: token },id);
      return !result.ok && result.error.code==='FORBIDDEN'
        ? failure('FORBIDDEN','This invitation has expired, was used or revoked, or belongs to another Google account. Ask the owner for a new link and use the invited account.') : result;
    },
    async revokeInvite(workspaceId,invitationId) {
      return id.safeParse(workspaceId).success && id.safeParse(invitationId).success
        ? change('revoke_team_invitation',{ p_workspace_id: workspaceId, p_invitation_id: invitationId }) : invalidId();
    },
    async removeMember(workspaceId,userId) {
      return id.safeParse(workspaceId).success && id.safeParse(userId).success
        ? change('remove_workspace_member',{ p_workspace_id: workspaceId, p_user_id: userId }) : invalidId();
    },
    async transferOwner(workspaceId,newOwnerId) {
      return id.safeParse(workspaceId).success && id.safeParse(newOwnerId).success
        ? change('transfer_workspace_owner',{ p_workspace_id: workspaceId, p_new_owner_id: newOwnerId }) : invalidId();
    },
    beginDeleteChurch:(workspaceId,expectedName)=>deleteWorkspace(workspaceId,expectedName,true),
    deleteChurch:(workspaceId,expectedName)=>deleteWorkspace(workspaceId,expectedName),
    async leaveChurch(workspaceId) {
      return id.safeParse(workspaceId).success ? change('leave_church_workspace',{ p_workspace_id: workspaceId }) : invalidId();
    },
  };
}
export const workspaceService = createWorkspaceService(supabase,typeof window==='undefined' ? '' : window.location.origin);
