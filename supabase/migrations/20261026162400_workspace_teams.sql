-- S02: shared workspaces. Limits match src/domain/limits.ts.
create table private.operation_budgets (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  operation text not null check (operation in ('invite','content')),
  window_start timestamptz not null,
  used integer not null check (used > 0),
  primary key(actor_id,operation)
);
alter table private.operation_budgets enable row level security;
revoke all on private.operation_budgets from public,anon,authenticated;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  normalized_email text not null check (normalized_email=lower(btrim(normalized_email)) and char_length(normalized_email) between 3 and 254),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (accepted_at is null or revoked_at is null)
);
create index invitations_workspace on public.invitations(workspace_id,created_at desc);
create index invitations_creator on public.invitations(created_by);
alter table public.invitations enable row level security;
revoke all on public.invitations from public,anon,authenticated;
grant select(id,workspace_id,normalized_email,expires_at,accepted_at,revoked_at,created_at) on public.invitations to authenticated;

-- These invoker helpers are executable only inside the private API bodies.
create function private.google_actor() returns uuid language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid();
begin
  if actor is null or coalesce(auth.jwt()->'app_metadata'->>'provider','')<>'google'
    or not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null
      and u.email is not null and u.raw_app_meta_data->>'provider'='google') then
    raise exception 'A verified Google identity is required.' using errcode='28000';
  end if;
  return actor;
end $$;

create function private.consume_operation(p_actor uuid,p_operation text) returns void language plpgsql security invoker set search_path='' as $$
declare bucket timestamptz; maximum integer; consumed integer;
begin
  if p_actor is null then raise exception 'Sign in first.' using errcode='28000'; end if;
  case p_operation
    when 'invite' then bucket:=date_trunc('hour',now()); maximum:=10;
    when 'content' then bucket:=date_trunc('minute',now()); maximum:=120;
    else raise exception 'Unknown operation.' using errcode='22023';
  end case;
  insert into private.operation_budgets as b(actor_id,operation,window_start,used)
    values(p_actor,p_operation,bucket,1)
    on conflict(actor_id,operation) do update set window_start=excluded.window_start,
      used=case when b.window_start=excluded.window_start then b.used+1 else 1 end
    returning used into consumed;
  if consumed>maximum then raise exception 'The operation limit has been reached. Try again later.' using errcode='P0001'; end if;
end $$;

-- Every church mutation locks the workspace before invitations or memberships.
create function private.lock_church(p_workspace_id uuid) returns public.workspaces language plpgsql security invoker set search_path='' as $$
declare church public.workspaces;
begin
  select * into church from public.workspaces where id=p_workspace_id and kind='church' for update;
  if not found then raise exception 'This church workspace is not available.' using errcode='42501'; end if;
  return church;
end $$;

create function private.is_workspace_member(p_workspace_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.workspace_members m where m.workspace_id=p_workspace_id and m.user_id=(select auth.uid()));
$$;
create function private.is_workspace_owner(p_workspace_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.workspace_members m where m.workspace_id=p_workspace_id and m.user_id=(select auth.uid()) and m.role='owner');
$$;
grant usage on schema private to authenticated;
drop policy own_workspace_read on public.workspaces;
create policy current_member_workspace_read on public.workspaces for select to authenticated using (private.is_workspace_member(id));
create policy owner_invitation_read on public.invitations for select to authenticated using (private.is_workspace_owner(workspace_id));

create function private.create_church_workspace(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); church_id uuid;
begin
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then
    raise exception 'Use a church name between 1 and 120 characters.' using errcode='22023';
  end if;
  perform 1 from public.profiles where id=actor for update;
  if not found then raise exception 'Open your personal workspace first.' using errcode='28000'; end if;
  -- The existing partial unique index enforces one created church per account.
  insert into public.workspaces(kind,name,owner_id,created_by) values('church',btrim(p_name),actor,actor) returning id into church_id;
  insert into public.workspace_members(workspace_id,user_id,role) values(church_id,actor,'owner');
  return church_id;
end $$;

