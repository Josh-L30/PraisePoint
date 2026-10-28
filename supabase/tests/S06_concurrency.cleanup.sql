begin;
do $$begin
 if exists(select 1 from auth.users where id in('a6600000-0000-4000-8000-000000000001','a6600000-0000-4000-8000-000000000002') and (raw_user_meta_data->>'test_fixture' is distinct from 'S06_quota_race' or email not in('s06-quota-a@example.invalid','s06-quota-b@example.invalid'))) then raise exception 'Fixture identity mismatch; stopped.';end if;
 assert not exists(select 1 from public.media_assets where created_by in('a6600000-0000-4000-8000-000000000001','a6600000-0000-4000-8000-000000000002')),'Release race reservations first.';
 assert not exists(select 1 from public.decks where created_by in('a6600000-0000-4000-8000-000000000001','a6600000-0000-4000-8000-000000000002')),'Unexpected fixture presentation; stopped.';
end $$;
delete from private.workspace_image_quota where workspace_id in(select id from public.workspaces where created_by in('a6600000-0000-4000-8000-000000000001','a6600000-0000-4000-8000-000000000002'));
delete from public.workspace_members where workspace_id in(select id from public.workspaces where created_by in('a6600000-0000-4000-8000-000000000001','a6600000-0000-4000-8000-000000000002'));
delete from public.workspaces where created_by in('a6600000-0000-4000-8000-000000000001','a6600000-0000-4000-8000-000000000002');
delete from auth.users where id in('a6600000-0000-4000-8000-000000000001','a6600000-0000-4000-8000-000000000002') and raw_user_meta_data->>'test_fixture'='S06_quota_race';
commit;
select jsonb_build_object('fixtureUsers',(select count(*) from auth.users where raw_user_meta_data->>'test_fixture'='S06_quota_race'),'pending',(select count(*) from private.quota_reservations),'quota',(select to_jsonb(q) from private.image_quota q)) as cleanup;
