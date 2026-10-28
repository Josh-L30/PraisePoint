-- Cloud quota is charged for pending uploads as well as readable objects.
-- Lock order: image quota singleton -> document singleton -> workspaces (UUID
-- order) -> media/reservations. Deck-only writers never acquire image quota.
create table public.media_assets(
 id uuid primary key,workspace_id uuid not null references public.workspaces(id) on delete restrict,
 created_by uuid not null references public.profiles(id) on delete restrict,
 kind text not null check(kind in('image','video')),location text not null check(location in('cloud','local')),
 mime text not null,bytes bigint not null check(bytes between 1 and 134217728),sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 revision integer not null default 1 check(revision=1),original_name text not null check(char_length(original_name) between 1 and 255),
 object_key text unique,upload_reservation_id uuid unique,state text not null check(state in('uploading','aborting','active','deleting')),
 width integer,height integer,duration double precision,metadata_bytes integer not null check(metadata_bytes between 1 and 8192),
 created_at timestamptz not null default now(),unique(workspace_id,id),
 check((kind='image' and mime in('image/jpeg','image/png','image/webp') and bytes<=5242880) or(kind='video' and mime in('video/mp4','video/webm'))),
 check((location='cloud' and kind='image' and object_key is not null) or(location='local' and object_key is null and state in('active','deleting'))),
 check(state in('uploading','aborting') or(width is not null and height is not null and width>0 and height>0 and width::bigint*height<=(case when kind='image' then 4194304 else 8388608 end))),
 check((kind='image' and duration is null) or(kind='video' and duration is not null and duration>0 and duration<=86400))
);
create index media_workspace_created on public.media_assets(workspace_id,created_at desc,id);
create index media_creator on public.media_assets(created_by);
create table public.deck_media(
 workspace_id uuid not null,deck_id uuid not null,media_id uuid not null,primary key(workspace_id,deck_id,media_id),
 foreign key(workspace_id,deck_id) references public.decks(workspace_id,id) on delete restrict,
 foreign key(workspace_id,media_id) references public.media_assets(workspace_id,id) on delete restrict
);
create index deck_media_asset on public.deck_media(workspace_id,media_id);
create table private.image_quota(
 id boolean primary key default true check(id),used_bytes bigint not null default 0 check(used_bytes>=0),reserved_bytes bigint not null default 0 check(reserved_bytes>=0)
);
insert into private.image_quota(id) values(true);
create table private.workspace_image_quota(
 workspace_id uuid primary key references public.workspaces(id) on delete restrict,
 used_bytes bigint not null default 0 check(used_bytes>=0),reserved_bytes bigint not null default 0 check(reserved_bytes>=0)
);
create table private.quota_reservations(
 id uuid primary key,workspace_id uuid not null,media_id uuid not null unique,actor_id uuid not null references public.profiles(id) on delete restrict,
 source_media_id uuid references public.media_assets(id) on delete restrict,object_key text not null unique,bytes bigint not null check(bytes between 1 and 5242880),
 expires_at timestamptz not null default now()+interval '15 minutes',created_at timestamptz not null default now(),
 foreign key(workspace_id,media_id) references public.media_assets(workspace_id,id) on delete restrict
);
create index quota_reservations_expiry on private.quota_reservations(expires_at,id);
create index quota_reservations_workspace on private.quota_reservations(workspace_id);
create index quota_reservations_actor on private.quota_reservations(actor_id);
create index quota_reservations_source on private.quota_reservations(source_media_id) where source_media_id is not null;
alter table public.media_assets enable row level security;
alter table public.deck_media enable row level security;
alter table private.image_quota enable row level security;
alter table private.workspace_image_quota enable row level security;
alter table private.quota_reservations enable row level security;
create policy media_member_read on public.media_assets for select to authenticated using(state='active' and private.is_workspace_member(workspace_id));
create policy deck_media_member_read on public.deck_media for select to authenticated using(private.is_workspace_member(workspace_id));
revoke all on public.media_assets,public.deck_media,private.image_quota,private.workspace_image_quota,private.quota_reservations from public,anon,authenticated;
grant select on public.media_assets,public.deck_media to authenticated;

alter table private.operation_budgets drop constraint operation_budgets_operation_check;
alter table private.operation_budgets add constraint operation_budgets_operation_check check(operation in('invite','content','upload'));
create or replace function private.consume_operation(p_actor uuid,p_operation text) returns void language plpgsql security invoker set search_path='' as $$
declare bucket timestamptz; maximum integer; consumed integer;
begin
 if p_actor is null then raise exception 'Sign in first.' using errcode='28000';end if;
 case p_operation when 'invite' then bucket:=date_trunc('hour',now());maximum:=10;
 when 'content' then bucket:=date_trunc('minute',now());maximum:=120;
 when 'upload' then bucket:=date_trunc('hour',now());maximum:=30;
 else raise exception 'Unknown operation.' using errcode='22023';end case;
 insert into private.operation_budgets as b(actor_id,operation,window_start,used) values(p_actor,p_operation,bucket,1)
 on conflict(actor_id,operation) do update set window_start=excluded.window_start,used=case when b.window_start=excluded.window_start then b.used+1 else 1 end returning used into consumed;
 if consumed>maximum then raise exception 'The operation limit has been reached.' using errcode='P0001';end if;
