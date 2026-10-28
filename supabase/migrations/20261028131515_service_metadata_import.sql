-- Imported metadata has no decoded geometry. Keep an explicit local placeholder;
-- native file verification remains mandatory on each laptop.
alter table public.media_assets add column awaiting_relink boolean not null default false;
alter table public.media_assets drop constraint media_assets_check2, drop constraint media_assets_check3;
alter table public.media_assets add constraint media_geometry_ready check (
 (awaiting_relink and location='local' and width is null and height is null and duration is null) or
 (not awaiting_relink and (state in('uploading','aborting') or (width is not null and height is not null and width>0 and height>0 and width::bigint*height<=case when kind='image' then 4194304 else 8388608 end)) and
 ((kind='image' and duration is null) or (kind='video' and duration is not null and duration>0 and duration<=86400)))
);
create function private.import_service_metadata(p_bundle jsonb,p_destination_workspace_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();s jsonb;part jsonb;a jsonb;item jsonb;el jsonb;doc jsonb;slides jsonb;items jsonb:='[]';
 source_workspace uuid;source_id uuid;identity uuid;sid uuid:=gen_random_uuid();did uuid;mid uuid;mapping jsonb:='{}';seen jsonb:='{}';parts jsonb:='{}';used jsonb:='{}';missing jsonb:='[]';
 start_at integer:=0;amount integer;idx integer:=0;i integer;j integer;size integer;target jsonb;source_key text;ref record;
begin
 if p_bundle is null or octet_length(p_bundle::text)>16777216 then raise exception 'Metadata file too large.' using errcode='22023';end if;
 perform private.document_keys(p_bundle,array['format','version','snapshot'],array['format','version','snapshot']);
 if p_bundle->'format' is distinct from '"church-service"'::jsonb or p_bundle->'version' is distinct from '1'::jsonb then raise exception 'Unsupported transfer format.' using errcode='22023';end if;
 s:=p_bundle->'snapshot';perform private.document_keys(s,array['schemaVersion','serviceId','workspaceId','sourceRevision','title','slides','media','sections'],array['schemaVersion','serviceId','workspaceId','sourceRevision','title','slides','media','sections']);
 source_workspace:=private.document_uuid(s->>'workspaceId');perform private.document_uuid(s->>'serviceId');
 if s->'schemaVersion' is distinct from '1'::jsonb or jsonb_typeof(s->'title') is distinct from 'string' or char_length(btrim(s->>'title')) not between 1 and 120 or
 jsonb_typeof(s->'sourceRevision') is distinct from 'string' or s->>'sourceRevision' !~ '^[0-9a-f]{64}$' or jsonb_typeof(s->'slides') is distinct from 'array' or jsonb_typeof(s->'media') is distinct from 'array' or jsonb_typeof(s->'sections') is distinct from 'array' then raise exception 'Invalid transfer snapshot.' using errcode='22023';end if;
 if jsonb_array_length(s->'slides') not between 1 and 2000 or jsonb_array_length(s->'sections') not between 1 and 100 or jsonb_array_length(s->'media')>202000 then raise exception 'Transfer limits exceeded.' using errcode='22023';end if;
 -- Global document budget -> destination workspace. Source IDs are never queried.
 perform 1 from private.document_usage where id for update;perform private.lock_actor_workspace(p_destination_workspace_id,actor);perform private.consume_operation(actor,'content');
 if exists(select 1 from jsonb_array_elements(s->'media') v group by v->>'sha256' having count(distinct jsonb_build_array(v->'kind',v->'mime',v->'bytes'))>1) then raise exception 'Inconsistent media hash.' using errcode='22023';end if;
 for a in select value from jsonb_array_elements(s->'media') loop
  if a->>'location' not in('local','cloud') then raise exception 'Invalid media location.' using errcode='22023';end if;
  a:=private.validate_media_descriptor(a,a->>'location');source_id:=private.document_uuid(a->>'id');
  if (a->>'workspaceId')::uuid<>source_workspace or mapping?source_id::text then raise exception 'Duplicate or foreign media descriptor.' using errcode='22023';end if;
  mid:=gen_random_uuid();mapping:=mapping||jsonb_build_object(source_id::text,mid::text);missing:=missing||jsonb_build_array(mid::text);
  a:=jsonb_set(jsonb_set(jsonb_set(a,'{id}',to_jsonb(mid::text)),'{workspaceId}',to_jsonb(p_destination_workspace_id::text)),'{location}','"local"');
  size:=octet_length(a::text);perform private.adjust_document_usage(p_destination_workspace_id,size);
  insert into public.media_assets(id,workspace_id,created_by,kind,location,mime,bytes,sha256,original_name,state,metadata_bytes,awaiting_relink)
  values(mid,p_destination_workspace_id,actor,a->>'kind','local',a->>'mime',(a->>'bytes')::bigint,a->>'sha256',a->>'originalName','active',size,true);
 end loop;
 for part in select value from jsonb_array_elements(s->'sections') loop
  perform private.document_keys(part,array['id','deckId','label','startIndex','slideCount','sourceSongId'],array['id','deckId','label','startIndex','slideCount','sourceSongId']);
  identity:=private.document_uuid(part->>'id');source_id:=private.document_uuid(part->>'deckId');
  if parts?identity::text or jsonb_typeof(part->'label') is distinct from 'string' or char_length(btrim(part->>'label')) not between 1 and 120 or
  private.document_number(part,'startIndex',0,1999)<>start_at then raise exception 'Invalid transfer section.' using errcode='22023';end if;
  parts:=parts||jsonb_build_object(identity::text,true);amount:=private.document_number(part,'slideCount',1,200);
  if (part->>'slideCount')::numeric<>amount or start_at+amount>jsonb_array_length(s->'slides') then raise exception 'Invalid section bounds.' using errcode='22023';end if;
  if jsonb_typeof(part->'sourceSongId')='string' then perform private.document_uuid(part->>'sourceSongId');elsif jsonb_typeof(part->'sourceSongId') is distinct from 'null' then raise exception 'Invalid source song.' using errcode='22023';end if;
  did:=gen_random_uuid();slides:='[]';
  for i in start_at..start_at+amount-1 loop
   item:=s->'slides'->i;identity:=private.document_uuid(item->>'id');
   if seen?identity::text or identity=source_id then raise exception 'Duplicate slide identity.' using errcode='22023';end if;seen:=seen||jsonb_build_object(identity::text,true);
   item:=jsonb_set(item,'{id}',to_jsonb(gen_random_uuid()::text));
   if item#>>'{background,kind}' in('image','video') then
    source_key:=private.document_uuid(item#>>'{background,mediaId}')::text;target:=mapping->source_key;if target is null then raise exception 'Missing media descriptor.' using errcode='22023';end if;
    used:=used||jsonb_build_object(source_key,true);item:=jsonb_set(item,'{background,mediaId}',target);
   end if;
   if item?'standaloneVideoId' then
    source_key:=private.document_uuid(item->>'standaloneVideoId')::text;target:=mapping->source_key;if target is null then raise exception 'Missing video descriptor.' using errcode='22023';end if;
    used:=used||jsonb_build_object(source_key,true);item:=jsonb_set(item,'{standaloneVideoId}',target);
   end if;
   if jsonb_typeof(item->'elements') is distinct from 'array' then raise exception 'Invalid slide elements.' using errcode='22023';end if;
   for j in 0..jsonb_array_length(item->'elements')-1 loop
    el:=item->'elements'->j;identity:=private.document_uuid(el->>'id');
    if seen?identity::text or identity=source_id then raise exception 'Duplicate element identity.' using errcode='22023';end if;seen:=seen||jsonb_build_object(identity::text,true);el:=jsonb_set(el,'{id}',to_jsonb(gen_random_uuid()::text));
    if el->>'kind'='image' then
     source_key:=private.document_uuid(el->>'mediaId')::text;target:=mapping->source_key;if target is null then raise exception 'Missing image descriptor.' using errcode='22023';end if;
     used:=used||jsonb_build_object(source_key,true);el:=jsonb_set(el,'{mediaId}',target);
    end if;
    item:=jsonb_set(item,array['elements',j::text],el);
   end loop;
   slides:=slides||jsonb_build_array(item);
  end loop;
  doc:=private.validate_slide_document(jsonb_build_object('schemaVersion',1,'id',did::text,'workspaceId',p_destination_workspace_id::text,'title',part->>'label','width',1920,'height',1080,'slides',slides),p_destination_workspace_id,did);
  size:=octet_length(doc::text);perform private.adjust_document_usage(p_destination_workspace_id,size);
  insert into public.decks(id,workspace_id,created_by,title,document,byte_size) values(did,p_destination_workspace_id,actor,doc->>'title',doc,size);
  items:=items||jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'deckId',did::text,'label',part->>'label','position',idx));idx:=idx+1;start_at:=start_at+amount;
 end loop;
 if start_at<>jsonb_array_length(s->'slides') or (select count(*) from jsonb_object_keys(used))<>jsonb_array_length(s->'media') then raise exception 'Incomplete snapshot or unexpected media.' using errcode='22023';end if;
 perform private.save_service_plan(jsonb_build_object('id',sid::text,'workspaceId',p_destination_workspace_id::text,'title',s->>'title','date',null,'revision',0,'items',items),0);
 return jsonb_build_object('serviceId',sid::text,'missingMediaIds',missing);