create function private.create_team_invitation(p_workspace_id uuid,p_email text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); church public.workspaces; email_value text:=lower(btrim(p_email)); raw_token text; invitation_id uuid; expiry timestamptz:=now()+interval '7 days';
begin
  church:=private.lock_church(p_workspace_id);
  if church.owner_id<>actor then raise exception 'Only the church owner can invite volunteers.' using errcode='42501'; end if;
  if email_value is null or char_length(email_value)>254 or email_value!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.' using errcode='22023';
  end if;
  if exists(select 1 from public.workspace_members m join auth.users u on u.id=m.user_id where m.workspace_id=p_workspace_id and lower(u.email)=email_value) then
    raise exception 'This volunteer already belongs to the workspace.' using errcode='23505';
  end if;
  perform private.consume_operation(actor,'invite');
  update public.invitations set revoked_at=now() where workspace_id=p_workspace_id and normalized_email=email_value and accepted_at is null and revoked_at is null;
  raw_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.invitations(workspace_id,normalized_email,token_hash,expires_at,created_by)
    values(p_workspace_id,email_value,encode(extensions.digest(raw_token,'sha256'),'hex'),expiry,actor) returning id into invitation_id;
  return jsonb_build_object('id',invitation_id,'token',raw_token,'expiresAt',expiry);
end $$;

create function private.accept_team_invitation(p_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); church_id uuid; invitation public.invitations; verified_email text;
begin
  if p_token is null or p_token!~'^[0-9a-f]{64}$' then raise exception 'This invitation link is not valid.' using errcode='22023'; end if;
  select workspace_id into church_id from public.invitations where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  if not found then raise exception 'This invitation cannot be used with this account or has expired.' using errcode='42501'; end if;
  perform private.lock_church(church_id);
  select * into invitation from public.invitations where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
  select lower(email) into verified_email from auth.users where id=actor;
  if invitation.id is null or invitation.accepted_at is not null or invitation.revoked_at is not null
    or invitation.expires_at<=now() or invitation.normalized_email is distinct from verified_email then
    raise exception 'This invitation cannot be used with this account or has expired.' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=actor) then raise exception 'Open your personal workspace first.' using errcode='28000'; end if;
  if exists(select 1 from public.workspace_members where workspace_id=church_id and user_id=actor) then
    raise exception 'You already belong to this workspace.' using errcode='23505';
  end if;
  insert into public.workspace_members(workspace_id,user_id,role) values(church_id,actor,'member');
  update public.invitations set accepted_at=now() where id=invitation.id;
  return church_id;
end $$;

create function private.revoke_team_invitation(p_workspace_id uuid,p_invitation_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); church public.workspaces;
begin
  church:=private.lock_church(p_workspace_id);
  if church.owner_id<>actor then raise exception 'Only the church owner can revoke invitations.' using errcode='42501'; end if;
  update public.invitations set revoked_at=now() where id=p_invitation_id and workspace_id=p_workspace_id and accepted_at is null and revoked_at is null;
  if not found then raise exception 'This pending invitation is not available.' using errcode='P0002'; end if;
end $$;

create function private.remove_workspace_member(p_workspace_id uuid,p_user_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); church public.workspaces;
begin
  church:=private.lock_church(p_workspace_id);
  if church.owner_id<>actor or p_user_id=church.owner_id then raise exception 'Only the owner can remove another volunteer.' using errcode='42501'; end if;
  delete from public.workspace_members where workspace_id=p_workspace_id and user_id=p_user_id and role='member';
  if not found then raise exception 'This volunteer is no longer a member.' using errcode='P0002'; end if;
end $$;

create function private.transfer_workspace_owner(p_workspace_id uuid,p_new_owner_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); church public.workspaces;
begin
  church:=private.lock_church(p_workspace_id);
  if church.owner_id<>actor then raise exception 'Only the current owner can transfer ownership.' using errcode='42501'; end if;
  if p_new_owner_id is null or p_new_owner_id=actor then raise exception 'Choose another current member.' using errcode='22023'; end if;
  if not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=p_new_owner_id and role='member') then
    raise exception 'The new owner must be a current member.' using errcode='42501';
  end if;
  update public.workspace_members set role='member' where workspace_id=p_workspace_id and user_id=actor;
  update public.workspace_members set role='owner' where workspace_id=p_workspace_id and user_id=p_new_owner_id;
  update public.workspaces set owner_id=p_new_owner_id where id=p_workspace_id;
