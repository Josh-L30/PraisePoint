-- Synthetic, transaction-scoped fixtures. No church content is retained.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('a5000000-0000-4000-8000-000000000001','s05-owner@example.invalid',now(),'{"provider":"google"}','{"full_name":"S05 Owner"}'),
('a5000000-0000-4000-8000-000000000002','s05-member@example.invalid',now(),'{"provider":"google"}','{"full_name":"S05 Member"}'),
('a5000000-0000-4000-8000-000000000003','s05-outsider@example.invalid',now(),'{"provider":"google"}','{"full_name":"S05 Outsider"}');
create temp table s05_state(key text primary key,value jsonb);
grant select,insert,update on s05_state to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a5000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
insert into s05_state values('personal',public.ensure_personal_workspace());
insert into s05_state values('church',to_jsonb(public.create_church_workspace('S05 Church')::text));
insert into s05_state select 'song',jsonb_build_object('id','a5000000-0000-4000-8000-000000000010','workspaceId',value#>>'{}',
  'title','S05 Song','lyrics',E'First line\nSecond line\n\nChorus\n\nChorus','author',null,'source','Original test words','usageNotes',null,'revision',0) from s05_state where key='church';
insert into s05_state select 'savedSong',public.save_song(value,0) from s05_state where key='song';
insert into s05_state select 'plan',jsonb_build_object('id','a5000000-0000-4000-8000-000000000020','workspaceId',value#>>'{}',
  'title','S05 Sunday','date','2026-11-01','revision',0,'items','[]'::jsonb) from s05_state where key='church';
insert into s05_state select 'savedPlan',public.save_service_plan(value,0) from s05_state where key='plan';
insert into s05_state values('copy',to_jsonb(public.add_song_to_service('a5000000-0000-4000-8000-000000000010','a5000000-0000-4000-8000-000000000020',1,1)::text));

