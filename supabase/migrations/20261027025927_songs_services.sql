-- Revisioned song masters and service-specific deck copies. All writes use
-- the existing global budget -> workspace -> record lock order.
create table public.songs (
 id uuid primary key, workspace_id uuid not null references public.workspaces(id) on delete restrict,
 created_by uuid not null references public.profiles(id) on delete restrict,
 title text not null check(char_length(title) between 1 and 120),
 lyrics text not null check(char_length(lyrics) between 1 and 200000),
 author text check(char_length(author)<=500), source text check(char_length(source)<=2000), usage_notes text check(char_length(usage_notes)<=2000),
 revision integer not null default 1 check(revision>0), byte_size integer not null check(byte_size between 1 and 2097152),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,id)
);
create index songs_workspace_title on public.songs(workspace_id,title,id);
create index songs_creator on public.songs(created_by);
create table public.service_plans (
 id uuid primary key, workspace_id uuid not null references public.workspaces(id) on delete restrict,
 created_by uuid not null references public.profiles(id) on delete restrict,
 title text not null check(char_length(title) between 1 and 120), service_date date,
 revision integer not null default 1 check(revision>0), byte_size integer not null check(byte_size between 1 and 2097152),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,id)
);
create index services_workspace_updated on public.service_plans(workspace_id,updated_at desc,id);
create index services_creator on public.service_plans(created_by);
create table public.service_items (
 id uuid primary key, workspace_id uuid not null, service_id uuid not null, deck_id uuid not null,
 label text not null check(char_length(label) between 1 and 120), position integer not null check(position between 0 and 99),
 foreign key(workspace_id,service_id) references public.service_plans(workspace_id,id) on delete restrict,
 foreign key(workspace_id,deck_id) references public.decks(workspace_id,id) on delete restrict,
 unique(service_id,position) deferrable initially deferred
);
create index service_items_service_workspace on public.service_items(workspace_id,service_id);
create index service_items_deck_workspace on public.service_items(workspace_id,deck_id);
alter table public.decks add column source_song_id uuid,
 add constraint decks_source_song foreign key(workspace_id,source_song_id) references public.songs(workspace_id,id) on delete restrict;
create index decks_source_song on public.decks(workspace_id,source_song_id) where source_song_id is not null;
alter table public.songs enable row level security;
alter table public.service_plans enable row level security;
alter table public.service_items enable row level security;
create policy songs_member_read on public.songs for select to authenticated using(private.is_workspace_member(workspace_id));
create policy services_member_read on public.service_plans for select to authenticated using(private.is_workspace_member(workspace_id));
create policy service_items_member_read on public.service_items for select to authenticated using(private.is_workspace_member(workspace_id));
revoke all on public.songs,public.service_plans,public.service_items from public,anon,authenticated;
grant select on public.songs,public.service_plans,public.service_items to authenticated;

create or replace function private.adjust_document_usage(p_workspace_id uuid,p_delta integer) returns void language plpgsql security invoker set search_path='' as $$
begin
 if (select used_bytes+p_delta>104857600 from private.document_usage where id) or
    (select coalesce(sum(byte_size),0)+p_delta>26214400 from (
      select byte_size from public.decks where workspace_id=p_workspace_id union all
      select byte_size from public.songs where workspace_id=p_workspace_id union all
      select byte_size from public.service_plans where workspace_id=p_workspace_id) records) then
   raise exception 'The free application document capacity has been reached.' using errcode='53000';
 end if;
 update private.document_usage set used_bytes=used_bytes+p_delta where id;
end $$;
create function private.song_json(s public.songs) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',s.id,'workspaceId',s.workspace_id,'title',s.title,'lyrics',s.lyrics,'author',s.author,'source',s.source,'usageNotes',s.usage_notes,'revision',s.revision);
$$;
create function private.service_json(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.id,'workspaceId',p.workspace_id,'title',p.title,'date',p.service_date,'revision',p.revision,
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'deckId',i.deck_id,'label',i.label,'position',i.position) order by i.position,i.id) from public.service_items i where i.service_id=p.id),'[]'::jsonb))
 from public.service_plans p where p.id=p_id;