end $$;

create function private.leave_church_workspace(p_workspace_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); church public.workspaces;
begin
  church:=private.lock_church(p_workspace_id);
  if church.owner_id=actor then raise exception 'Transfer ownership before leaving the church workspace.' using errcode='42501'; end if;
  delete from public.workspace_members where workspace_id=p_workspace_id and user_id=actor and role='member';
  if not found then raise exception 'You do not belong to this church workspace.' using errcode='42501'; end if;
end $$;

create function private.get_workspace_team(p_workspace_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); result jsonb;
begin
  if not private.is_workspace_member(p_workspace_id) then raise exception 'This workspace is not available to your account.' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('userId',p.id,'displayName',p.display_name,'avatarUrl',p.avatar_url,'role',m.role)
    order by case when m.role='owner' then 0 else 1 end,lower(p.display_name),p.id),'[]'::jsonb)
    into result from public.workspace_members m join public.profiles p on p.id=m.user_id where m.workspace_id=p_workspace_id;
  return result;
end $$;

-- Public Data API wrappers do not elevate privileges themselves.
create function public.create_church_workspace(p_name text) returns uuid language sql security invoker set search_path='' as $$ select private.create_church_workspace(p_name); $$;
create function public.create_team_invitation(p_workspace_id uuid,p_email text) returns jsonb language sql security invoker set search_path='' as $$ select private.create_team_invitation(p_workspace_id,p_email); $$;
create function public.accept_team_invitation(p_token text) returns uuid language sql security invoker set search_path='' as $$ select private.accept_team_invitation(p_token); $$;
create function public.revoke_team_invitation(p_workspace_id uuid,p_invitation_id uuid) returns void language sql security invoker set search_path='' as $$ select private.revoke_team_invitation(p_workspace_id,p_invitation_id); $$;
create function public.remove_workspace_member(p_workspace_id uuid,p_user_id uuid) returns void language sql security invoker set search_path='' as $$ select private.remove_workspace_member(p_workspace_id,p_user_id); $$;
create function public.transfer_workspace_owner(p_workspace_id uuid,p_new_owner_id uuid) returns void language sql security invoker set search_path='' as $$ select private.transfer_workspace_owner(p_workspace_id,p_new_owner_id); $$;
create function public.leave_church_workspace(p_workspace_id uuid) returns void language sql security invoker set search_path='' as $$ select private.leave_church_workspace(p_workspace_id); $$;
create function public.get_workspace_team(p_workspace_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select private.get_workspace_team(p_workspace_id); $$;

revoke all on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_workspace_member(uuid),private.is_workspace_owner(uuid),private.create_church_workspace(text),private.create_team_invitation(uuid,text),private.accept_team_invitation(text),private.revoke_team_invitation(uuid,uuid),private.remove_workspace_member(uuid,uuid),private.transfer_workspace_owner(uuid,uuid),private.leave_church_workspace(uuid),private.get_workspace_team(uuid) to authenticated;
revoke all on function public.create_church_workspace(text),public.create_team_invitation(uuid,text),public.accept_team_invitation(text),public.revoke_team_invitation(uuid,uuid),public.remove_workspace_member(uuid,uuid),public.transfer_workspace_owner(uuid,uuid),public.leave_church_workspace(uuid),public.get_workspace_team(uuid) from public,anon;
grant execute on function public.create_church_workspace(text),public.create_team_invitation(uuid,text),public.accept_team_invitation(text),public.revoke_team_invitation(uuid,uuid),public.remove_workspace_member(uuid,uuid),public.transfer_workspace_owner(uuid,uuid),public.leave_church_workspace(uuid),public.get_workspace_team(uuid) to authenticated;
notify pgrst,'reload schema';
