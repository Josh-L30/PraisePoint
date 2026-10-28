-- Artificial counter-boundary fixture, no actual image bytes. Paired cleanup is mandatory.
begin;
do $$ begin assert not exists(select 1 from private.quota_reservations),'Finish other pending uploads before this isolated quota check.';end $$;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('a6600000-0000-4000-8000-000000000001','s06-quota-a@example.invalid',now(),'{"provider":"google"}','{"full_name":"S06 Quota A","test_fixture":"S06_quota_race"}'),
('a6600000-0000-4000-8000-000000000002','s06-quota-b@example.invalid',now(),'{"provider":"google"}','{"full_name":"S06 Quota B","test_fixture":"S06_quota_race"}');
select set_config('request.jwt.claims','{"sub":"a6600000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);select public.ensure_personal_workspace();
select set_config('request.jwt.claims','{"sub":"a6600000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);select public.ensure_personal_workspace();
-- Leave exactly one 5 MiB reservation available globally; workspace limits are far away.
-- Keep real global accounting unchanged for this workspace-only repeat.
commit;
select jsonb_build_object('fixture','S06_quota_race','pending',count(*)) from private.quota_reservations;