$$;
create function private.lyric_chunks(p_text text) returns text[] language plpgsql immutable security invoker set search_path='' as $$
declare line text; lines text[]:='{}'; chunks text[]:='{}';
begin
 foreach line in array string_to_array(replace(replace(p_text,E'\r\n',E'\n'),E'\r',E'\n'),E'\n') loop
  if btrim(line,E' \t')='' then
   if cardinality(lines)>0 then chunks:=array_append(chunks,array_to_string(lines,E'\n')); lines:='{}'; end if;
  else
   lines:=array_append(lines,line);
   if cardinality(lines)=4 then chunks:=array_append(chunks,array_to_string(lines,E'\n')); lines:='{}'; end if;
  end if;
 end loop;
 if cardinality(lines)>0 then chunks:=array_append(chunks,array_to_string(lines,E'\n')); end if;
 if cardinality(chunks)<1 or cardinality(chunks)>200 then raise exception 'Lyrics need between 1 and 200 slides.' using errcode='22023'; end if;
 foreach line in array chunks loop
  if char_length(line)>20000 then raise exception 'A lyric slide exceeds the text limit.' using errcode='22023'; end if;
 end loop;
 return chunks;
end $$;
create function private.save_song(p_song jsonb,p_expected_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); sid uuid; w uuid; s public.songs; size integer; field text; chunks text[];
begin
 perform private.document_keys(p_song,array['id','workspaceId','title','lyrics','author','source','usageNotes','revision'],array['id','workspaceId','title','lyrics','author','source','usageNotes','revision']);
 sid:=private.document_uuid(p_song->>'id'); w:=private.document_uuid(p_song->>'workspaceId');
 if p_expected_revision is null or p_expected_revision<0 or jsonb_typeof(p_song->'revision') is distinct from 'number' or (p_song->>'revision')::numeric<>trunc((p_song->>'revision')::numeric) or
  jsonb_typeof(p_song->'title') is distinct from 'string' or char_length(btrim(p_song->>'title')) not between 1 and 120 or
  jsonb_typeof(p_song->'lyrics') is distinct from 'string' or char_length(p_song->>'lyrics') not between 1 and 200000 then
  raise exception 'Invalid song.' using errcode='22023'; end if;
 foreach field in array array['author','source','usageNotes'] loop
  if jsonb_typeof(p_song->field) not in ('string','null') or char_length(p_song->>field)>(case when field='author' then 500 else 2000 end) then
   raise exception 'Invalid song attribution.' using errcode='22023'; end if;
 end loop;
 chunks:=private.lyric_chunks(p_song->>'lyrics');
 p_song:=jsonb_set(p_song,'{title}',to_jsonb(btrim(p_song->>'title')));
 p_song:=jsonb_set(p_song,'{lyrics}',to_jsonb(array_to_string(chunks,E'\n\n')));
 size:=octet_length(p_song::text); if size>2097152 then raise exception 'Song too large.' using errcode='22023'; end if;
 perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
 select * into s from public.songs where id=sid for update;
 if found then
  if s.workspace_id<>w then raise exception 'Song unavailable.' using errcode='42501'; end if;
  if s.revision<>p_expected_revision then raise exception 'A newer song revision exists.' using errcode='40001'; end if;
 else
  if p_expected_revision<>0 then raise exception 'Song unavailable.' using errcode='42501'; end if;
 end if;
 perform private.consume_operation(actor,'content'); perform private.adjust_document_usage(w,size-coalesce(s.byte_size,0));
 insert into public.songs(id,workspace_id,created_by,title,lyrics,author,source,usage_notes,byte_size)
 values(sid,w,actor,p_song->>'title',p_song->>'lyrics',p_song->>'author',p_song->>'source',p_song->>'usageNotes',size)
 on conflict(id) do update set title=excluded.title,lyrics=excluded.lyrics,author=excluded.author,source=excluded.source,usage_notes=excluded.usage_notes,
  byte_size=excluded.byte_size,revision=public.songs.revision+1,updated_at=now() returning * into s;
 return private.song_json(s);
