-- Hosted rollback-only assertions. Synthetic identities; no emails are sent.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('a1000000-0000-4000-8000-000000000001','s02-owner@example.invalid',now(),'{"provider":"google"}','{"full_name":"S02 Owner"}'),
('a1000000-0000-4000-8000-000000000002','s02-member@example.invalid',now(),'{"provider":"google"}','{"full_name":"S02 Member"}'),
('a1000000-0000-4000-8000-000000000003','s02-outsider@example.invalid',now(),'{"provider":"google"}','{"full_name":"S02 Outsider","email":"s02-member@example.invalid"}');
create temp table s02_state (key text primary key, value text);
grant select,insert,update on s02_state to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
insert into s02_state values('owner_personal',public.ensure_personal_workspace()->>'workspaceId');
do $$ begin
  begin perform public.create_church_workspace('   '); raise exception 'blank name accepted';
  exception when invalid_parameter_value then null; end;
end $$;
insert into s02_state values('church',public.create_church_workspace('S02 Test Church')::text);
do $$ begin
  begin perform public.create_church_workspace('Second church'); raise exception 'second church accepted';
  exception when unique_violation then null; end;
  assert (select count(*)=2 from public.workspaces), 'personal/church separation lost';
  begin perform public.leave_church_workspace((select value::uuid from s02_state where key='church')); raise exception 'owner left';
  exception when insufficient_privilege then null; end;
  begin perform public.remove_workspace_member((select value::uuid from s02_state where key='church'),'a1000000-0000-4000-8000-000000000001'); raise exception 'owner removed self';
  exception when insufficient_privilege then null; end;
end $$;
insert into s02_state
select 'member_token', public.create_team_invitation((select value::uuid from s02_state where key='church'),' S02-MEMBER@example.invalid ')->>'token';
do $$ begin
  assert exists(select 1 from public.invitations where workspace_id=(select value::uuid from s02_state where key='church')
    and normalized_email='s02-member@example.invalid' and expires_at=now()+interval '7 days'), 'normalized recipient or seven-day expiry incorrect';
end $$;

select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","app_metadata":{"provider":"google"}}',true);
select public.ensure_personal_workspace();
do $$ begin
  assert (select count(*)=0 from public.workspaces where id=(select value::uuid from s02_state where key='church')), 'outsider can read church';
  begin perform public.accept_team_invitation((select value from s02_state where key='member_token')); raise exception 'editable metadata authorized invite';
  exception when insufficient_privilege then null; end;
  begin perform public.create_team_invitation((select value::uuid from s02_state where key='church'),'x@example.invalid'); raise exception 'outsider invited';
  exception when insufficient_privilege then null; end;
  begin perform public.get_workspace_team((select value::uuid from s02_state where key='church')); raise exception 'outsider team directory';
  exception when insufficient_privilege then null; end;
  begin update public.workspace_members set role='owner'; raise exception 'raw role escalation';
  exception when insufficient_privilege then null; end;
  begin perform token_hash from public.invitations limit 1; raise exception 'token hashes exposed';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
select public.ensure_personal_workspace();
do $$ declare joined uuid; team jsonb; begin
  joined:=public.accept_team_invitation((select value from s02_state where key='member_token'));
  assert joined=(select value::uuid from s02_state where key='church'), 'wrong joined church';
  assert (select count(*)=2 from public.workspaces), 'membership or private workspace missing';
  assert (select count(*)=0 from public.workspaces where id=(select value::uuid from s02_state where key='owner_personal')), 'foreign personal workspace exposed';
  assert (select count(*)=0 from public.profiles where id='a1000000-0000-4000-8000-000000000001'), 'teammate private profile exposed';
  team:=public.get_workspace_team(joined);
  assert jsonb_array_length(team)=2, 'team display projection incomplete';
  assert not exists(select 1 from jsonb_array_elements(team) x where x ? 'email'), 'member email exposed';
  begin perform public.accept_team_invitation((select value from s02_state where key='member_token')); raise exception 'invite replay accepted';
  exception when insufficient_privilege then null; end;
  begin perform public.create_team_invitation(joined,'x@example.invalid'); raise exception 'member invited';
  exception when insufficient_privilege then null; end;
  begin perform public.transfer_workspace_owner(joined,'a1000000-0000-4000-8000-000000000002'); raise exception 'member escalated';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
