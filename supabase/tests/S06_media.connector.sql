-- Synthetic rollback-only fixtures. Storage rows below are metadata-only test
-- records; actual object bytes/decoding are verified through the upload function.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('a6000000-0000-4000-8000-000000000001','s06-owner@example.invalid',now(),'{"provider":"google"}','{"full_name":"S06 Owner"}'),
('a6000000-0000-4000-8000-000000000002','s06-member@example.invalid',now(),'{"provider":"google"}','{"full_name":"S06 Member"}'),
('a6000000-0000-4000-8000-000000000003','s06-outsider@example.invalid',now(),'{"provider":"google"}','{"full_name":"S06 Outsider"}');
create temp table s06_state(key text primary key,value jsonb);grant select,insert,update on s06_state to authenticated,service_role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a6000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
insert into s06_state values('personal',public.ensure_personal_workspace());
insert into s06_state values('church',to_jsonb(public.create_church_workspace('S06 Church')::text));
insert into s06_state select 'local',jsonb_build_object('id','a6000000-0000-4000-8000-000000000010','workspaceId',value#>>'{}','kind','video','mime','video/mp4','bytes',100,
 'sha256',repeat('a',64),'revision',1,'location','local','originalName','S06 video.mp4') from s06_state where key='church';
insert into s06_state select 'savedLocal',public.register_local_media(value,960,540,5.0,null) from s06_state where key='local';
insert into s06_state select 'image',jsonb_build_object('id','a6000000-0000-4000-8000-000000000020','workspaceId',value#>>'{}','kind','image','mime','image/png','bytes',100,
 'sha256',repeat('b',64),'revision',1,'location','cloud','originalName','S06 still.png') from s06_state where key='church';
insert into s06_state select 'reservation',public.reserve_image_upload(value,null) from s06_state where key='image';
do $$ declare a jsonb:=(select value from s06_state where key='image'); r jsonb:=(select value from s06_state where key='reservation'); begin
 assert r->>'status'='pending','reservation state';
 assert (select count(*)=1 from public.media_assets),'pending asset readable';
 assert public.reserve_image_upload(a,null)=r,'retry created another reservation';
 assert public.get_media_usage((a->>'workspaceId')::uuid)->>'workspaceReserved'='100','reservation not charged';
 begin perform public.reserve_image_upload(a||'{"kind":"video","mime":"video/mp4"}',null);raise exception 'video cloud upload accepted';exception when invalid_parameter_value then null;end;
 begin perform public.media_begin_write((r->>'reservationId')::uuid);raise exception 'client claimed upload' using errcode='XX000';exception when insufficient_privilege then null;end;
 begin perform public.media_finalize_upload((r->>'reservationId')::uuid,repeat('b',64),32,18);raise exception 'client finalized upload';exception when insufficient_privilege then null;end;
 begin update public.media_assets set state='active';raise exception 'raw catalog update';exception when insufficient_privilege then null;end;
end $$;

reset role;
do $$ begin
 begin insert into storage.objects(bucket_id,name,metadata) select 'gather-images',value->>'objectKey','{"size":100,"mimetype":"image/png"}'::jsonb from s06_state where key='reservation';raise exception 'unclaimed write allowed' using errcode='XX000';exception when insufficient_privilege then null;end;
end $$;
set local role service_role;
do $$ declare rid uuid:=(select (value->>'reservationId')::uuid from s06_state where key='reservation');begin
 assert public.media_begin_write(rid)->>'status'='claimed','first writer not claimed';
 assert public.media_begin_write(rid)->>'status'='busy','second writer acquired same lease';
 assert public.media_abort_upload(rid)->>'status'='busy','legacy abort interrupted live writer';
 assert public.media_abort_upload(rid,null)->>'status'='busy','null ownership bypassed live writer';
 assert public.media_abort_upload(rid,false)->>'status'='busy','unclaimed abort interrupted live writer';
