-- Disposable, marked accounts for true multi-connection races. Run cleanup in finally.
begin;
do $$ begin
  assert not exists(select 1 from auth.users where id in ('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000003')), 'concurrency fixture ID collision';
end $$;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('a2000000-0000-4000-8000-000000000001','s02-race-owner@example.invalid',now(),'{"provider":"google","test_fixture":"S02_concurrency"}','{"full_name":"S02 race owner"}'),
('a2000000-0000-4000-8000-000000000002','s02-race-member@example.invalid',now(),'{"provider":"google","test_fixture":"S02_concurrency"}','{"full_name":"S02 race member"}'),
('a2000000-0000-4000-8000-000000000003','s02-race-other@example.invalid',now(),'{"provider":"google","test_fixture":"S02_concurrency"}','{"full_name":"S02 race other"}');
create temp table s02_race_state(id uuid);
grant all on s02_race_state to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a2000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
select public.ensure_personal_workspace();
insert into s02_race_state values(public.create_church_workspace('S02 concurrency fixture'));
do $$ begin
  perform public.create_team_invitation((select id from s02_race_state),'s02-race-member@example.invalid');
  perform public.create_team_invitation((select id from s02_race_state),'s02-race-other@example.invalid');
end $$;
select set_config('request.jwt.claims','{"sub":"a2000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
select public.ensure_personal_workspace();
select set_config('request.jwt.claims','{"sub":"a2000000-0000-4000-8000-000000000003","app_metadata":{"provider":"google"}}',true);
select public.ensure_personal_workspace();
reset role;
-- Known test-only tokens are bound to nonexistent .invalid email addresses.
update public.invitations set token_hash=encode(extensions.digest(repeat('ab',32),'sha256'),'hex')
  where workspace_id=(select id from s02_race_state) and normalized_email='s02-race-member@example.invalid';
update public.invitations set token_hash=encode(extensions.digest(repeat('cd',32),'sha256'),'hex')
  where workspace_id=(select id from s02_race_state) and normalized_email='s02-race-other@example.invalid';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a2000000-0000-4000-8000-000000000003","app_metadata":{"provider":"google"}}',true);
select public.accept_team_invitation(repeat('cd',32));
reset role;
select id as workspace_id from s02_race_state;
commit;
