-- Only fixture IDs carrying our exact marker can be removed. Never cascade other users.
begin;
do $$ begin
  assert not exists(select 1 from auth.users where id in ('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000003')
    and coalesce(raw_app_meta_data->>'test_fixture','')<>'S02_concurrency'), 'cleanup refused unmarked identity';
end $$;
delete from public.workspaces where created_by in
  (select id from auth.users where raw_app_meta_data->>'test_fixture'='S02_concurrency'
   and id in ('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000003'));
delete from public.profiles where id in
  (select id from auth.users where raw_app_meta_data->>'test_fixture'='S02_concurrency'
   and id in ('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000003'));
delete from auth.users where raw_app_meta_data->>'test_fixture'='S02_concurrency'
  and id in ('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000003');
do $$ begin
  assert not exists(select 1 from auth.users where id in ('a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000003')), 'fixture cleanup incomplete';
end $$;
select 'S02 concurrency fixtures removed' as result;
commit;