end $$;
-- Storage performs a rolled-back authorization probe using contentLength before actual size metadata exists.
savepoint storage_permission_probe;
reset role;
insert into storage.objects(bucket_id,name,metadata) select 'gather-images',value->>'objectKey','{"contentLength":100,"mimetype":"image/png"}'::jsonb from s06_state where key='reservation';
rollback to storage_permission_probe;
release storage_permission_probe;
reset role;
insert into storage.objects(bucket_id,name,metadata) select 'gather-images',value->>'objectKey','{"size":100,"mimetype":"image/png"}'::jsonb from s06_state where key='reservation';
set local role service_role;
insert into s06_state select 'finalImage',public.media_finalize_upload((value->>'reservationId')::uuid,repeat('b',64),32,18) from s06_state where key='reservation';
do $$ begin
 assert (select value from s06_state where key='finalImage')=(select value from s06_state where key='image'),'final descriptor mismatch';
 perform public.media_finalize_upload((select (value->>'reservationId')::uuid from s06_state where key='reservation'),repeat('b',64),32,18);
  assert public.media_abort_upload((select (value->>'reservationId')::uuid from s06_state where key='reservation'))->>'status'='active','ambiguous completion cleanup could delete an active image';
end $$;
set local role authenticated;
do $$ declare a jsonb:=(select value from s06_state where key='image');begin
 assert (select count(*)=2 from public.media_assets),'active image unavailable';
 assert public.get_media_usage((a->>'workspaceId')::uuid)->>'workspaceUsed'='100','finalization accounting';
 assert public.get_media_usage((a->>'workspaceId')::uuid)->>'workspaceReserved'='0','reservation charged twice';