end $$;
create function private.save_service_plan(p_plan jsonb,p_expected_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); sid uuid; w uuid; p public.service_plans; item jsonb; idx integer:=0; size integer; day date; ids uuid[]:='{}'; item_id uuid; deck_id uuid;
begin
 perform private.document_keys(p_plan,array['id','workspaceId','title','date','revision','items'],array['id','workspaceId','title','date','revision','items']);
 sid:=private.document_uuid(p_plan->>'id'); w:=private.document_uuid(p_plan->>'workspaceId');
 if p_expected_revision is null or p_expected_revision<0 or jsonb_typeof(p_plan->'revision') is distinct from 'number' or
  jsonb_typeof(p_plan->'title') is distinct from 'string' or char_length(btrim(p_plan->>'title')) not between 1 and 120 or
  jsonb_typeof(p_plan->'items') is distinct from 'array' then raise exception 'Invalid service.' using errcode='22023'; end if;
 if jsonb_array_length(p_plan->'items')>100 then raise exception 'Services support at most 100 items.' using errcode='22023'; end if;
 if jsonb_typeof(p_plan->'date')='null' then day:=null;
 elsif jsonb_typeof(p_plan->'date')='string' and p_plan->>'date' ~ '^\d{4}-\d{2}-\d{2}$' then
  begin day:=(p_plan->>'date')::date; exception when datetime_field_overflow or invalid_datetime_format then raise exception 'Invalid service date.' using errcode='22023'; end;
 else raise exception 'Invalid service date.' using errcode='22023'; end if;
 perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
 select * into p from public.service_plans where id=sid for update;
 if found then
  if p.workspace_id<>w then raise exception 'Service unavailable.' using errcode='42501'; end if;
  if p.revision<>p_expected_revision then raise exception 'A newer service revision exists.' using errcode='40001'; end if;
 elsif p_expected_revision<>0 then raise exception 'Service unavailable.' using errcode='42501'; end if;
 for item in select value from jsonb_array_elements(p_plan->'items') loop
  perform private.document_keys(item,array['id','deckId','label','position'],array['id','deckId','label','position']);
  item_id:=private.document_uuid(item->>'id'); deck_id:=private.document_uuid(item->>'deckId');
  if item_id=any(ids) or jsonb_typeof(item->'label') is distinct from 'string' or char_length(btrim(item->>'label')) not between 1 and 120 or
   jsonb_typeof(item->'position') is distinct from 'number' or (item->>'position')::numeric<>idx then raise exception 'Invalid service ordering.' using errcode='22023'; end if;
  if not exists(select 1 from public.decks where id=deck_id and workspace_id=w) then raise exception 'Presentation unavailable in this workspace.' using errcode='42501'; end if;
  if exists(select 1 from public.service_items where id=item_id and service_id<>sid) then raise exception 'Service item identity already used.' using errcode='22023'; end if;
  ids:=array_append(ids,item_id); idx:=idx+1;
 end loop;
 p_plan:=jsonb_set(p_plan,'{title}',to_jsonb(btrim(p_plan->>'title'))); size:=octet_length(p_plan::text);
 if size>2097152 then raise exception 'Service too large.' using errcode='22023'; end if;
 perform private.consume_operation(actor,'content'); perform private.adjust_document_usage(w,size-coalesce(p.byte_size,0));
 insert into public.service_plans(id,workspace_id,created_by,title,service_date,byte_size) values(sid,w,actor,p_plan->>'title',day,size)
 on conflict(id) do update set title=excluded.title,service_date=excluded.service_date,byte_size=excluded.byte_size,revision=public.service_plans.revision+1,updated_at=now();
 delete from public.service_items where service_id=sid;
 insert into public.service_items(id,workspace_id,service_id,deck_id,label,position)
 select (value->>'id')::uuid,w,sid,(value->>'deckId')::uuid,btrim(value->>'label'),(value->>'position')::integer from jsonb_array_elements(p_plan->'items');
 return private.service_json(sid);
end $$;
create function private.get_service_plan(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); w uuid;
begin
 select workspace_id into w from public.service_plans where id=p_id;
 if not found or not private.is_workspace_member(w) then raise exception 'Service unavailable.' using errcode='42501'; end if;
 return private.service_json(p_id);
