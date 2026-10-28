begin;
do $$ begin assert not exists(select 1 from private.quota_reservations),'Release the first race before proceeding.';end $$;
insert into private.workspace_image_quota(workspace_id,used_bytes,reserved_bytes) select id,47185920,0 from public.workspaces where created_by='a6600000-0000-4000-8000-000000000001' and kind='personal' on conflict(workspace_id) do update set used_bytes=47185920,reserved_bytes=0;
commit;
-- For the workspace race, run first.sql unchanged and second.sql with actor A's claims.