do $$ declare song jsonb:=(select value from s05_state where key='savedSong'); plan jsonb; snap jsonb; d public.decks; bad jsonb; begin
  assert song->>'revision'='1', 'song revision';
  select * into d from public.decks where id=(select (value#>>'{}')::uuid from s05_state where key='copy');
  assert d.source_song_id=(song->>'id')::uuid, 'source provenance';
  assert jsonb_array_length(d.document->'slides')=3, 'stanzas or repeated chorus lost';
  assert d.document#>>'{slides,0,elements,0,text}'=E'First line\nSecond line', 'copy changed words';
  perform public.save_song(jsonb_set(song,'{lyrics}','"Master changed"'),1);
  assert (select document=d.document from public.decks where id=d.id), 'master edited service copy';
  begin perform public.save_song(song,1); raise exception 'stale song overwrite'; exception when serialization_failure then null; end;
  begin perform public.delete_song((song->>'id')::uuid); raise exception 'referenced song deleted'; exception when foreign_key_violation then
    assert sqlerrm like '%S05 Song%', 'missing dependency description'; end;
  begin perform public.delete_slide_deck(d.id); raise exception 'referenced deck deleted'; exception when foreign_key_violation then
    assert sqlerrm like '%S05 Sunday%', 'missing service dependency description'; end;
  select public.get_service_plan('a5000000-0000-4000-8000-000000000020') into plan;
  assert plan->>'revision'='2' and jsonb_array_length(plan->'items')=1, 'append not atomic';
  begin perform public.save_service_plan(plan,1); raise exception 'stale plan overwrite'; exception when serialization_failure then null; end;
  snap:=public.build_service_snapshot((plan->>'id')::uuid);
  assert snap=public.build_service_snapshot((plan->>'id')::uuid), 'snapshot not deterministic';
  assert jsonb_array_length(snap->'sections')=1 and jsonb_array_length(snap->'slides')=3, 'snapshot boundaries';
  assert snap#>>'{slides,0,elements,0,text}'=E'First line\nSecond line', 'snapshot used changed master';
  -- Reusing a deck twice keeps distinct occurrence IDs and deterministic boundaries.
  bad:=jsonb_set(plan,'{items}',(plan->'items')||jsonb_build_array(jsonb_build_object('id','a5000000-0000-4000-8000-000000000055','deckId',d.id,'label','Repeat song','position',1)));
  bad:=public.save_service_plan(bad,2);
  assert jsonb_array_length(public.build_service_snapshot((plan->>'id')::uuid)->'slides')=6, 'repeat deck lost';
  assert public.build_service_snapshot((plan->>'id')::uuid)#>>'{slides,0,id}'<>public.build_service_snapshot((plan->>'id')::uuid)#>>'{slides,3,id}', 'repeat slide identity collision';
  assert public.build_service_snapshot((plan->>'id')::uuid)#>>'{sections,1,startIndex}'='3', 'repeat section offset';
  plan:=public.save_service_plan(plan,3);
  begin perform public.save_service_plan(jsonb_set(plan,'{items,0,position}','1'),4); raise exception 'invalid position accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.save_service_plan(jsonb_set(plan,'{items,0,deckId}','"a5000000-0000-4000-8000-000000000099"'),4); raise exception 'missing deck accepted'; exception when insufficient_privilege then null; end;
  begin perform public.save_service_plan(jsonb_set(plan,'{date}','"2026-02-30"'),4); raise exception 'invalid date accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.add_song_to_service((song->>'id')::uuid,(plan->>'id')::uuid,1,4); raise exception 'unreviewed master accepted'; exception when serialization_failure then null; end;
  begin perform public.save_service_plan(jsonb_set(plan,'{items}',(plan->'items')||(plan->'items')),4); raise exception 'duplicate item accepted'; exception when invalid_parameter_value then null; end;
  snap:=public.build_service_snapshot((plan->>'id')::uuid);
  perform public.save_slide_deck(jsonb_set(d.document,'{slides,0,elements,0,text}','"Service only"'),1);
  assert public.build_service_snapshot((plan->>'id')::uuid)->>'sourceRevision'<>snap->>'sourceRevision', 'deck edit did not invalidate digest';
  assert (select lyrics='Master changed' from public.songs where id=(song->>'id')::uuid), 'service edited master';
  foreach bad in array array[jsonb_set(song,'{lyrics}','""'),jsonb_set(song,'{lyrics}','null'),song||'{"extra":true}',jsonb_set(song,'{title}',to_jsonb(repeat('x',121)))] loop
    begin perform public.save_song(bad,2); raise exception 'invalid song accepted'; exception when invalid_parameter_value then null; end;
  end loop;
  begin update public.songs set lyrics='bypass'; raise exception 'raw song update'; exception when insufficient_privilege then null; end;
  begin delete from public.service_items; raise exception 'raw item delete'; exception when insufficient_privilege then null; end;
end $$;
do $$ declare plan jsonb:=public.get_service_plan('a5000000-0000-4000-8000-000000000020'); d jsonb; foreign_ws uuid:=(select (value->>'workspaceId')::uuid from s05_state where key='personal'); begin
  select document into d from public.decks where id=(select (value#>>'{}')::uuid from s05_state where key='copy');
  d:=jsonb_set(jsonb_set(d,'{id}',to_jsonb('a5000000-0000-4000-8000-000000000090'::text)),'{workspaceId}',to_jsonb(foreign_ws::text));
  perform public.create_slide_deck(foreign_ws,d);
  begin perform public.save_service_plan(jsonb_set(plan,'{items,0,deckId}',to_jsonb(d->>'id')),4); raise exception 'known foreign deck accepted'; exception when insufficient_privilege then null; end;
  begin perform public.save_song(jsonb_set((select value from s05_state where key='savedSong'),'{workspaceId}',to_jsonb(foreign_ws::text)),2); raise exception 'song moved across workspaces'; exception when insufficient_privilege then null; end;
  perform public.delete_slide_deck((d->>'id')::uuid);
end $$;
reset role;
do $$ declare used_before bigint:=(select used_bytes from private.document_usage where id); song jsonb:=(select value from s05_state where key='song'); plan jsonb:=(select value from s05_state where key='plan'); begin
  update private.document_usage set used_bytes=104857600 where id;
  begin perform public.save_song(jsonb_set(song,'{id}',to_jsonb(gen_random_uuid()::text)),0); raise exception 'song capacity bypass'; exception when insufficient_resources then null; end;
  begin perform public.save_service_plan(jsonb_set(plan,'{id}',to_jsonb(gen_random_uuid()::text)),0); raise exception 'service capacity bypass'; exception when insufficient_resources then null; end;
  update private.document_usage set used_bytes=used_before where id;
end $$;
select set_config('request.jwt.claims','{"sub":"a5000000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
select public.ensure_personal_workspace();
insert into public.workspace_members(workspace_id,user_id,role) select (value#>>'{}')::uuid,'a5000000-0000-4000-8000-000000000002','member' from s05_state where key='church';
set local role authenticated;
do $$ declare s jsonb:=(select value from s05_state where key='savedSong'); p jsonb; begin
  perform public.save_song(s,2);
  p:=public.get_service_plan('a5000000-0000-4000-8000-000000000020');
  perform public.save_service_plan(p,4);
  begin perform public.delete_song((s->>'id')::uuid); raise exception 'member deleted song'; exception when insufficient_privilege then null; end;
  begin perform public.delete_service_plan((p->>'id')::uuid); raise exception 'member deleted service'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"a5000000-0000-4000-8000-000000000003","app_metadata":{"provider":"google"}}',true);
do $$ begin
  assert (select count(*)=0 from public.songs), 'outsider read songs';
  begin perform public.build_service_snapshot('a5000000-0000-4000-8000-000000000020'); raise exception 'outsider snapshot'; exception when insufficient_privilege then null; end;
  begin perform public.save_song((select value from s05_state where key='savedSong'),3); raise exception 'outsider write'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"a5000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
do $$ declare p jsonb:=public.get_service_plan('a5000000-0000-4000-8000-000000000020'); d uuid:=(select (value#>>'{}')::uuid from s05_state where key='copy'); begin
  perform public.delete_service_plan((p->>'id')::uuid);
  assert exists(select 1 from public.decks where id=d), 'service delete cascaded to deck';
  perform public.delete_slide_deck(d);
  perform public.delete_song('a5000000-0000-4000-8000-000000000010');
end $$;
rollback;