end $$;
create or replace function private.adjust_document_usage(p_workspace_id uuid,p_delta integer) returns void language plpgsql security invoker set search_path='' as $$
begin
 if(select used_bytes+p_delta>104857600 from private.document_usage where id) or
 (select coalesce(sum(byte_size),0)+p_delta>26214400 from(
  select byte_size from public.decks where workspace_id=p_workspace_id union all select byte_size from public.songs where workspace_id=p_workspace_id union all
  select byte_size from public.service_plans where workspace_id=p_workspace_id union all select metadata_bytes from public.media_assets where workspace_id=p_workspace_id) records) then
  raise exception 'The free application document capacity has been reached.' using errcode='53000';end if;
 update private.document_usage set used_bytes=used_bytes+p_delta where id;
end $$;
create function private.media_json(a public.media_assets) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',a.id,'workspaceId',a.workspace_id,'kind',a.kind,'mime',a.mime,'bytes',a.bytes,'sha256',a.sha256,'revision',a.revision,'location',a.location,'originalName',a.original_name);
$$;
create function private.validate_media_descriptor(p_asset jsonb,p_location text) returns jsonb language plpgsql immutable security invoker set search_path='' as $$
declare identity uuid; w uuid; size numeric;
begin
 perform private.document_keys(p_asset,array['id','workspaceId','kind','mime','bytes','sha256','revision','location','originalName'],array['id','workspaceId','kind','mime','bytes','sha256','revision','location','originalName']);
 identity:=private.document_uuid(p_asset->>'id');w:=private.document_uuid(p_asset->>'workspaceId');size:=private.document_number(p_asset,'bytes',1,134217728);
 if size<>trunc(size) or p_asset->'revision' is distinct from '1'::jsonb or p_asset->>'location' is distinct from p_location or
  jsonb_typeof(p_asset->'kind') is distinct from 'string' or p_asset->>'kind' not in('image','video') or
  jsonb_typeof(p_asset->'mime') is distinct from 'string' or jsonb_typeof(p_asset->'sha256') is distinct from 'string' or p_asset->>'sha256' !~ '^[0-9a-f]{64}$' or
  jsonb_typeof(p_asset->'originalName') is distinct from 'string' or char_length(p_asset->>'originalName') not between 1 and 255 or btrim(p_asset->>'originalName')='' then
  raise exception 'Invalid media descriptor.' using errcode='22023';end if;
 if(p_asset->>'kind'='image' and(p_asset->>'mime' not in('image/jpeg','image/png','image/webp') or size>5242880)) or
  (p_asset->>'kind'='video' and(p_asset->>'mime' not in('video/mp4','video/webm') or p_location<>'local')) or(p_location='cloud' and p_asset->>'kind'<>'image') then
  raise exception 'Unsupported file type or size.' using errcode='22023';end if;
 return jsonb_set(jsonb_set(p_asset,'{id}',to_jsonb(identity::text)),'{workspaceId}',to_jsonb(w::text));
end $$;
create function private.validate_media_geometry(p_kind text,p_width integer,p_height integer,p_duration double precision) returns void language plpgsql immutable security invoker set search_path='' as $$
begin
 if p_width is null or p_height is null or p_width<1 or p_height<1 or
 p_width::bigint*p_height>(case when p_kind='image' then 4194304 else 8388608 end) or
 (p_kind='image' and p_duration is not null) or(p_kind='video' and(p_duration is null or not(p_duration>0 and p_duration<=86400))) then
 raise exception 'Invalid decoded media dimensions or duration.' using errcode='22023';end if;
