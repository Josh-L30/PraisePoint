-- Hosted rollback assertions; only synthetic identities and content.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('a3000000-0000-4000-8000-000000000001','s03-owner@example.invalid',now(),'{"provider":"google"}','{"full_name":"S03 Owner"}'),
('a3000000-0000-4000-8000-000000000002','s03-member@example.invalid',now(),'{"provider":"google"}','{"full_name":"S03 Member"}'),
('a3000000-0000-4000-8000-000000000003','s03-outsider@example.invalid',now(),'{"provider":"google"}','{"full_name":"S03 Outsider"}');
create temp table s03_state(key text primary key,value jsonb);
grant select,insert,update on s03_state to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
insert into s03_state values('personal',public.ensure_personal_workspace());
insert into s03_state values('church',to_jsonb(public.create_church_workspace('S03 Test Church')::text));
insert into s03_state select 'doc',jsonb_build_object('schemaVersion',1,'id','a3000000-0000-4000-8000-000000000010',
  'workspaceId',value#>>'{}','title','S03 test deck','width',1920,'height',1080,'slides',jsonb_build_array(jsonb_build_object(
    'id','a3000000-0000-4000-8000-000000000011','category','lyrics','background',jsonb_build_object('kind','solid','color','#12343D'),
    'elements',jsonb_build_array(jsonb_build_object('id','a3000000-0000-4000-8000-000000000012','kind','text','z',1,'text',E'主よ 🙏\r\n<script>literal</script>',
      'x',96,'y',300,'width',1728,'height',480,'fontFamily','Figtree','fontSize',72,'color','#FFFFFF','align','center'))))) from s03_state where key='church';