do $$ declare invitation jsonb; begin
  invitation:=public.create_team_invitation((select value::uuid from s02_state where key='church'),'s02-outsider@example.invalid');
  insert into s02_state values('revoked_token',invitation->>'token');
  perform public.revoke_team_invitation((select value::uuid from s02_state where key='church'),(invitation->>'id')::uuid);
  invitation:=public.create_team_invitation((select value::uuid from s02_state where key='church'),'s02-outsider@example.invalid');
  insert into s02_state values('expired_token',invitation->>'token');
  insert into s02_state values('expired_id',invitation->>'id');
end $$;
reset role;
update public.invitations set expires_at=now()-interval '1 second' where id=(select value::uuid from s02_state where key='expired_id');
do $$ begin
  assert not exists(select 1 from public.invitations where token_hash=(select value from s02_state where key='member_token')), 'plaintext token stored';
  assert (select bool_and(length(token_hash)=64) from public.invitations where workspace_id=(select value::uuid from s02_state where key='church')), 'invalid token digest';
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","app_metadata":{"provider":"google"}}',true);
do $$ begin
  begin perform public.accept_team_invitation((select value from s02_state where key='revoked_token')); raise exception 'revoked invite accepted';
  exception when insufficient_privilege then null; end;
  begin perform public.accept_team_invitation((select value from s02_state where key='expired_token')); raise exception 'expired invite accepted';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
select public.remove_workspace_member((select value::uuid from s02_state where key='church'),'a1000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
do $$ begin
  assert (select count(*)=0 from public.workspaces where id=(select value::uuid from s02_state where key='church')), 'removed member retains church access';
  begin perform public.get_workspace_team((select value::uuid from s02_state where key='church')); raise exception 'removed member sees team';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
insert into s02_state select 'rejoin_token',public.create_team_invitation((select value::uuid from s02_state where key='church'),'s02-member@example.invalid')->>'token';
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
select public.accept_team_invitation((select value from s02_state where key='rejoin_token'));

reset role;
delete from private.operation_budgets where actor_id='a1000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
do $$ declare i integer; begin
  for i in 1..10 loop perform public.create_team_invitation((select value::uuid from s02_state where key='church'),'limit-'||i||'@example.invalid'); end loop;
  begin perform public.create_team_invitation((select value::uuid from s02_state where key='church'),'limit-11@example.invalid'); raise exception 'invitation limit bypassed' using errcode='22023';
  exception when sqlstate 'P0001' then null; end;
  begin perform public.transfer_workspace_owner((select value::uuid from s02_state where key='church'),'a1000000-0000-4000-8000-000000000003'); raise exception 'ownership sent to nonmember';
  exception when insufficient_privilege then null; end;
  perform public.transfer_workspace_owner((select value::uuid from s02_state where key='church'),'a1000000-0000-4000-8000-000000000002');
  begin perform public.transfer_workspace_owner((select value::uuid from s02_state where key='church'),'a1000000-0000-4000-8000-000000000003'); raise exception 'stale owner changed ownership';
  exception when insufficient_privilege then null; end;
  perform public.leave_church_workspace((select value::uuid from s02_state where key='church'));
  assert (select count(*)=0 from public.workspaces where id=(select value::uuid from s02_state where key='church')), 'former member retains church';
end $$;
reset role;
do $$ declare i integer; begin
  for i in 1..120 loop perform private.consume_operation('a1000000-0000-4000-8000-000000000002','content'); end loop;
  begin perform private.consume_operation('a1000000-0000-4000-8000-000000000002','content'); raise exception 'content limit bypassed' using errcode='22023';
  exception when sqlstate 'P0001' then null; end;
  assert (select count(*)=1 from public.workspace_members where workspace_id=(select value::uuid from s02_state where key='church') and role='owner'), 'owner invariant violated';
end $$;
select 'S02 create, identity, tenant, invite, ownership, revocation and budget assertions passed; fixtures rolled back' as result;
rollback;
