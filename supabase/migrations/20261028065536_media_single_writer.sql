-- Only one proxy request can start a Storage write for a charged lease.
-- Failed started writes remain charged until expiry, beyond the per-request
-- upstream deadline, so cleanup cannot race an unpublished physical object.
do $$ begin
 if exists(select 1 from private.quota_reservations) then raise exception 'Finish or reclaim pending uploads before this migration.';end if;
end $$;
alter table private.quota_reservations add column storage_attempted boolean not null default false;
create function private.media_begin_write(p_reservation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.quota_reservations;a public.media_assets;source_ws uuid;next_ws uuid;
begin
 perform private.assert_service_role();perform 1 from private.image_quota where id for update;perform 1 from private.document_usage where id for update;
 select * into r from private.quota_reservations where id=p_reservation_id;
 if not found then
  select * into a from public.media_assets where upload_reservation_id=p_reservation_id and state='active';
  if not found then raise exception 'Upload unavailable.' using errcode='42501';end if;
  perform private.lock_actor_workspace(a.workspace_id,a.created_by);
  return jsonb_build_object('status','active','media',private.media_json(a));
 end if;
 select workspace_id into source_ws from public.media_assets where id=r.source_media_id;
 for next_ws in select distinct value from unnest(array[r.workspace_id,source_ws]) value where value is not null order by value loop perform private.lock_actor_workspace(next_ws,r.actor_id);end loop;
 select * into r from private.quota_reservations where id=p_reservation_id for update;
 if not found or r.expires_at<=clock_timestamp() then raise exception 'Upload expired.' using errcode='40001';end if;
 select * into a from public.media_assets where id=r.media_id for update;
 if a.state<>'uploading' then raise exception 'Upload is being reclaimed.' using errcode='40001';end if;
 perform private.assert_media_source(r.source_media_id,private.media_json(a),r.actor_id,'cloud');
 if r.storage_attempted then return jsonb_build_object('status','busy');end if;
 if r.expires_at<clock_timestamp()+interval '3 minutes' then raise exception 'Upload lease is too close to expiry. Reclaim it before retrying.' using errcode='40001';end if;
 update private.quota_reservations set storage_attempted=true where id=r.id;
 return jsonb_build_object('status','claimed');
end $$;
create function public.media_begin_write(p_reservation_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.media_begin_write(p_reservation_id);$$;
create function private.media_abort_upload(p_reservation_id uuid,p_writer_claimed boolean) returns jsonb language plpgsql security definer set search_path='' as $$
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
 if r.storage_attempted and not coalesce(p_writer_claimed,false) and r.expires_at>clock_timestamp() then return jsonb_build_object('status','busy');end if;
 update public.media_assets set state='aborting' where id=a.id;
 return jsonb_build_object('status','aborting','reservationId',r.id,'objectKey',r.object_key);
end $$;
create function public.media_abort_upload(p_reservation_id uuid,p_writer_claimed boolean) returns jsonb language sql security invoker set search_path='' as $$select private.media_abort_upload(p_reservation_id,p_writer_claimed);$$;
create or replace function private.media_abort_upload(p_reservation_id uuid) returns jsonb language sql security definer set search_path='' as $$select private.media_abort_upload(p_reservation_id,false);$$;
create or replace function private.media_release_upload(p_reservation_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare r private.quota_reservations;a public.media_assets;
begin
 perform private.assert_service_role();perform 1 from private.image_quota where id for update;perform 1 from private.document_usage where id for update;
 select * into r from private.quota_reservations where id=p_reservation_id;
 if not found then return;end if;
 perform 1 from public.workspaces where id=r.workspace_id for update;
 select * into r from private.quota_reservations where id=p_reservation_id for update;
 if not found then return;end if;
 if r.storage_attempted and r.expires_at>clock_timestamp() then raise exception 'Writer may still be in flight. Capacity remains reserved until expiry.' using errcode='40001';end if;
 if exists(select 1 from storage.objects where bucket_id='gather-images' and name=r.object_key) then raise exception 'Remove the stored object before releasing quota.' using errcode='23503';end if;
 select * into a from public.media_assets where id=r.media_id for update;
 if a.state not in('uploading','aborting') then raise exception 'Upload already finalized.' using errcode='40001';end if;
 update private.image_quota set reserved_bytes=reserved_bytes-r.bytes where id;
 update private.workspace_image_quota set reserved_bytes=reserved_bytes-r.bytes where workspace_id=r.workspace_id;
 perform private.adjust_document_usage(r.workspace_id,-a.metadata_bytes);
 delete from private.quota_reservations where id=r.id;delete from public.media_assets where id=a.id;
end $$;
create or replace function private.media_expired_uploads() returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.assert_service_role();return coalesce((select jsonb_agg(jsonb_build_object('reservationId',id,'objectKey',object_key)) from(
 select r.id,r.object_key from private.quota_reservations r join public.media_assets a on a.id=r.media_id where r.expires_at<=clock_timestamp() or (a.state='aborting' and not r.storage_attempted) order by r.expires_at,r.id limit 20) expired),'[]'::jsonb);end $$;
-- Storage's rolled-back permission INSERT uses contentLength; its final object
-- INSERT uses size. Both must match the already charged, private reservation.
-- Client writes remain denied and finalization still requires actual size.
create or replace function private.guard_media_object() returns trigger language plpgsql security definer set search_path='' as $$
declare r private.quota_reservations;a public.media_assets;
begin
 if new.bucket_id<>'gather-images' then return new;end if;
 if TG_OP='UPDATE' and new.name=old.name and new.bucket_id=old.bucket_id and new.metadata is not distinct from old.metadata then return new;end if;
 select reservations.* into r from private.quota_reservations reservations where object_key=new.name and expires_at>clock_timestamp() for share;
 if not found or not r.storage_attempted then raise exception 'A valid upload reservation is required.' using errcode='42501';end if;
 select * into a from public.media_assets where id=r.media_id;
 if a.state<>'uploading' or not(coalesce(new.metadata ? 'size',false) or coalesce(new.metadata ? 'contentLength',false))
  or (new.metadata ? 'size' and (new.metadata->>'size')::bigint is distinct from r.bytes)
  or (new.metadata ? 'contentLength' and (new.metadata->>'contentLength')::bigint is distinct from r.bytes)
  or coalesce(new.metadata->>'mimetype',new.metadata->>'contentType') is distinct from a.mime then
  raise exception 'Stored bytes exceed or differ from the upload reservation.' using errcode='22023';end if;
 return new;
end $$;

revoke all on function private.media_begin_write(uuid),public.media_begin_write(uuid),private.media_abort_upload(uuid,boolean),public.media_abort_upload(uuid,boolean) from public,anon,authenticated;
grant execute on function private.media_begin_write(uuid),public.media_begin_write(uuid),private.media_abort_upload(uuid,boolean),public.media_abort_upload(uuid,boolean) to service_role;
