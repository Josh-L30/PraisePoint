begin;
do $$ declare bytes_to_remove bigint; begin
  if exists(select 1 from auth.users where id='a4000000-0000-4000-8000-000000000001'
    and (email is distinct from 's03-save-race@example.invalid' or raw_user_meta_data->>'test_fixture' is distinct from 'S03_save_race')) then raise exception 'Fixture identity mismatch; no cleanup performed.'; end if;
  if exists(select 1 from public.decks where created_by='a4000000-0000-4000-8000-000000000001' and id<>'a4000000-0000-4000-8000-000000000010') then raise exception 'Unexpected fixture content; no cleanup performed.'; end if;
  perform 1 from private.document_usage where id for update;
  select coalesce(sum(byte_size),0) into bytes_to_remove from public.decks where id='a4000000-0000-4000-8000-000000000010' and created_by='a4000000-0000-4000-8000-000000000001';
  update private.document_usage set used_bytes=used_bytes-bytes_to_remove where id;
  delete from public.decks where id='a4000000-0000-4000-8000-000000000010' and created_by='a4000000-0000-4000-8000-000000000001';
  delete from public.workspace_members where workspace_id in(select id from public.workspaces where created_by='a4000000-0000-4000-8000-000000000001');
  delete from public.workspaces where created_by='a4000000-0000-4000-8000-000000000001';
  delete from auth.users where id='a4000000-0000-4000-8000-000000000001' and raw_user_meta_data->>'test_fixture'='S03_save_race';
  assert not exists(select 1 from auth.users where id='a4000000-0000-4000-8000-000000000001'), 'Fixture user remains';
  assert (select used_bytes=(select coalesce(sum(byte_size),0) from public.decks) from private.document_usage where id), 'Capacity accounting drift';
end $$;
commit;
select count(*) as remaining_fixture_users from auth.users where id='a4000000-0000-4000-8000-000000000001';