end $$;
create function private.confirm_local_media_geometry(p_media_id uuid,p_width integer,p_height integer,p_duration double precision default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();a public.media_assets;w uuid;
begin
 select workspace_id into w from public.media_assets where id=p_media_id;
 perform 1 from private.document_usage where id for update;perform private.lock_actor_workspace(w,actor);
 select * into a from public.media_assets where id=p_media_id and location='local' and state='active' for update;
 if not found then raise exception 'Local media unavailable.' using errcode='42501';end if;
 perform private.validate_media_geometry(a.kind,p_width,p_height,p_duration);
 if not a.awaiting_relink and (a.width<>p_width or a.height<>p_height or a.duration is distinct from p_duration) then raise exception 'The decoded original differs.' using errcode='22023';end if;
 if a.awaiting_relink then perform private.consume_operation(actor,'content');update public.media_assets set width=p_width,height=p_height,duration=p_duration,awaiting_relink=false where id=p_media_id returning * into a;end if;
 return private.media_json(a);
end $$;
create function public.import_service_metadata(p_bundle jsonb,p_destination_workspace_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.import_service_metadata(p_bundle,p_destination_workspace_id);$$;
create function public.confirm_local_media_geometry(p_media_id uuid,p_width integer,p_height integer,p_duration double precision default null) returns jsonb language sql security invoker set search_path='' as $$select private.confirm_local_media_geometry(p_media_id,p_width,p_height,p_duration);$$;
revoke all on function private.import_service_metadata(jsonb,uuid),public.import_service_metadata(jsonb,uuid),private.confirm_local_media_geometry(uuid,integer,integer,double precision),public.confirm_local_media_geometry(uuid,integer,integer,double precision) from public,anon;
grant execute on function private.import_service_metadata(jsonb,uuid),public.import_service_metadata(jsonb,uuid),private.confirm_local_media_geometry(uuid,integer,integer,double precision),public.confirm_local_media_geometry(uuid,integer,integer,double precision) to authenticated;
