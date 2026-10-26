-- Version matches the migration applied through the connected Supabase project.
create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  avatar_url text check (avatar_url is null or (avatar_url like 'https://%' and char_length(avatar_url) <= 2048)),
  created_at timestamptz not null default now()
);
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('personal','church')),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create unique index one_personal_workspace on public.workspaces(owner_id) where kind = 'personal';
create unique index one_created_church on public.workspaces(created_by) where kind = 'church';
create index workspaces_owner on public.workspaces(owner_id);
create index workspaces_creator on public.workspaces(created_by);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);
create index memberships_user on public.workspace_members(user_id,workspace_id);
create unique index single_workspace_owner on public.workspace_members(workspace_id) where role = 'owner';

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
revoke all on public.profiles,public.workspaces,public.workspace_members from anon,authenticated;
grant select on public.profiles,public.workspaces,public.workspace_members to authenticated;
grant update(display_name,avatar_url) on public.profiles to authenticated;
create policy own_profile_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_profile_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy own_workspace_read on public.workspaces for select to authenticated using (owner_id = (select auth.uid()));
create policy own_membership_read on public.workspace_members for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.ensure_personal_workspace()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  identity_record auth.users%rowtype;
  workspace_uuid uuid;
  display_value text;
  avatar_value text;
begin
  if actor is null or coalesce(auth.jwt()->'app_metadata'->>'provider','') <> 'google' then
    raise exception 'Sign in with Google to continue.' using errcode = '28000';
  end if;
  select * into identity_record from auth.users where id = actor;
  if not found or identity_record.email_confirmed_at is null then
    raise exception 'A verified Google identity is required.' using errcode = '28000';
  end if;
  display_value := left(coalesce(nullif(btrim(identity_record.raw_user_meta_data->>'full_name'),''),
    nullif(split_part(identity_record.email,'@',1),''),'Church volunteer'),120);
  avatar_value := identity_record.raw_user_meta_data->>'avatar_url';
  if avatar_value not like 'https://%' or char_length(avatar_value) > 2048 then avatar_value := null; end if;
  insert into public.profiles(id,display_name,avatar_url) values(actor,display_value,avatar_value) on conflict(id) do nothing;
  insert into public.workspaces(kind,name,owner_id,created_by) values('personal','Personal workspace',actor,actor)
    on conflict(owner_id) where kind = 'personal' do nothing;
  select id into strict workspace_uuid from public.workspaces where owner_id = actor and kind = 'personal';
  insert into public.workspace_members(workspace_id,user_id,role) values(workspace_uuid,actor,'owner')
    on conflict(workspace_id,user_id) do nothing;
  return (select jsonb_build_object('profileId',p.id,'workspaceId',workspace_uuid,
    'displayName',p.display_name,'avatarUrl',p.avatar_url) from public.profiles p where p.id = actor);
end;
$$;
revoke all on function public.ensure_personal_workspace() from public,anon;
grant execute on function public.ensure_personal_workspace() to authenticated;