end $$;
create function private.lock_actor_workspace(p_workspace uuid,p_actor uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.workspaces where id=p_workspace for update;
 if not found or not exists(select 1 from public.workspace_members where workspace_id=p_workspace and user_id=p_actor) then
 raise exception 'Workspace unavailable.' using errcode='42501';end if;
end $$;
create function private.assert_service_role() returns void language plpgsql security invoker set search_path='' as $$
begin if current_setting('role',true) is distinct from 'service_role' then raise exception 'Server operation only.' using errcode='42501';end if;end $$;
create function private.cloud_media_key(p_workspace uuid,p_id uuid,p_sha text,p_mime text) returns text language sql immutable security invoker set search_path='' as $$
 select p_workspace::text||'/'||p_id::text||'/'||p_sha||case p_mime when 'image/png' then '.png' when 'image/webp' then '.webp' else '.jpg' end;
$$;
create function private.assert_media_source(p_source uuid,p_asset jsonb,p_actor uuid,p_location text) returns void language plpgsql security invoker set search_path='' as $$
declare source public.media_assets;
begin
 if p_source is null then return;end if;
 select * into source from public.media_assets where id=p_source and state='active';
 if not found or source.location<>p_location or source.kind<>p_asset->>'kind' or source.mime<>p_asset->>'mime' or source.bytes<>(p_asset->>'bytes')::bigint or source.sha256<>p_asset->>'sha256' or
 not exists(select 1 from public.workspace_members where workspace_id=source.workspace_id and user_id=p_actor) then raise exception 'Source media unavailable.' using errcode='42501';end if;
end $$;
create function private.register_local_media(p_asset jsonb,p_width integer,p_height integer,p_duration double precision default null,p_source_media_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();a public.media_assets;w uuid;source_ws uuid;next_ws uuid;size integer;
begin
 p_asset:=private.validate_media_descriptor(p_asset,'local');w:=(p_asset->>'workspaceId')::uuid;
 perform private.validate_media_geometry(p_asset->>'kind',p_width,p_height,p_duration);
 select workspace_id into source_ws from public.media_assets where id=p_source_media_id;
 perform 1 from private.document_usage where id for update;
 for next_ws in select distinct value from unnest(array[w,source_ws]) value where value is not null order by value loop perform private.lock_actor_workspace(next_ws,actor);end loop;
 perform private.assert_media_source(p_source_media_id,p_asset,actor,'local');
 select * into a from public.media_assets where id=(p_asset->>'id')::uuid for update;
 if found then
  if a.created_by=actor and a.state='active' and private.media_json(a)=p_asset then return private.media_json(a);end if;
  raise exception 'Media identity already used.' using errcode='23505';end if;
 size:=octet_length(p_asset::text);perform private.consume_operation(actor,'content');perform private.adjust_document_usage(w,size);
 insert into public.media_assets(id,workspace_id,created_by,kind,location,mime,bytes,sha256,original_name,state,width,height,duration,metadata_bytes)
 values((p_asset->>'id')::uuid,w,actor,p_asset->>'kind','local',p_asset->>'mime',(p_asset->>'bytes')::bigint,p_asset->>'sha256',p_asset->>'originalName','active',p_width,p_height,p_duration,size) returning * into a;
 return private.media_json(a);
end $$;
create function private.reserve_image_upload(p_asset jsonb,p_source_media_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();a public.media_assets;r private.quota_reservations;w uuid;source_ws uuid;next_ws uuid;size integer;file_bytes bigint;key text;reservation uuid:=gen_random_uuid();
begin
 p_asset:=private.validate_media_descriptor(p_asset,'cloud');w:=(p_asset->>'workspaceId')::uuid;file_bytes:=(p_asset->>'bytes')::bigint;
 select workspace_id into source_ws from public.media_assets where id=p_source_media_id;
 perform 1 from private.image_quota where id for update;perform 1 from private.document_usage where id for update;
 for next_ws in select distinct value from unnest(array[w,source_ws]) value where value is not null order by value loop perform private.lock_actor_workspace(next_ws,actor);end loop;
 perform private.assert_media_source(p_source_media_id,p_asset,actor,'cloud');perform private.consume_operation(actor,'upload');
 select * into a from public.media_assets where id=(p_asset->>'id')::uuid for update;
 if found then
  if a.created_by<>actor or private.media_json(a)<>p_asset then raise exception 'Media identity already used.' using errcode='23505';end if;
  if a.state='active' then return jsonb_build_object('status','active','media',private.media_json(a));end if;
  if a.state<>'uploading' then raise exception 'Upload cleanup is unfinished. Reclaim it before retrying.' using errcode='40001';end if;
  select * into r from private.quota_reservations where media_id=a.id;
  if not found or r.expires_at<=now() or r.source_media_id is distinct from p_source_media_id then raise exception 'This upload expired or changed. Reclaim it before retrying.' using errcode='40001';end if;
  return jsonb_build_object('status','pending','reservationId',r.id,'objectKey',r.object_key,'expiresAt',r.expires_at);
 end if;
 insert into private.workspace_image_quota(workspace_id) values(w) on conflict do nothing;
 perform 1 from private.workspace_image_quota where workspace_id=w for update;
 if(select used_bytes+reserved_bytes+file_bytes>524288000 from private.image_quota where id) or
 (select used_bytes+reserved_bytes+file_bytes>52428800 from private.workspace_image_quota where workspace_id=w) then
 raise exception 'The free image capacity has been reached.' using errcode='53000';end if;
 size:=octet_length(p_asset::text);perform private.adjust_document_usage(w,size);
 key:=private.cloud_media_key(w,(p_asset->>'id')::uuid,p_asset->>'sha256',p_asset->>'mime');
 update private.image_quota set reserved_bytes=reserved_bytes+file_bytes where id;
 update private.workspace_image_quota set reserved_bytes=reserved_bytes+file_bytes where workspace_id=w;
 insert into public.media_assets(id,workspace_id,created_by,kind,location,mime,bytes,sha256,original_name,state,object_key,upload_reservation_id,metadata_bytes)
 values((p_asset->>'id')::uuid,w,actor,'image','cloud',p_asset->>'mime',file_bytes,p_asset->>'sha256',p_asset->>'originalName','uploading',key,reservation,size);
 insert into private.quota_reservations(id,workspace_id,media_id,actor_id,source_media_id,object_key,bytes) values(reservation,w,(p_asset->>'id')::uuid,actor,p_source_media_id,key,file_bytes) returning * into r;
 return jsonb_build_object('status','pending','reservationId',r.id,'objectKey',r.object_key,'expiresAt',r.expires_at);
end $$;
create function private.media_finalize_upload(p_reservation_id uuid,p_sha256 text,p_width integer,p_height integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.quota_reservations;a public.media_assets;next_ws uuid;source_ws uuid;object_metadata jsonb;
begin
 perform private.assert_service_role();perform 1 from private.image_quota where id for update;perform 1 from private.document_usage where id for update;
 select * into r from private.quota_reservations where id=p_reservation_id;
 if not found then
  select * into a from public.media_assets where upload_reservation_id=p_reservation_id and state='active';
  if found and a.sha256=p_sha256 and a.width=p_width and a.height=p_height then return private.media_json(a);end if;
  raise exception 'Upload unavailable.' using errcode='42501';end if;
 select workspace_id into source_ws from public.media_assets where id=r.source_media_id;
 for next_ws in select distinct value from unnest(array[r.workspace_id,source_ws]) value where value is not null order by value loop perform private.lock_actor_workspace(next_ws,r.actor_id);end loop;
 select * into r from private.quota_reservations where id=p_reservation_id for update;
 if not found or r.expires_at<=now() then raise exception 'Upload expired.' using errcode='40001';end if;
 select * into a from public.media_assets where id=r.media_id for update;
 if a.state<>'uploading' then raise exception 'Upload is being reclaimed.' using errcode='40001';end if;
 perform private.assert_media_source(r.source_media_id,private.media_json(a),r.actor_id,'cloud');
 perform private.validate_media_geometry('image',p_width,p_height,null);
 select metadata into object_metadata from storage.objects where bucket_id='gather-images' and name=r.object_key;
 if not found or a.state<>'uploading' or p_sha256 is distinct from a.sha256 or (object_metadata->>'size')::bigint is distinct from a.bytes or
 coalesce(object_metadata->>'mimetype',object_metadata->>'contentType') is distinct from a.mime then raise exception 'Uploaded bytes do not match the reservation.' using errcode='22023';end if;
 update private.image_quota set reserved_bytes=reserved_bytes-a.bytes,used_bytes=used_bytes+a.bytes where id;
 update private.workspace_image_quota set reserved_bytes=reserved_bytes-a.bytes,used_bytes=used_bytes+a.bytes where workspace_id=a.workspace_id;
 update public.media_assets set state='active',width=p_width,height=p_height where id=a.id returning * into a;
 delete from private.quota_reservations where id=r.id;
 return private.media_json(a);
end $$;
create function private.media_release_upload(p_reservation_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r private.quota_reservations;a public.media_assets;
begin
 perform private.assert_service_role();perform 1 from private.image_quota where id for update;perform 1 from private.document_usage where id for update;
 select * into r from private.quota_reservations where id=p_reservation_id;
 if not found then return;end if;
 perform 1 from public.workspaces where id=r.workspace_id for update;
 select * into r from private.quota_reservations where id=p_reservation_id for update;
 if not found then return;end if;
 if exists(select 1 from storage.objects where bucket_id='gather-images' and name=r.object_key) then raise exception 'Remove the stored object before releasing quota.' using errcode='23503';end if;
 select * into a from public.media_assets where id=r.media_id for update;
 if a.state not in('uploading','aborting') then raise exception 'Upload already finalized.' using errcode='40001';end if;
 update private.image_quota set reserved_bytes=reserved_bytes-r.bytes where id;
 update private.workspace_image_quota set reserved_bytes=reserved_bytes-r.bytes where workspace_id=r.workspace_id;
 perform private.adjust_document_usage(r.workspace_id,-a.metadata_bytes);
 delete from private.quota_reservations where id=r.id;delete from public.media_assets where id=a.id;
end $$;
create function private.media_expired_uploads() returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.assert_service_role();return coalesce((select jsonb_agg(jsonb_build_object('reservationId',id,'objectKey',object_key)) from(
 select r.id,r.object_key from private.quota_reservations r join public.media_assets a on a.id=r.media_id where r.expires_at<=now() or a.state='aborting' order by r.expires_at,r.id limit 20) expired),'[]'::jsonb);end $$;
create function private.get_media_usage(p_workspace_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();q private.workspace_image_quota;g private.image_quota;
begin
 if not private.is_workspace_member(p_workspace_id) then raise exception 'Workspace unavailable.' using errcode='42501';end if;
 select * into q from private.workspace_image_quota where workspace_id=p_workspace_id;select * into g from private.image_quota where id;
 return jsonb_build_object('workspaceUsed',coalesce(q.used_bytes,0),'workspaceReserved',coalesce(q.reserved_bytes,0),'workspaceLimit',52428800,
 'applicationUsed',g.used_bytes,'applicationReserved',g.reserved_bytes,'applicationLimit',524288000);
end $$;
create function private.assert_media_unreferenced(p_id uuid,p_workspace uuid) returns void language plpgsql security invoker set search_path='' as $$
declare dependencies text;
begin
 select string_agg(title,', ' order by id) into dependencies from(select d.id,d.title from public.deck_media m join public.decks d on d.id=m.deck_id and d.workspace_id=m.workspace_id
 where m.media_id=p_id and m.workspace_id=p_workspace order by d.id limit 10) refs;
 if dependencies is not null then raise exception 'Media is used by presentations: %. Remove those references first.',dependencies using errcode='23503';end if;
 if exists(select 1 from private.quota_reservations where source_media_id=p_id) then raise exception 'Media has a pending copy. Finish or reclaim it first.' using errcode='23503';end if;
end $$;
create function private.begin_media_delete(p_media_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();a public.media_assets;w uuid;
begin
 select workspace_id into w from public.media_assets where id=p_media_id;
 perform 1 from private.image_quota where id for update;perform 1 from private.document_usage where id for update;perform private.lock_actor_workspace(w,actor);
 if not private.is_workspace_owner(w) then raise exception 'Only the workspace owner can delete media.' using errcode='42501';end if;
 select * into a from public.media_assets where id=p_media_id for update;
 if not found or a.state not in('active','deleting') then raise exception 'Media unavailable.' using errcode='42501';end if;
 perform private.assert_media_unreferenced(a.id,w);perform private.consume_operation(actor,'content');
 update public.media_assets set state='deleting' where id=a.id;
 return jsonb_build_object('id',a.id,'location',a.location,'objectKey',a.object_key);
end $$;
create function private.media_finish_delete(p_media_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.media_assets;w uuid;
begin
 perform private.assert_service_role();perform 1 from private.image_quota where id for update;perform 1 from private.document_usage where id for update;
 select workspace_id into w from public.media_assets where id=p_media_id;if not found then return;end if;
 perform 1 from public.workspaces where id=w for update;select * into a from public.media_assets where id=p_media_id for update;
 if not found then return;end if;
 if a.state<>'deleting' then raise exception 'Media deletion was not authorized.' using errcode='42501';end if;
 perform private.assert_media_unreferenced(a.id,w);
 if a.location='cloud' then
  if exists(select 1 from storage.objects where bucket_id='gather-images' and name=a.object_key) then raise exception 'Stored bytes remain. Retry object deletion before freeing capacity.' using errcode='23503';end if;
  update private.image_quota set used_bytes=used_bytes-a.bytes where id;
  update private.workspace_image_quota set used_bytes=used_bytes-a.bytes where workspace_id=w;
 end if;
 perform private.adjust_document_usage(w,-a.metadata_bytes);delete from public.media_assets where id=a.id;
end $$;
create function private.delete_local_media(p_media_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();a public.media_assets;w uuid;
begin
 select workspace_id into w from public.media_assets where id=p_media_id;
 perform 1 from private.document_usage where id for update;perform private.lock_actor_workspace(w,actor);
 if not private.is_workspace_owner(w) then raise exception 'Only the workspace owner can delete media.' using errcode='42501';end if;
 select * into a from public.media_assets where id=p_media_id for update;
 if not found or a.location<>'local' then raise exception 'Local media unavailable.' using errcode='42501';end if;
 perform private.assert_media_unreferenced(a.id,w);perform private.consume_operation(actor,'content');perform private.adjust_document_usage(w,-a.metadata_bytes);
 delete from public.media_assets where id=a.id;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('gather-images','gather-images',false,5242880,array['image/jpeg','image/png','image/webp']);
create function private.can_read_media_object(p_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.media_assets where object_key=p_name and location='cloud' and state='active' and private.is_workspace_member(workspace_id));
$$;
create policy gather_images_read on storage.objects for select to authenticated using(bucket_id='gather-images' and private.can_read_media_object(name));
-- There are deliberately no authenticated INSERT/UPDATE/DELETE policies.
create function private.guard_media_object() returns trigger language plpgsql security definer set search_path='' as $$
declare r private.quota_reservations;a public.media_assets;
begin
 if new.bucket_id<>'gather-images' then return new;end if;
 if TG_OP='UPDATE' and new.name=old.name and new.bucket_id=old.bucket_id and new.metadata is not distinct from old.metadata then return new;end if;
 select reservations.* into r from private.quota_reservations reservations where object_key=new.name and expires_at>now() for share;
 if not found then raise exception 'A valid upload reservation is required.' using errcode='42501';end if;
 select * into a from public.media_assets where id=r.media_id;
 if a.state<>'uploading' or(new.metadata->>'size')::bigint is distinct from r.bytes or coalesce(new.metadata->>'mimetype',new.metadata->>'contentType') is distinct from a.mime then
 raise exception 'Stored bytes exceed or differ from the upload reservation.' using errcode='22023';end if;
 return new;
end $$;
create trigger gather_media_reservation before insert or update on storage.objects for each row execute function private.guard_media_object();

create function public.register_local_media(p_asset jsonb,p_width integer,p_height integer,p_duration double precision default null,p_source_media_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.register_local_media(p_asset,p_width,p_height,p_duration,p_source_media_id);$$;
create function public.reserve_image_upload(p_asset jsonb,p_source_media_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.reserve_image_upload(p_asset,p_source_media_id);$$;
create function public.get_media_usage(p_workspace_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.get_media_usage(p_workspace_id);$$;
create function public.begin_media_delete(p_media_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.begin_media_delete(p_media_id);$$;
create function public.delete_local_media(p_media_id uuid) returns void language sql security invoker set search_path='' as $$select private.delete_local_media(p_media_id);$$;
create function public.media_finalize_upload(p_reservation_id uuid,p_sha256 text,p_width integer,p_height integer) returns jsonb language sql security invoker set search_path='' as $$select private.media_finalize_upload(p_reservation_id,p_sha256,p_width,p_height);$$;
create function public.media_release_upload(p_reservation_id uuid) returns void language sql security invoker set search_path='' as $$select private.media_release_upload(p_reservation_id);$$;
create function public.media_expired_uploads() returns jsonb language sql security invoker set search_path='' as $$select private.media_expired_uploads();$$;
create function public.media_finish_delete(p_media_id uuid) returns void language sql security invoker set search_path='' as $$select private.media_finish_delete(p_media_id);$$;
revoke all on function private.media_json(public.media_assets),private.validate_media_descriptor(jsonb,text),private.validate_media_geometry(text,integer,integer,double precision),private.lock_actor_workspace(uuid,uuid),private.assert_service_role(),private.cloud_media_key(uuid,uuid,text,text),private.assert_media_source(uuid,jsonb,uuid,text),private.assert_media_unreferenced(uuid,uuid),private.guard_media_object() from public,anon,authenticated,service_role;
revoke all on function private.register_local_media(jsonb,integer,integer,double precision,uuid),private.reserve_image_upload(jsonb,uuid),private.get_media_usage(uuid),private.begin_media_delete(uuid),private.delete_local_media(uuid),private.can_read_media_object(text) from public,anon;
grant execute on function private.register_local_media(jsonb,integer,integer,double precision,uuid),private.reserve_image_upload(jsonb,uuid),private.get_media_usage(uuid),private.begin_media_delete(uuid),private.delete_local_media(uuid),private.can_read_media_object(text) to authenticated;
revoke all on function public.register_local_media(jsonb,integer,integer,double precision,uuid),public.reserve_image_upload(jsonb,uuid),public.get_media_usage(uuid),public.begin_media_delete(uuid),public.delete_local_media(uuid) from public,anon;
grant execute on function public.register_local_media(jsonb,integer,integer,double precision,uuid),public.reserve_image_upload(jsonb,uuid),public.get_media_usage(uuid),public.begin_media_delete(uuid),public.delete_local_media(uuid) to authenticated;
grant usage on schema private to service_role;
revoke all on function private.media_finalize_upload(uuid,text,integer,integer),private.media_release_upload(uuid),private.media_expired_uploads(),private.media_finish_delete(uuid),public.media_finalize_upload(uuid,text,integer,integer),public.media_release_upload(uuid),public.media_expired_uploads(),public.media_finish_delete(uuid) from public,anon,authenticated;
grant execute on function private.media_finalize_upload(uuid,text,integer,integer),private.media_release_upload(uuid),private.media_expired_uploads(),private.media_finish_delete(uuid),public.media_finalize_upload(uuid,text,integer,integer),public.media_release_upload(uuid),public.media_expired_uploads(),public.media_finish_delete(uuid) to service_role;

create function private.assert_media_reference(p_id uuid,p_workspace uuid,p_kind text) returns void language plpgsql stable security invoker set search_path='' as $$
begin if not exists(select 1 from public.media_assets where id=p_id and workspace_id=p_workspace and kind=p_kind and state='active') then raise exception 'Media unavailable in this workspace.' using errcode='0A000';end if;end $$;
create function private.document_media_refs(p_document jsonb) returns table(media_id uuid,kind text) language sql immutable security invoker set search_path='' as $$
 select (slide->'background'->>'mediaId')::uuid,slide->'background'->>'kind' from jsonb_array_elements(p_document->'slides') slide where slide->'background'->>'kind' in('image','video')
 union all select (element->>'mediaId')::uuid,'image' from jsonb_array_elements(p_document->'slides') slide cross join lateral jsonb_array_elements(slide->'elements') element where element->>'kind'='image'
 union all select (slide->>'standaloneVideoId')::uuid,'video' from jsonb_array_elements(p_document->'slides') slide where slide ? 'standaloneVideoId';
$$;
create function private.sync_deck_media() returns trigger language plpgsql security definer set search_path='' as $$
declare ref record;
begin
 for ref in select * from private.document_media_refs(new.document) loop perform private.assert_media_reference(ref.media_id,new.workspace_id,ref.kind);end loop;
 delete from public.deck_media where workspace_id=new.workspace_id and deck_id=new.id;
 insert into public.deck_media(workspace_id,deck_id,media_id) select distinct new.workspace_id,new.id,media_id from private.document_media_refs(new.document);
 return new;
end $$;
create trigger sync_gather_deck_media after insert or update of document on public.decks for each row execute function private.sync_deck_media();
revoke all on function private.assert_media_reference(uuid,uuid,text),private.document_media_refs(jsonb),private.sync_deck_media() from public,anon,authenticated,service_role;


create or replace function private.validate_slide_document(p_document jsonb,p_workspace_id uuid,p_deck_id uuid) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare slide jsonb; element jsonb; background jsonb; seen uuid[]:=array[p_deck_id]; identity uuid; z numeric; output jsonb:='[]'; sorted jsonb;
begin
  perform private.document_keys(p_document,array['schemaVersion','id','workspaceId','title','width','height','slides'],array['schemaVersion','id','workspaceId','title','width','height','slides']);
  if p_document->'schemaVersion' is distinct from '1'::jsonb or p_document->'width' is distinct from '1920'::jsonb or p_document->'height' is distinct from '1080'::jsonb
    or private.document_uuid(p_document->>'id')<>p_deck_id or private.document_uuid(p_document->>'workspaceId')<>p_workspace_id
    or jsonb_typeof(p_document->'title') is distinct from 'string' or char_length(btrim(p_document->>'title')) not between 1 and 120
    or octet_length(p_document::text)>2097152 then raise exception 'Unsupported presentation document.' using errcode='22023'; end if;
  if jsonb_typeof(p_document->'slides') is distinct from 'array' then raise exception 'Invalid slides.' using errcode='22023'; end if;
  if jsonb_array_length(p_document->'slides') not between 1 and 200 then raise exception 'Slide limit exceeded.' using errcode='22023'; end if;
  for slide in select value from jsonb_array_elements(p_document->'slides') loop
    perform private.document_keys(slide,array['id','category','background','elements','standaloneVideoId'],array['id','category','background','elements']);
    identity:=private.document_uuid(slide->>'id');
    if identity=any(seen) then raise exception 'Duplicate document identifier.' using errcode='22023'; end if; seen:=array_append(seen,identity);
    if jsonb_typeof(slide->'category') is distinct from 'string' or slide->>'category' not in ('lyrics','scripture','sermon','announcement','welcome-closing') then raise exception 'Unknown slide category.' using errcode='22023'; end if;
    background:=slide->'background';
    if background->>'kind'='solid' then
      perform private.document_keys(background,array['kind','color'],array['kind','color']);
      if jsonb_typeof(background->'color') is distinct from 'string' or background->>'color' !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid slide color.' using errcode='22023'; end if;
    elsif background->>'kind' in ('image','video') then
      perform private.document_keys(background,array['kind','mediaId'],array['kind','mediaId']); perform private.document_uuid(background->>'mediaId');
      if background->>'kind'='video' and slide ? 'standaloneVideoId' then raise exception 'Use one video at a time.' using errcode='22023'; end if;
      perform private.assert_media_reference(private.document_uuid(background->>'mediaId'),p_workspace_id,background->>'kind');
    else raise exception 'Invalid slide background.' using errcode='22023'; end if;
    if slide ? 'standaloneVideoId' then perform private.document_uuid(slide->>'standaloneVideoId'); perform private.assert_media_reference(private.document_uuid(slide->>'standaloneVideoId'),p_workspace_id,'video'); end if;
    if jsonb_typeof(slide->'elements') is distinct from 'array' then raise exception 'Invalid elements.' using errcode='22023'; end if;
    if jsonb_array_length(slide->'elements')>100 then raise exception 'Element limit exceeded.' using errcode='22023'; end if;
    for element in select value from jsonb_array_elements(slide->'elements') loop
      if element->>'kind'='text' then
        perform private.document_keys(element,array['id','kind','x','y','width','height','z','text','fontFamily','fontSize','color','align','label'],array['id','kind','x','y','width','height','z','text','fontFamily','fontSize','color','align']);
        if jsonb_typeof(element->'text') is distinct from 'string' or char_length(element->>'text')>20000 or element->'fontFamily' is distinct from '"Figtree"'::jsonb
          or jsonb_typeof(element->'align') is distinct from 'string' or element->>'align' not in ('left','center','right')
          or jsonb_typeof(element->'color') is distinct from 'string' or element->>'color' !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid text styling.' using errcode='22023'; end if;
        perform private.document_number(element,'fontSize',8,300);
      elsif element->>'kind'='image' then
        perform private.document_keys(element,array['id','kind','x','y','width','height','z','mediaId','fit','label'],array['id','kind','x','y','width','height','z','mediaId','fit']);
        perform private.document_uuid(element->>'mediaId');
        if jsonb_typeof(element->'fit') is distinct from 'string' or element->>'fit' not in ('contain','cover') then raise exception 'Invalid image fit.' using errcode='22023'; end if; perform private.assert_media_reference(private.document_uuid(element->>'mediaId'),p_workspace_id,'image');
      else raise exception 'Invalid element type.' using errcode='22023'; end if;
      if element ? 'label' and (jsonb_typeof(element->'label') is distinct from 'string' or char_length(element->>'label')>120 or char_length(btrim(element->>'label'))=0) then raise exception 'Invalid element label.' using errcode='22023'; end if;
      identity:=private.document_uuid(element->>'id');
      if identity=any(seen) then raise exception 'Duplicate document identifier.' using errcode='22023'; end if; seen:=array_append(seen,identity);
      perform private.document_number(element,'x',0,1920); perform private.document_number(element,'y',0,1080);
      if private.document_number(element,'width',0,1920)=0 or private.document_number(element,'height',0,1080)=0 then raise exception 'Invalid element size.' using errcode='22023'; end if;
      z:=private.document_number(element,'z',0,10000); if z<>trunc(z) then raise exception 'Invalid layer.' using errcode='22023'; end if;
    end loop;
    select coalesce(jsonb_agg(value order by (value->>'z')::numeric,value->>'id'),'[]'::jsonb) into sorted from jsonb_array_elements(slide->'elements');
    output:=output||jsonb_build_array(jsonb_set(slide,'{elements}',sorted));
  end loop;
  return jsonb_set(jsonb_set(p_document,'{slides}',output),'{title}',to_jsonb(btrim(p_document->>'title')));
end $$;

create or replace function private.delete_slide_deck(p_deck_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); d public.decks; w uuid; deps text;
begin
 select workspace_id into w from public.decks where id=p_deck_id;
 perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
 select * into d from public.decks where id=p_deck_id for update;
 if not found or (d.created_by<>actor and not private.is_workspace_owner(w)) then raise exception 'Only the creator or workspace owner can delete this presentation.' using errcode='42501'; end if;
 select string_agg(title,', ' order by id) into deps from (select distinct p.id,p.title from public.service_items i join public.service_plans p on p.id=i.service_id where i.deck_id=p_deck_id and i.workspace_id=w order by p.id limit 10) uses;
 if deps is not null then raise exception 'Presentation is used by services: %. Remove it from these services first.',deps using errcode='23503'; end if;
 perform private.consume_operation(actor,'content'); perform private.adjust_document_usage(w,-d.byte_size); delete from public.deck_media where workspace_id=w and deck_id=p_deck_id; delete from public.decks where id=p_deck_id;
end $$;

create or replace function private.build_service_snapshot(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); w uuid; p public.service_plans; r record; slide jsonb; el jsonb; elements jsonb; slides jsonb:='[]'; sections jsonb:='[]'; revisions jsonb; snapshot jsonb; media jsonb; expected_media integer;
begin
 select workspace_id into w from public.service_plans where id=p_id;
 if not found then raise exception 'Service unavailable.' using errcode='42501'; end if;
 -- Same order as all document writers gives a coherent cross-deck snapshot.
 perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
 select * into p from public.service_plans where id=p_id;
 if not found then raise exception 'Service unavailable.' using errcode='42501'; end if;
 revisions:=jsonb_build_array(p.id,p.revision);
 for r in select i.id,i.label,i.position,d.id as deck_id,d.document,d.revision,d.source_song_id from public.service_items i
   join public.decks d on d.workspace_id=i.workspace_id and d.id=i.deck_id where i.service_id=p_id order by i.position,i.id loop
  sections:=sections||jsonb_build_array(jsonb_build_object('id',r.id,'deckId',r.deck_id,'label',r.label,'sourceSongId',r.source_song_id,'startIndex',jsonb_array_length(slides),'slideCount',jsonb_array_length(r.document->'slides')));
  revisions:=revisions||jsonb_build_array(jsonb_build_object('item',r.id,'deck',r.deck_id,'revision',r.revision));
  for slide in select value from jsonb_array_elements(r.document->'slides') loop
   elements:='[]';
   for el in select value from jsonb_array_elements(slide->'elements') loop
    elements:=elements||jsonb_build_array(jsonb_set(el,'{id}',to_jsonb(private.snapshot_id(r.id,(el->>'id')::uuid))));
   end loop;
   slide:=jsonb_set(jsonb_set(slide,'{id}',to_jsonb(private.snapshot_id(r.id,(slide->>'id')::uuid))),'{elements}',elements);
   slides:=slides||jsonb_build_array(slide);
   if jsonb_array_length(slides)>2000 then raise exception 'Service exceeds 2000 slides. Split this service.' using errcode='22023'; end if;
  end loop;
 end loop;
 if jsonb_array_length(slides)=0 then raise exception 'Add a presentation before preparing this service.' using errcode='22023'; end if;
 select count(distinct dm.media_id) into expected_media from public.deck_media dm join public.service_items i on i.workspace_id=dm.workspace_id and i.deck_id=dm.deck_id where i.service_id=p_id;
 select coalesce(jsonb_agg(private.media_json(a) order by a.id),'[]'::jsonb) into media from public.media_assets a where a.workspace_id=w and a.state='active' and exists(select 1 from public.deck_media dm join public.service_items i on i.workspace_id=dm.workspace_id and i.deck_id=dm.deck_id where i.service_id=p_id and dm.media_id=a.id);
 if jsonb_array_length(media)<>expected_media then raise exception 'A service file is unavailable.' using errcode='0A000';end if;
 revisions:=revisions||jsonb_build_array(jsonb_build_object('media',media));
 snapshot:=jsonb_build_object('schemaVersion',1,'serviceId',p.id,'workspaceId',w,'sourceRevision',encode(extensions.digest(revisions::text,'sha256'),'hex'),
 'title',p.title,'slides',slides,'media',media,'sections',sections);
 if octet_length(snapshot::text)>16777216 then raise exception 'Service exceeds 16 MiB. Split this service.' using errcode='22023'; end if;
 return snapshot;
end $$;

-- Linearize cleanup against finalization before any external object removal.
-- A lost finalization response must never cause deletion of an active image.
create function private.media_abort_upload(p_reservation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.quota_reservations;a public.media_assets;
begin
 perform private.assert_service_role();perform 1 from private.image_quota where id for update;perform 1 from private.document_usage where id for update;
 select * into r from private.quota_reservations where id=p_reservation_id;
 if not found then
  select * into a from public.media_assets where upload_reservation_id=p_reservation_id and state='active';
  if found then return jsonb_build_object('status','active','media',private.media_json(a));end if;
  return jsonb_build_object('status','missing');
 end if;
 perform 1 from public.workspaces where id=r.workspace_id for update;
 select * into r from private.quota_reservations where id=p_reservation_id for update;
 if not found then raise exception 'Upload changed. Retry cleanup.' using errcode='40001';end if;
 select * into a from public.media_assets where id=r.media_id for update;
 if a.state not in('uploading','aborting') then raise exception 'Upload changed. Keep its bytes until status is confirmed.' using errcode='40001';end if;
 update public.media_assets set state='aborting' where id=a.id;
 return jsonb_build_object('status','aborting','reservationId',r.id,'objectKey',r.object_key);
end $$;
create function public.media_abort_upload(p_reservation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.media_abort_upload(p_reservation_id);$$;
revoke all on function private.media_abort_upload(uuid),public.media_abort_upload(uuid) from public,anon,authenticated;
grant execute on function private.media_abort_upload(uuid),public.media_abort_upload(uuid) to service_role;
create function private.get_media_management(p_workspace_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();
begin
 if not private.is_workspace_member(p_workspace_id) then raise exception 'Workspace unavailable.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('asset',private.media_json(a::public.media_assets),'state',a.state,'createdBy',a.created_by,'expiresAt',r.expires_at) order by a.created_at desc,a.id)
 from(select * from public.media_assets where workspace_id=p_workspace_id and state<>'active' and(created_by=actor or private.is_workspace_owner(p_workspace_id)) order by created_at desc,id limit 25) a
 left join private.quota_reservations r on r.media_id=a.id),'[]'::jsonb);
end $$;
create function public.get_media_management(p_workspace_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.get_media_management(p_workspace_id);$$;
revoke all on function private.get_media_management(uuid),public.get_media_management(uuid) from public,anon;
grant execute on function private.get_media_management(uuid),public.get_media_management(uuid) to authenticated;