insert into s03_state select 'saved',public.create_slide_deck((select (value#>>'{}')::uuid from s03_state where key='church'),value) from s03_state where key='doc';
do $$ declare d jsonb:=(select value from s03_state where key='doc'); w uuid:=(d->>'workspaceId')::uuid; bad jsonb; v jsonb; begin
  assert (select value->>'revision'='1' from s03_state where key='saved'), 'initial revision incorrect';
  assert (select document#>>'{slides,0,elements,0,text}'=E'主よ 🙏\r\n<script>literal</script>' from public.decks where id=(d->>'id')::uuid), 'text changed';
  foreach bad in array array[jsonb_set(d,'{schemaVersion}','2'),jsonb_set(d,'{width}','1280'),jsonb_set(d,'{slides,0,elements,0,width}','-1'),
    jsonb_set(d,'{slides,0,elements,0,color}','"url(https://example.invalid)"'),jsonb_set(d,'{slides,0,elements,0,text}',to_jsonb(repeat('x',20001))),
    jsonb_set(d,'{slides,0,elements,0,fontFamily}','"Arial"'),jsonb_set(d,'{slides,0,elements,0,fontFamily}','null'),
    jsonb_set(d,'{slides,0,elements,0,color}','null'),jsonb_set(d,'{slides,0,elements,0,align}','null'),d||'{"extra":true}'::jsonb,
    jsonb_set(d,'{workspaceId}','"a3000000-0000-4000-8000-000000000099"'),
    jsonb_set(d,'{slides,0,elements,0,text}',to_jsonb(repeat('x',2097153))),
    jsonb_set(d,'{slides}',jsonb_build_array(d#>'{slides,0}',d#>'{slides,0}'))] loop
    begin perform public.save_slide_deck(bad,1); raise exception 'invalid document accepted'; exception when invalid_parameter_value then null; end;
  end loop;
  v:=public.save_slide_deck(jsonb_set(d,'{title}','"Changed title"'),1);
  assert v->>'revision'='2', 'save did not advance revision';
  begin perform public.save_slide_deck(d,1); raise exception 'stale save overwrote'; exception when serialization_failure then null; end;
  begin update public.decks set revision=999 where id=(d->>'id')::uuid; raise exception 'raw update permitted'; exception when insufficient_privilege then null; end;
  begin insert into public.decks(id,workspace_id,created_by,title,document) values(gen_random_uuid(),w,auth.uid(),'bypass',d); raise exception 'raw insert permitted'; exception when insufficient_privilege then null; end;
  begin delete from public.decks where id=(d->>'id')::uuid; raise exception 'raw delete permitted'; exception when insufficient_privilege then null; end;
  begin perform public.save_slide_deck(jsonb_set(d,'{slides,0,background}','{"kind":"image","mediaId":"a3000000-0000-4000-8000-000000000099"}'),2);
    raise exception 'foreign media accepted'; exception when feature_not_supported then null; end;
end $$;
reset role;
do $$ declare d jsonb:=(select value from s03_state where key='doc'); category text; copy jsonb; begin
  foreach category in array array['lyrics','scripture','sermon','announcement','welcome-closing'] loop
    perform set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
    copy:=public.create_slide_deck((d->>'workspaceId')::uuid,jsonb_set(jsonb_set(d,'{id}',to_jsonb(gen_random_uuid()::text)),'{slides,0,category}',to_jsonb(category)));
    assert copy#>>'{document,slides,0,category}'=category, 'category changed on save';
    perform public.delete_slide_deck((copy#>>'{document,id}')::uuid);
  end loop;
  begin perform private.adjust_document_usage((d->>'workspaceId')::uuid,26214400); raise exception 'workspace capacity bypassed' using errcode='22023'; exception when insufficient_resources then null; end;
  update private.document_usage set used_bytes=104857600 where id;
  begin perform public.duplicate_slide_deck((d->>'id')::uuid,(d->>'workspaceId')::uuid,null); raise exception 'global capacity bypassed' using errcode='22023'; exception when insufficient_resources then null; end;
  update private.document_usage set used_bytes=(select coalesce(sum(byte_size),0) from public.decks) where id;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
select public.ensure_personal_workspace();
reset role;
insert into public.workspace_members(workspace_id,user_id,role) select (value#>>'{}')::uuid,'a3000000-0000-4000-8000-000000000002','member' from s03_state where key='church';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
do $$ declare d jsonb:=(select value from s03_state where key='doc'); copy jsonb; begin
  assert (select count(*)=1 from public.decks), 'member cannot read church deck';
  perform public.save_slide_deck(d,2);
  begin perform public.delete_slide_deck((d->>'id')::uuid); raise exception 'member deleted another creator deck'; exception when insufficient_privilege then null; end;
  copy:=public.duplicate_slide_deck((d->>'id')::uuid,(d->>'workspaceId')::uuid,null);
  assert copy->'document'->>'id'<>d->>'id', 'copy reused deck identity';
  assert copy->>'revision'='1', 'copy revision not reset';
  perform public.delete_slide_deck((copy->'document'->>'id')::uuid);
end $$;
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000003","app_metadata":{"provider":"google"}}',true);
select public.ensure_personal_workspace();
do $$ declare d jsonb:=(select value from s03_state where key='doc'); begin
  assert (select count(*)=0 from public.decks), 'outsider read church content';
  begin perform public.save_slide_deck(d,3); raise exception 'outsider saved'; exception when insufficient_privilege then null; end;
  begin perform public.duplicate_slide_deck((d->>'id')::uuid,(d->>'workspaceId')::uuid,null); raise exception 'outsider copied'; exception when insufficient_privilege then null; end;
  begin perform public.delete_slide_deck((d->>'id')::uuid); raise exception 'outsider deleted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
select public.remove_workspace_member((select (value#>>'{}')::uuid from s03_state where key='church'),'a3000000-0000-4000-8000-000000000002');
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
do $$ begin
  assert (select count(*)=0 from public.decks), 'removed member still reads decks';
  begin perform public.save_slide_deck((select value from s03_state where key='doc'),3); raise exception 'removed member saved'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"a3000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
do $$ declare d jsonb:=(select value from s03_state where key='doc'); copy jsonb; begin
  copy:=public.duplicate_slide_deck((d->>'id')::uuid,((select value from s03_state where key='personal')->>'workspaceId')::uuid,d);
  assert copy->'document'->>'workspaceId'=(select value->>'workspaceId' from s03_state where key='personal'), 'copy destination mismatch';
  assert (select count(*)=2 from public.decks), 'explicit copy missing';
  perform public.delete_slide_deck((copy->'document'->>'id')::uuid);
  perform public.delete_slide_deck((d->>'id')::uuid);
end $$;
reset role;
do $$ begin
  assert (select used_bytes=(select coalesce(sum(byte_size),0) from public.decks) from private.document_usage where id), 'document capacity accounting drift';
end $$;
select 'S03 validation, text preservation, revisions, raw writes, roles and copies passed; rolled back' as result;
rollback;
