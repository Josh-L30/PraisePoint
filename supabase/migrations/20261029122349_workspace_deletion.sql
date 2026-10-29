-- Workspace deletion is deliberately staged: freeze -> Storage API -> quota -> workspace.
-- No existing workspace or object is removed by applying this migration.
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table public.workspaces add column deletion_pending boolean not null default false;

create function private.guard_workspace_writes() returns trigger language plpgsql security definer set search_path='' as $$
declare frozen boolean;w uuid;
begin
 if tg_table_name='workspaces' then
  if old.deletion_pending then raise exception 'This workspace is being deleted.' using errcode='55006';end if;
  if new.id<>old.id then raise exception 'Workspace identity is immutable.' using errcode='22023';end if;
 else
  if tg_op='UPDATE' and new.workspace_id<>old.workspace_id then raise exception 'Workspace identity is immutable.' using errcode='22023';end if;
  w:=new.workspace_id;
  select deletion_pending into frozen from public.workspaces where id=w for share;
  if frozen then raise exception 'This workspace is being deleted.' using errcode='55006';end if;
 end if;
 return new;
end $$;
revoke all on function private.guard_workspace_writes() from public,anon,authenticated;
create trigger protect_deleting_workspace before update on public.workspaces for each row execute function private.guard_workspace_writes();
do $$ declare relation_name text;begin
 foreach relation_name in array array['decks','songs','service_plans','service_items','media_assets','deck_media','workspace_members','invitations'] loop
  execute format('create trigger protect_deleting_workspace before insert or update on public.%I for each row execute function private.guard_workspace_writes()',relation_name);
 end loop;
end $$;

create function private.begin_workspace_deletion(p_workspace_id uuid,p_expected_name text) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();church public.workspaces;released bigint;
begin
 -- Keep the existing image-quota -> document-budget -> workspace lock order.
 perform 1 from private.image_quota where id for update;
 perform 1 from private.document_usage where id for update;
 select * into church from public.workspaces where id=p_workspace_id for update;
 if not found or church.kind<>'church' or church.owner_id<>actor or not private.is_workspace_owner(p_workspace_id) then
  raise exception 'Only the current church owner may delete this workspace.' using errcode='42501';
 end if;
 if p_expected_name is null or btrim(p_expected_name)<>church.name then raise exception 'Confirm the exact workspace name.' using errcode='22023';end if;
 if church.deletion_pending then return;end if;
 -- A late writer or cross-workspace copy must not recreate bytes after cleanup.
 if exists(select 1 from private.quota_reservations r where r.workspace_id=p_workspace_id or exists(select 1 from public.media_assets a where a.id=r.source_media_id and a.workspace_id=p_workspace_id))
  or exists(select 1 from public.media_assets where workspace_id=p_workspace_id and state in('uploading','aborting')) then
  raise exception 'Finish or reclaim pending uploads and copies first.' using errcode='55000';
 end if;
 perform private.consume_operation(actor,'content');
 select coalesce(sum(byte_size),0) into released from(
  select byte_size from public.decks where workspace_id=p_workspace_id union all
  select byte_size from public.songs where workspace_id=p_workspace_id union all
  select byte_size from public.service_plans where workspace_id=p_workspace_id
 ) content;
 delete from public.service_items where workspace_id=p_workspace_id;
 delete from public.deck_media where workspace_id=p_workspace_id;
 delete from public.decks where workspace_id=p_workspace_id;
 delete from public.songs where workspace_id=p_workspace_id;
 delete from public.service_plans where workspace_id=p_workspace_id;
 perform private.adjust_document_usage(p_workspace_id,-released::integer);
 update public.media_assets set state='deleting' where workspace_id=p_workspace_id and state<>'deleting';
 -- Set last under the same exclusive row lock: concurrent writes see either complete state.
 update public.workspaces set deletion_pending=true where id=p_workspace_id;
end $$;

create function private.workspace_deletion_batch(p_workspace_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();church public.workspaces;result jsonb;
begin
 select * into church from public.workspaces where id=p_workspace_id for share;
 if not found or church.kind<>'church' or church.owner_id<>actor or not church.deletion_pending or not private.is_workspace_owner(p_workspace_id) then
  raise exception 'Workspace deletion is not available.' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'location',a.location,'objectKey',a.object_key) order by a.id),'[]'::jsonb) into result
 from(select id,location,object_key from public.media_assets where workspace_id=p_workspace_id and state='deleting' order by id limit 25)a;
 return result;
end $$;

create function private.finish_workspace_deletion(p_workspace_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();church public.workspaces;
begin
 perform 1 from private.image_quota where id for update;
 perform 1 from private.document_usage where id for update;
 select * into church from public.workspaces where id=p_workspace_id for update;
 if not found or church.kind<>'church' or church.owner_id<>actor or not church.deletion_pending or not private.is_workspace_owner(p_workspace_id) then
  raise exception 'Workspace deletion is not available.' using errcode='42501';
 end if;
 if exists(select 1 from public.media_assets where workspace_id=p_workspace_id) then return false;end if;
 if exists(select 1 from private.quota_reservations where workspace_id=p_workspace_id)
  or exists(select 1 from private.workspace_image_quota where workspace_id=p_workspace_id and (used_bytes<>0 or reserved_bytes<>0))
  or exists(select 1 from storage.objects where bucket_id='gather-images' and name like p_workspace_id::text||'/%') then
  raise exception 'Workspace storage cleanup is not complete.' using errcode='P0011';
 end if;
 delete from private.workspace_image_quota where workspace_id=p_workspace_id;
 delete from public.workspaces where id=p_workspace_id;
 return true;
end $$;

create function public.begin_workspace_deletion(p_workspace_id uuid,p_expected_name text) returns void language sql security invoker set search_path='' as $$select private.begin_workspace_deletion(p_workspace_id,p_expected_name);$$;
create function public.workspace_deletion_batch(p_workspace_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.workspace_deletion_batch(p_workspace_id);$$;
create function public.finish_workspace_deletion(p_workspace_id uuid) returns boolean language sql security invoker set search_path='' as $$select private.finish_workspace_deletion(p_workspace_id);$$;
revoke all on function private.begin_workspace_deletion(uuid,text),private.workspace_deletion_batch(uuid),private.finish_workspace_deletion(uuid),public.begin_workspace_deletion(uuid,text),public.workspace_deletion_batch(uuid),public.finish_workspace_deletion(uuid) from public,anon,authenticated;
grant execute on function private.begin_workspace_deletion(uuid,text),private.workspace_deletion_batch(uuid),private.finish_workspace_deletion(uuid),public.begin_workspace_deletion(uuid,text),public.workspace_deletion_batch(uuid),public.finish_workspace_deletion(uuid) to authenticated;
