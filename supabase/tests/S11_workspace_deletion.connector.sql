-- Only synthetic transaction-local records. No real Storage bytes are created/deleted.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('ab110000-0000-4000-8000-000000000001','s11-owner@example.invalid',now(),'{"provider":"google"}','{"full_name":"S11 Owner"}'),
('ab110000-0000-4000-8000-000000000002','s11-member@example.invalid',now(),'{"provider":"google"}','{"full_name":"S11 Member"}'),
('ab110000-0000-4000-8000-000000000003','s11-outsider@example.invalid',now(),'{"provider":"google"}','{"full_name":"S11 Outsider"}');
create temp table s11_state(key text primary key,value jsonb);grant select,insert,update on s11_state to authenticated,service_role;
insert into s11_state select 'initialUsage',jsonb_build_object('documents',d.used_bytes,'images',i.used_bytes,'reserved',i.reserved_bytes) from private.document_usage d cross join private.image_quota i;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ab110000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
insert into s11_state values('personal',public.ensure_personal_workspace());
insert into s11_state values('church',to_jsonb(public.create_church_workspace('S11 Church')::text));
do $$ declare w uuid:=(select (value#>>'{}')::uuid from s11_state where key='church');begin
 begin perform public.begin_workspace_deletion(w,'wrong name');raise exception 'wrong confirmation accepted' using errcode='XX000';exception when invalid_parameter_value then null;end;
 begin perform public.begin_workspace_deletion((select (value->>'workspaceId')::uuid from s11_state where key='personal'),'Personal workspace');raise exception 'personal deletion accepted' using errcode='XX000';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"ab110000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
select public.ensure_personal_workspace();
select set_config('request.jwt.claims','{"sub":"ab110000-0000-4000-8000-000000000003","app_metadata":{"provider":"google"}}',true);
select public.ensure_personal_workspace();
reset role;
insert into public.workspace_members(workspace_id,user_id,role) select (value#>>'{}')::uuid,'ab110000-0000-4000-8000-000000000002','member' from s11_state where key='church';
set local role authenticated;
do $$ declare actor text;w uuid:=(select (value#>>'{}')::uuid from s11_state where key='church');begin
 foreach actor in array array['ab110000-0000-4000-8000-000000000002','ab110000-0000-4000-8000-000000000003'] loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'app_metadata',jsonb_build_object('provider','google'))::text,true);
  begin perform public.begin_workspace_deletion(w,'S11 Church');raise exception 'non-owner deletion accepted' using errcode='XX000';exception when insufficient_privilege then null;end;
 end loop;
end $$;
select set_config('request.jwt.claims','{"sub":"ab110000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
savepoint pending_upload;
insert into s11_state select 'pending',public.reserve_image_upload(jsonb_build_object('id','ab110000-0000-4000-8000-000000000030','workspaceId',value#>>'{}','kind','image','location','cloud','mime','image/png','bytes',100,'sha256',repeat('a',64),'revision',1,'originalName','S11 pending.png'),null) from s11_state where key='church';
do $$ begin
 begin perform public.begin_workspace_deletion((select (value#>>'{}')::uuid from s11_state where key='church'),'S11 Church');raise exception 'live upload deletion accepted' using errcode='XX000';exception when sqlstate '55000' then null;end;
 assert not(select deletion_pending from public.workspaces where id=(select (value#>>'{}')::uuid from s11_state where key='church')),'pending upload partially froze workspace';
end $$;
rollback to savepoint pending_upload;
insert into s11_state select 'song',public.save_song(jsonb_build_object('id','ab110000-0000-4000-8000-000000000040','workspaceId',value#>>'{}','title','S11 Song','lyrics',E'Words\n一起敬拜','author',null,'source',null,'usageNotes',null,'revision',0),0) from s11_state where key='church';
insert into s11_state select 'local',public.register_local_media(jsonb_build_object('id','ab110000-0000-4000-8000-000000000020','workspaceId',value#>>'{}','kind','video','location','local','mime','video/mp4','bytes',100,'sha256',repeat('b',64),'revision',1,'originalName','S11 local.mp4'),960,540,5,null) from s11_state where key='church';
insert into s11_state select 'deck',public.create_slide_deck((value#>>'{}')::uuid,jsonb_build_object('schemaVersion',1,'id','ab110000-0000-4000-8000-000000000010','workspaceId',value#>>'{}','title','S11 Deck','width',1920,'height',1080,'slides',jsonb_build_array(jsonb_build_object('id','ab110000-0000-4000-8000-000000000011','category','lyrics','background',jsonb_build_object('kind','video','mediaId','ab110000-0000-4000-8000-000000000020'),'elements','[]'::jsonb)))) from s11_state where key='church';
select public.save_service_plan(jsonb_build_object('id','ab110000-0000-4000-8000-000000000050','workspaceId',(select value#>>'{}' from s11_state where key='church'),'title','S11 Service','date',null,'revision',0,'items',jsonb_build_array(jsonb_build_object('id','ab110000-0000-4000-8000-000000000051','deckId','ab110000-0000-4000-8000-000000000010','label','Welcome','position',0))),0);
savepoint cloud_cleanup_gate;
insert into s11_state select 'cloudReservation',public.reserve_image_upload(jsonb_build_object('id','ab110000-0000-4000-8000-000000000021','workspaceId',value#>>'{}','kind','image','location','cloud','mime','image/png','bytes',100,'sha256',repeat('c',64),'revision',1,'originalName','S11 synthetic cloud.png'),null) from s11_state where key='church';
set local role service_role;
select public.media_begin_write((select (value->>'reservationId')::uuid from s11_state where key='cloudReservation'));
reset role;
-- Metadata-only authorization fixture, removed by ROLLBACK TO, never by SQL DELETE.
insert into storage.objects(bucket_id,name,metadata) select 'gather-images',value->>'objectKey','{"size":100,"mimetype":"image/png"}'::jsonb from s11_state where key='cloudReservation';
set local role service_role;
select public.media_finalize_upload((select (value->>'reservationId')::uuid from s11_state where key='cloudReservation'),repeat('c',64),32,18);
set local role authenticated;
savepoint cross_workspace_copy;
select public.reserve_image_upload(jsonb_build_object('id','ab110000-0000-4000-8000-000000000022','workspaceId',(select value->>'workspaceId' from s11_state where key='personal'),'kind','image','location','cloud','mime','image/png','bytes',100,'sha256',repeat('c',64),'revision',1,'originalName','S11 pending copy.png'),'ab110000-0000-4000-8000-000000000021');
do $$ begin
 begin perform public.begin_workspace_deletion((select (value#>>'{}')::uuid from s11_state where key='church'),'S11 Church');raise exception 'pending foreign copy deletion accepted' using errcode='XX000';exception when sqlstate '55000' then null;end;
end $$;
rollback to savepoint cross_workspace_copy;
select public.begin_workspace_deletion((select (value#>>'{}')::uuid from s11_state where key='church'),'S11 Church');
do $$ declare w uuid:=(select (value#>>'{}')::uuid from s11_state where key='church');begin
 assert (select deletion_pending from public.workspaces where id=w),'workspace not frozen';
 assert not exists(select 1 from public.decks where workspace_id=w),'deck retained';
 assert not exists(select 1 from public.songs where workspace_id=w),'song retained';
 assert not exists(select 1 from public.service_plans where workspace_id=w),'service retained';
 assert not public.finish_workspace_deletion(w),'workspace removed before media cleanup';
 assert jsonb_array_length(public.workspace_deletion_batch(w))=2,'deletion batch lost local/cloud metadata';
 perform public.begin_workspace_deletion(w,'S11 Church');
 begin perform public.save_song(jsonb_set(jsonb_set((select value from s11_state where key='song'),'{id}','"ab110000-0000-4000-8000-000000000041"'),'{revision}','0'),0);raise exception 'frozen workspace write accepted' using errcode='XX000';exception when object_in_use then null;end;
end $$;
set local role service_role;
do $$ begin
 begin perform public.media_finish_delete('ab110000-0000-4000-8000-000000000021');raise exception 'quota freed before bytes removed' using errcode='XX000';exception when foreign_key_violation then null;end;
end $$;
rollback to savepoint cloud_cleanup_gate;
-- The rollback restored the original complete local workspace and removed all synthetic cloud state.
set local role authenticated;
select public.begin_workspace_deletion((select (value#>>'{}')::uuid from s11_state where key='church'),'S11 Church');
set local role service_role;
select public.media_finish_delete('ab110000-0000-4000-8000-000000000020');
select public.media_finish_delete('ab110000-0000-4000-8000-000000000020');
set local role authenticated;
select public.finish_workspace_deletion((select (value#>>'{}')::uuid from s11_state where key='church'));
reset role;
do $$ declare w uuid:=(select (value#>>'{}')::uuid from s11_state where key='church');initial jsonb:=(select value from s11_state where key='initialUsage');begin
 assert not exists(select 1 from public.workspaces where id=w),'workspace retained';
 assert not exists(select 1 from public.workspace_members where workspace_id=w),'memberships retained';
 assert exists(select 1 from public.workspaces where id=(select (value->>'workspaceId')::uuid from s11_state where key='personal')),'personal workspace deleted';
 assert (select used_bytes=(initial->>'documents')::bigint from private.document_usage),'document usage not restored';
 assert (select used_bytes=(initial->>'images')::bigint and reserved_bytes=(initial->>'reserved')::bigint from private.image_quota),'image quota not restored';
end $$;
select 'S11 workspace deletion rollback checks passed' as result;
rollback;