end $$;
do $$ declare w uuid:=(select (value#>>'{}')::uuid from s06_state where key='church');d jsonb;p jsonb;snapshot jsonb;begin
 d:=jsonb_build_object('schemaVersion',1,'id','a6000000-0000-4000-8000-000000000030','workspaceId',w,'title','S06 referenced presentation','width',1920,'height',1080,
 'slides',jsonb_build_array(jsonb_build_object('id','a6000000-0000-4000-8000-000000000031','category','lyrics','background',jsonb_build_object('kind','video','mediaId','a6000000-0000-4000-8000-000000000010'),
 'elements',jsonb_build_array(jsonb_build_object('id','a6000000-0000-4000-8000-000000000032','kind','image','mediaId','a6000000-0000-4000-8000-000000000020','fit','contain','x',96,'y',96,'width',960,'height',540,'z',1)))));
 perform public.create_slide_deck(w,d);
 assert(select count(*)=2 from public.deck_media where deck_id=(d->>'id')::uuid),'derived media links missing';
 begin perform public.begin_media_delete('a6000000-0000-4000-8000-000000000020');raise exception 'referenced image deleted';exception when foreign_key_violation then assert sqlerrm like '%S06 referenced presentation%','missing media dependency description';end;
 begin perform public.save_slide_deck(jsonb_set(d,'{slides,0,elements,0,fit}','"unsafe"'),1);raise exception 'invalid image fit';exception when invalid_parameter_value then null;end;
 begin perform public.save_slide_deck(jsonb_set(d,'{slides,0,elements,0,mediaId}','"a6000000-0000-4000-8000-000000000010"'),1);raise exception 'video used as image';exception when feature_not_supported then null;end;
 p:=jsonb_build_object('id','a6000000-0000-4000-8000-000000000040','workspaceId',w,'title','S06 service','date',null,'revision',0,'items',jsonb_build_array(jsonb_build_object('id','a6000000-0000-4000-8000-000000000041','deckId',d->>'id','label','Video and image','position',0)));
 perform public.save_service_plan(p,0);snapshot:=public.build_service_snapshot((p->>'id')::uuid);
 assert jsonb_array_length(snapshot->'media')=2,'snapshot lost media descriptors';
 perform public.delete_service_plan((p->>'id')::uuid);perform public.delete_slide_deck((d->>'id')::uuid);
 assert not exists(select 1 from public.deck_media where deck_id=(d->>'id')::uuid),'presentation deletion retained link rows';
 assert exists(select 1 from public.media_assets where id='a6000000-0000-4000-8000-000000000020'),'deck delete cascaded to media';
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"a6000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);select public.ensure_personal_workspace();
insert into public.workspace_members(workspace_id,user_id,role) select (value#>>'{}')::uuid,'a6000000-0000-4000-8000-000000000002','member' from s06_state where key='church';
set local role authenticated;
do $$begin
 assert (select count(*)=2 from public.media_assets),'member cannot read media';
 begin perform public.begin_media_delete('a6000000-0000-4000-8000-000000000020');raise exception 'member deleted shared media';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"a6000000-0000-4000-8000-000000000003","app_metadata":{"provider":"google"}}',true);
do $$begin
 assert (select count(*)=0 from public.media_assets),'outsider read assets';
 begin perform public.register_local_media((select value from s06_state where key='local'),960,540,5.0,null);raise exception 'outsider registered';exception when insufficient_privilege then null;end;
 begin perform public.get_media_usage((select (value#>>'{}')::uuid from s06_state where key='church'));raise exception 'outsider quota read';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"a6000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
select public.begin_media_delete('a6000000-0000-4000-8000-000000000020');
set local role service_role;
do $$begin
 begin perform public.media_finish_delete('a6000000-0000-4000-8000-000000000020');raise exception 'freed quota with object still present';exception when foreign_key_violation then null;end;
end $$;


-- Explicit presentation copies must replace all private source media identifiers.
set local role authenticated;
do $$ declare source_ws uuid:=(select (value#>>'{}')::uuid from s06_state where key='church'); dest_ws uuid:=(select (value->>'workspaceId')::uuid from s06_state where key='personal');
 copied jsonb;doc jsonb;mapping jsonb:= '[{"sourceId":"a6000000-0000-4000-8000-000000000010","destinationId":"a6000000-0000-4000-8000-000000000051"}]';begin
 perform public.register_local_media((select value from s06_state where key='local')||jsonb_build_object('id','a6000000-0000-4000-8000-000000000051','workspaceId',dest_ws),960,540,5.0,'a6000000-0000-4000-8000-000000000010');
 doc:=jsonb_build_object('schemaVersion',1,'id','a6000000-0000-4000-8000-000000000050','workspaceId',source_ws,'title','S06 copied local background','width',1920,'height',1080,'slides',jsonb_build_array(jsonb_build_object('id','a6000000-0000-4000-8000-000000000052','category','lyrics','background',jsonb_build_object('kind','video','mediaId','a6000000-0000-4000-8000-000000000010'),'elements','[]'::jsonb)));
 perform public.create_slide_deck(source_ws,doc);
 copied:=public.duplicate_slide_deck_with_media((doc->>'id')::uuid,dest_ws,1,mapping,null);
 assert copied#>>'{document,slides,0,background,mediaId}'='a6000000-0000-4000-8000-000000000051','copy retained private media id';
 assert exists(select 1 from public.deck_media where deck_id=(copied#>>'{document,id}')::uuid and workspace_id=dest_ws and media_id='a6000000-0000-4000-8000-000000000051'),'copy lacks destination-bound derived link';
 begin perform public.duplicate_slide_deck_with_media((doc->>'id')::uuid,dest_ws,1,'[]',null);raise exception 'missing media mapping accepted';exception when invalid_parameter_value then null;end;
 begin perform public.duplicate_slide_deck_with_media((doc->>'id')::uuid,dest_ws,2,mapping,null);raise exception 'copy ignored reviewed revision';exception when serialization_failure then null;end;
 perform public.delete_slide_deck((copied#>>'{document,id}')::uuid);perform public.delete_slide_deck((doc->>'id')::uuid);
end $$;

-- Expiry and release are rollback-only; no actual Storage object is removed by SQL.
set local role authenticated;
insert into s06_state select 'expiryAsset',value||jsonb_build_object('id','a6000000-0000-4000-8000-000000000021','sha256',repeat('c',64)) from s06_state where key='image';
insert into s06_state select 'expiryReservation',public.reserve_image_upload(value,null) from s06_state where key='expiryAsset';
set local role service_role;
do $$ declare rid uuid:=(select (value->>'reservationId')::uuid from s06_state where key='expiryReservation');begin
 assert public.media_begin_write(rid)->>'status'='claimed','expiry writer not claimed';
 assert public.media_abort_upload(rid,true)->>'status'='aborting','claimed failure not marked';
 begin perform public.media_release_upload(rid);raise exception 'released in-flight capacity' using errcode='XX000';exception when serialization_failure then null;end;
 assert not exists(select 1 from jsonb_array_elements(public.media_expired_uploads()) item where item->>'reservationId'=rid::text),'live started failure reclaimed early';
end $$;
reset role;
update private.quota_reservations set expires_at=now()-interval '1 second' where id=(select (value->>'reservationId')::uuid from s06_state where key='expiryReservation');
set local role service_role;
do $$ declare r jsonb:=(select value from s06_state where key='expiryReservation');begin
 assert exists(select 1 from jsonb_array_elements(public.media_expired_uploads()) item where item->>'reservationId'=r->>'reservationId'),'expired upload not discoverable';
 begin perform public.media_finalize_upload((r->>'reservationId')::uuid,repeat('c',64),32,18);raise exception 'expired upload finalized';exception when serialization_failure then null;end;
 assert public.media_abort_upload((r->>'reservationId')::uuid)->>'status'='aborting','expired upload not marked before cleanup';
end $$;
reset role;
do $$ declare r jsonb:=(select value from s06_state where key='expiryReservation');begin
 begin insert into storage.objects(bucket_id,name,metadata) values('gather-images',r->>'objectKey','{"size":100,"mimetype":"image/png"}');raise exception 'late object insert after abort';exception when insufficient_privilege then null;end;
end $$;
set local role service_role;
select public.media_release_upload((value->>'reservationId')::uuid) from s06_state where key='expiryReservation';
select public.media_release_upload((value->>'reservationId')::uuid) from s06_state where key='expiryReservation';
set local role authenticated;
do $$ begin
 assert public.get_media_usage((select (value#>>'{}')::uuid from s06_state where key='church'))->>'workspaceReserved'='0','expired release retained/double-subtracted quota';
 assert not exists(select 1 from public.media_assets where id='a6000000-0000-4000-8000-000000000021'),'unpublished asset remains';
end $$;

savepoint global_capacity;
reset role;
update private.image_quota set used_bytes=524288000,reserved_bytes=0 where id;
set local role authenticated;
do $$ begin
 begin perform public.reserve_image_upload((select value from s06_state where key='expiryAsset'),null);raise exception 'global capacity bypassed';exception when insufficient_resources then null;end;
end $$;
rollback to global_capacity;
release global_capacity;
savepoint workspace_capacity;
reset role;
update private.workspace_image_quota set used_bytes=52428800,reserved_bytes=0 where workspace_id=(select (value#>>'{}')::uuid from s06_state where key='church');
set local role authenticated;
do $$ begin
 begin perform public.reserve_image_upload((select value from s06_state where key='expiryAsset'),null);raise exception 'workspace capacity bypassed';exception when insufficient_resources then null;end;
end $$;
rollback to workspace_capacity;
release workspace_capacity;
savepoint attempt_limit;
reset role;
update private.operation_budgets set used=30,window_start=date_trunc('hour',now()) where actor_id='a6000000-0000-4000-8000-000000000001' and operation='upload';
set local role authenticated;
do $$ begin
 begin perform public.reserve_image_upload((select value from s06_state where key='expiryAsset'),null);raise exception 'upload attempt limit bypassed' using errcode='XX000';exception when raise_exception then assert sqlerrm like '%limit%','unexpected quota failure';end;
end $$;
rollback to attempt_limit;
release attempt_limit;

rollback;
