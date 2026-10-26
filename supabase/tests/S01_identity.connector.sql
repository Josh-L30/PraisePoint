-- Hosted, transaction-rollback assertions; run through the Supabase SQL connector.
-- Synthetic identities exist only inside this transaction. No email or token is issued.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('11111111-1111-4111-8111-111111111111','s01-alice@example.invalid',now(),'{"provider":"google","providers":["google"]}','{"full_name":"Alice"}'),
('22222222-2222-4222-8222-222222222222','s01-bob@example.invalid',now(),'{"provider":"google","providers":["google"]}','{"full_name":"Bob"}');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","app_metadata":{"provider":"google"}}',true);
do $$
declare a jsonb; b jsonb;
begin
  a := public.ensure_personal_workspace(); b := public.ensure_personal_workspace();
  assert a->>'profileId' = '11111111-1111-4111-8111-111111111111', 'wrong profile';
  assert a->>'workspaceId' = b->>'workspaceId', 'initialization is not idempotent';
  assert (select count(*) = 1 from public.profiles), 'duplicate profile';
  assert (select count(*) = 1 from public.workspaces), 'duplicate workspace';
end $$;

select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","app_metadata":{"provider":"google"}}',true);
do $$
declare affected integer;
begin
  perform public.ensure_personal_workspace();
  assert (select count(*) = 0 from public.profiles where id = '11111111-1111-4111-8111-111111111111'), 'foreign profile exposed';
  assert (select count(*) = 0 from public.workspaces where owner_id = '11111111-1111-4111-8111-111111111111'), 'foreign workspace exposed';
  assert (select count(*) = 0 from public.workspace_members where user_id = '11111111-1111-4111-8111-111111111111'), 'foreign membership exposed';
  update public.profiles set display_name = 'Tampered' where id = '11111111-1111-4111-8111-111111111111';
  get diagnostics affected = row_count;
  assert affected = 0, 'foreign profile modified';
  begin
    insert into public.workspaces(kind,name,owner_id,created_by)
      values('personal','Spoofed','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
    raise exception 'raw ownership insertion unexpectedly permitted';
  exception when insufficient_privilege then null; end;
  begin
    update public.workspace_members set role = 'owner';
    raise exception 'raw role escalation unexpectedly permitted';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","app_metadata":{"provider":"github"}}',true);
do $$ begin
  begin perform public.ensure_personal_workspace(); raise exception 'unsupported provider accepted';
  exception when sqlstate '28000' then null; end;
end $$;
select set_config('request.jwt.claims','{"app_metadata":{"provider":"google"}}',true);
do $$ begin
  begin perform public.ensure_personal_workspace(); raise exception 'missing identity accepted';
  exception when sqlstate '28000' then null; end;
end $$;
reset role;
do $$ begin
  assert (select count(*) = 2 from public.profiles), 'unexpected profile count';
  assert (select count(*) = 2 from public.workspaces), 'unexpected workspace count';
  assert (select count(*) = 2 from public.workspace_members), 'unexpected membership count';
end $$;
select 'S01 identity: initialization, isolation, ownership, roles, and provider assertions passed; fixtures rolled back' as result;
rollback;