end $$;
create function private.add_song_to_service(p_song_id uuid,p_service_id uuid,p_expected_song_revision integer default null,p_expected_service_revision integer default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); s public.songs; p public.service_plans; w uuid; document jsonb; slides jsonb:='[]'; chunk text; new_id uuid:=gen_random_uuid(); plan jsonb;
begin
 select workspace_id into w from public.service_plans where id=p_service_id;
 if not found then raise exception 'Service unavailable.' using errcode='42501'; end if;
 perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
 select * into p from public.service_plans where id=p_service_id for update;
 select * into s from public.songs where id=p_song_id and workspace_id=w for update;
 if s.id is null or p.id is null then raise exception 'Song or service unavailable.' using errcode='42501'; end if;
 if (p_expected_song_revision is not null and p_expected_song_revision<>s.revision) or (p_expected_service_revision is not null and p_expected_service_revision<>p.revision) then
  raise exception 'Song or service changed. Review the latest words first.' using errcode='40001'; end if;
 foreach chunk in array private.lyric_chunks(s.lyrics) loop
  slides:=slides||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'category','lyrics','background',jsonb_build_object('kind','solid','color','#12343D'),
   'elements',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'kind','text','label','Lyrics','z',1,'x',96,'y',300,'width',1728,'height',480,
    'text',chunk,'fontFamily','Figtree','fontSize',72,'color','#FFFFFF','align','center'))));
 end loop;
 document:=jsonb_build_object('schemaVersion',1,'id',new_id,'workspaceId',w,'title',s.title,'width',1920,'height',1080,'slides',slides);
 perform private.create_slide_deck(w,document);
 update public.decks set source_song_id=s.id where id=new_id;
 plan:=private.service_json(p.id);
 plan:=jsonb_set(plan,'{items}',(plan->'items')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'deckId',new_id,'label',s.title,'position',jsonb_array_length(plan->'items'))));
 perform private.save_service_plan(plan,p.revision);
 return new_id;
end $$;
create function private.delete_song(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); s public.songs; w uuid; deps text;
begin
 select workspace_id into w from public.songs where id=p_id;
 perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
 if not private.is_workspace_owner(w) then raise exception 'Only the workspace owner can delete song masters.' using errcode='42501'; end if;
 select * into s from public.songs where id=p_id for update;
 if not found then raise exception 'Song unavailable.' using errcode='42501'; end if;
 select string_agg(title,', ' order by id) into deps from (select id,title from public.decks where workspace_id=w and source_song_id=p_id order by id limit 10) d;
 if deps is not null then raise exception 'Song "%" is referenced by presentations: %. Remove those references first.',s.title,deps using errcode='23503'; end if;
 perform private.consume_operation(actor,'content'); perform private.adjust_document_usage(w,-s.byte_size); delete from public.songs where id=p_id;
end $$;
create function private.delete_service_plan(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); p public.service_plans; w uuid;
begin
 select workspace_id into w from public.service_plans where id=p_id;
 perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
 if not private.is_workspace_owner(w) then raise exception 'Only the workspace owner can delete services.' using errcode='42501'; end if;
 select * into p from public.service_plans where id=p_id for update;
 if not found then raise exception 'Service unavailable.' using errcode='42501'; end if;
 perform private.consume_operation(actor,'content'); perform private.adjust_document_usage(w,-p.byte_size);
 delete from public.service_items where service_id=p_id; delete from public.service_plans where id=p_id;
end $$;
create or replace function private.delete_slide_deck(p_deck_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); d public.decks; w uuid; deps text;
begin
 select workspace_id into w from public.decks where id=p_deck_id;
 perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
 select * into d from public.decks where id=p_deck_id for update;
 if not found or (d.created_by<>actor and not private.is_workspace_owner(w)) then raise exception 'Only the creator or workspace owner can delete this presentation.' using errcode='42501'; end if;
 select string_agg(title,', ' order by id) into deps from (select distinct p.id,p.title from public.service_items i join public.service_plans p on p.id=i.service_id where i.deck_id=p_deck_id and i.workspace_id=w order by p.id limit 10) uses;
 if deps is not null then raise exception 'Presentation is used by services: %. Remove it from these services first.',deps using errcode='23503'; end if;
 perform private.consume_operation(actor,'content'); perform private.adjust_document_usage(w,-d.byte_size); delete from public.decks where id=p_deck_id;
end $$;
create function private.snapshot_id(p_item uuid,p_source uuid) returns uuid language sql immutable security invoker set search_path='' as $$
 select overlay(overlay(md5(p_item::text||':'||p_source::text) placing '8' from 13 for 1) placing '8' from 17 for 1)::uuid;
