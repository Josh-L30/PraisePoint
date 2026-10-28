-- Synthetic fixtures; every change is rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('a9000000-0000-4000-8000-000000000001','s09-owner@example.invalid',now(),'{"provider":"google"}','{"full_name":"S09 Owner"}'),
('a9000000-0000-4000-8000-000000000002','s09-outsider@example.invalid',now(),'{"provider":"google"}','{"full_name":"S09 Outsider"}');
create temp table s09_state(key text primary key,value jsonb);grant select,insert,update on s09_state to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a9000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
insert into s09_state values('identity',public.ensure_personal_workspace());
insert into s09_state select 'bundle',jsonb_build_object('format','church-service','version',1,'snapshot',jsonb_build_object(
'schemaVersion',1,'serviceId','a9000000-0000-4000-8000-000000000010','workspaceId','a9000000-0000-4000-8000-000000000099','sourceRevision',repeat('a',64),'title','<script>literal service</script>',
'sections',jsonb_build_array(jsonb_build_object('id','a9000000-0000-4000-8000-000000000011','deckId','a9000000-0000-4000-8000-000000000012','label','Worship','startIndex',0,'slideCount',1,'sourceSongId','a9000000-0000-4000-8000-000000000013')),
'media',jsonb_build_array(jsonb_build_object('id','a9000000-0000-4000-8000-000000000020','workspaceId','a9000000-0000-4000-8000-000000000099','kind','image','location','cloud','mime','image/png','bytes',3,'sha256',repeat('b',64),'revision',1,'originalName','../../literal.png')),
'slides',jsonb_build_array(jsonb_build_object('id','a9000000-0000-4000-8000-000000000014','category','lyrics','background',jsonb_build_object('kind','image','mediaId','a9000000-0000-4000-8000-000000000020'),'elements',jsonb_build_array(jsonb_build_object('id','a9000000-0000-4000-8000-000000000015','kind','text','x',96,'y',96,'width',1600,'height',800,'z',0,'text','<img onerror=alert(1)>','fontFamily','Figtree','fontSize',72,'color','#ffffff','align','center'))))));
insert into s09_state select 'imported',public.import_service_metadata(value,(select (value->>'workspaceId')::uuid from s09_state where key='identity')) from s09_state where key='bundle';
do $$
declare result jsonb:=(select value from s09_state where key='imported');w uuid:=(select (value->>'workspaceId')::uuid from s09_state where key='identity');snap jsonb;sid uuid;mid uuid;before_bytes bigint;before_count bigint;
begin
 sid:=(result->>'serviceId')::uuid;mid:=(result#>>'{missingMediaIds,0}')::uuid;
 assert sid<>'a9000000-0000-4000-8000-000000000010'::uuid and mid<>'a9000000-0000-4000-8000-000000000020'::uuid,'IDs were not remapped';
 snap:=public.build_service_snapshot(sid);assert snap->>'workspaceId'=w::text and snap->>'title'='<script>literal service</script>','destination or literal title lost';
 assert snap#>>'{media,0,location}'='local' and snap#>>'{media,0,id}'=mid::text,'private cloud source reused';
 assert snap#>>'{slides,0,background,mediaId}'=mid::text,'media reference not remapped';
 assert snap#>>'{slides,0,elements,0,text}'='<img onerror=alert(1)>','literal words lost';
 assert snap#>>'{slides,0,id}'<>'a9000000-0000-4000-8000-000000000014','slide ID reused';
 assert (select source_song_id is null from public.decks where id=(snap#>>'{sections,0,deckId}')::uuid),'source master linked';
 begin perform public.import_service_metadata(jsonb_set((select value from s09_state where key='bundle'),'{version}','2'),w);raise exception 'future format accepted';exception when invalid_parameter_value then null;end;
 begin perform public.import_service_metadata((select value from s09_state where key='bundle')||'{"access_token":"secret"}',w);raise exception 'token accepted';exception when invalid_parameter_value then null;end;
 begin perform public.import_service_metadata(jsonb_set((select value from s09_state where key='bundle'),'{snapshot,media,0,signedUrl}','"https://example.invalid/private"'),w);raise exception 'URL accepted';exception when invalid_parameter_value then null;end;
 begin perform public.import_service_metadata((select value from s09_state where key='bundle'),'a9000000-0000-4000-8000-000000000099');raise exception 'foreign workspace written';exception when insufficient_privilege then null;end;
 begin perform public.import_service_metadata(jsonb_set((select value from s09_state where key='bundle'),'{snapshot,sections,0,slideCount}','2'),w);raise exception 'partial section accepted';exception when invalid_parameter_value then null;end;
 perform public.confirm_local_media_geometry(mid,32,18,null);
end $$;
reset role;
do $$ declare m public.media_assets;before_count bigint;before_used bigint;w uuid:=(select (value->>'workspaceId')::uuid from s09_state where key='identity');bad jsonb;
begin
 select * into m from public.media_assets where id=(select (value#>>'{missingMediaIds,0}')::uuid from s09_state where key='imported');
 assert m.location='local' and not m.awaiting_relink and m.width=32 and m.height=18 and m.object_key is null,'geometry relink failed';
 assert m.created_by='a9000000-0000-4000-8000-000000000001'::uuid,'owner forged';
 select count(*) into before_count from public.service_plans;select used_bytes into before_used from private.document_usage where id;
 -- Fail late, after placeholder insertion; the whole import must roll back.
 bad:=jsonb_set((select value from s09_state where key='bundle'),'{snapshot,slides,0,elements,0,fontFamily}','"Unsupported"');
 begin perform public.import_service_metadata(bad,w);raise exception 'invalid slide accepted';exception when invalid_parameter_value then null;end;
 assert (select count(*) from public.service_plans)=before_count and (select used_bytes from private.document_usage where id)=before_used,'failed import leaked records or budget';
 assert (select count(*) from public.media_assets where created_by=m.created_by)=1,'failed import leaked placeholder';
 assert not has_function_privilege('anon','public.import_service_metadata(jsonb,uuid)','execute'),'anonymous import granted';
 assert not has_function_privilege('anon','public.confirm_local_media_geometry(uuid,integer,integer,double precision)','execute'),'anonymous relink granted';
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a9000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
do $$ begin
 begin perform public.import_service_metadata((select value from s09_state where key='bundle'),(select (value->>'workspaceId')::uuid from s09_state where key='identity'));raise exception 'outsider import allowed';exception when insufficient_privilege then null;end;
 begin perform public.confirm_local_media_geometry((select (value#>>'{missingMediaIds,0}')::uuid from s09_state where key='imported'),32,18,null);raise exception 'outsider relink allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'S09 import assertions passed; all fixtures rolled back.' as result;
