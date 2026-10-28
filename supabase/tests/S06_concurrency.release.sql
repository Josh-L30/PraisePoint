-- Remove only unpublished, metadata-only reservations belonging to this fixture.
begin;
create temp table s06_release_ids(id uuid);grant select on s06_release_ids to service_role;
do $$ begin
 assert not exists(select 1 from public.media_assets where created_by in('a6600000-0000-4000-8000-000000000001','a6600000-0000-4000-8000-000000000002') and (state not in('uploading','aborting') or id not in('a6600000-0000-4000-8000-000000000010','a6600000-0000-4000-8000-000000000011'))),'Unexpected race content; stopped.';
 assert not exists(select 1 from storage.objects o join private.quota_reservations r on r.object_key=o.name where o.bucket_id='gather-images' and r.actor_id in('a6600000-0000-4000-8000-000000000001','a6600000-0000-4000-8000-000000000002')),'Fixture unexpectedly has physical object metadata; use Storage API cleanup.';
end $$;
insert into s06_release_ids select id from private.quota_reservations where actor_id in('a6600000-0000-4000-8000-000000000001','a6600000-0000-4000-8000-000000000002') and media_id in('a6600000-0000-4000-8000-000000000010','a6600000-0000-4000-8000-000000000011');
set local role service_role;
select public.media_abort_upload(id),public.media_release_upload(id) from s06_release_ids;
reset role;
-- Restore authoritative accounting under the same global lock used by every writer.
select 1 from private.image_quota where id for update;
update private.image_quota set used_bytes=(select coalesce(sum(bytes),0) from public.media_assets where location='cloud' and state in('active','deleting')),reserved_bytes=(select coalesce(sum(bytes),0) from private.quota_reservations) where id;
commit;