$$;
create function private.build_service_snapshot(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); w uuid; p public.service_plans; r record; slide jsonb; el jsonb; elements jsonb; slides jsonb:='[]'; sections jsonb:='[]'; revisions jsonb; snapshot jsonb;
begin
 select workspace_id into w from public.service_plans where id=p_id;
 if not found then raise exception 'Service unavailable.' using errcode='42501'; end if;
 -- Same order as all document writers gives a coherent cross-deck snapshot.
 perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
 select * into p from public.service_plans where id=p_id;
 if not found then raise exception 'Service unavailable.' using errcode='42501'; end if;
 revisions:=jsonb_build_array(p.id,p.revision);
 for r in select i.id,i.label,i.position,d.id as deck_id,d.document,d.revision,d.source_song_id from public.service_items i
   join public.decks d on d.workspace_id=i.workspace_id and d.id=i.deck_id where i.service_id=p_id order by i.position,i.id loop
  sections:=sections||jsonb_build_array(jsonb_build_object('id',r.id,'deckId',r.deck_id,'label',r.label,'sourceSongId',r.source_song_id,'startIndex',jsonb_array_length(slides),'slideCount',jsonb_array_length(r.document->'slides')));
  revisions:=revisions||jsonb_build_array(jsonb_build_object('item',r.id,'deck',r.deck_id,'revision',r.revision));
  for slide in select value from jsonb_array_elements(r.document->'slides') loop
   elements:='[]';
   for el in select value from jsonb_array_elements(slide->'elements') loop
    elements:=elements||jsonb_build_array(jsonb_set(el,'{id}',to_jsonb(private.snapshot_id(r.id,(el->>'id')::uuid))));
   end loop;
   slide:=jsonb_set(jsonb_set(slide,'{id}',to_jsonb(private.snapshot_id(r.id,(slide->>'id')::uuid))),'{elements}',elements);
   slides:=slides||jsonb_build_array(slide);
   if jsonb_array_length(slides)>2000 then raise exception 'Service exceeds 2000 slides. Split this service.' using errcode='22023'; end if;
  end loop;
 end loop;
 if jsonb_array_length(slides)=0 then raise exception 'Add a presentation before preparing this service.' using errcode='22023'; end if;
 snapshot:=jsonb_build_object('schemaVersion',1,'serviceId',p.id,'workspaceId',w,'sourceRevision',encode(extensions.digest(revisions::text,'sha256'),'hex'),
 'title',p.title,'slides',slides,'media','[]'::jsonb,'sections',sections);
 if octet_length(snapshot::text)>16777216 then raise exception 'Service exceeds 16 MiB. Split this service.' using errcode='22023'; end if;
 return snapshot;
end $$;

create function public.save_song(p_song jsonb,p_expected_revision integer) returns jsonb language sql security invoker set search_path='' as $$ select private.save_song(p_song,p_expected_revision); $$;
create function public.save_service_plan(p_plan jsonb,p_expected_revision integer) returns jsonb language sql security invoker set search_path='' as $$ select private.save_service_plan(p_plan,p_expected_revision); $$;
create function public.get_service_plan(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.get_service_plan(p_id); $$;
create function public.add_song_to_service(p_song_id uuid,p_service_id uuid,p_expected_song_revision integer default null,p_expected_service_revision integer default null) returns uuid language sql security invoker set search_path='' as $$ select private.add_song_to_service(p_song_id,p_service_id,p_expected_song_revision,p_expected_service_revision); $$;
create function public.delete_song(p_id uuid) returns void language sql security invoker set search_path='' as $$ select private.delete_song(p_id); $$;
create function public.delete_service_plan(p_id uuid) returns void language sql security invoker set search_path='' as $$ select private.delete_service_plan(p_id); $$;
create function public.build_service_snapshot(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.build_service_snapshot(p_id); $$;
revoke all on function private.song_json(public.songs),private.service_json(uuid),private.lyric_chunks(text),private.snapshot_id(uuid,uuid) from public,anon,authenticated;
revoke all on function private.save_song(jsonb,integer),private.save_service_plan(jsonb,integer),private.get_service_plan(uuid),private.add_song_to_service(uuid,uuid,integer,integer),private.delete_song(uuid),private.delete_service_plan(uuid),private.build_service_snapshot(uuid) from public,anon;
grant execute on function private.save_song(jsonb,integer),private.save_service_plan(jsonb,integer),private.get_service_plan(uuid),private.add_song_to_service(uuid,uuid,integer,integer),private.delete_song(uuid),private.delete_service_plan(uuid),private.build_service_snapshot(uuid) to authenticated;
revoke all on function public.save_song(jsonb,integer),public.save_service_plan(jsonb,integer),public.get_service_plan(uuid),public.add_song_to_service(uuid,uuid,integer,integer),public.delete_song(uuid),public.delete_service_plan(uuid),public.build_service_snapshot(uuid) from public,anon;
grant execute on function public.save_song(jsonb,integer),public.save_service_plan(jsonb,integer),public.get_service_plan(uuid),public.add_song_to_service(uuid,uuid,integer,integer),public.delete_song(uuid),public.delete_service_plan(uuid),public.build_service_snapshot(uuid) to authenticated;
