-- A cross-workspace copy refers only to validated, independent destination media.
create function private.duplicate_slide_deck_with_media(p_deck_id uuid,p_destination_workspace_id uuid,p_expected_revision integer,p_media_map jsonb,p_draft jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor();d public.decks;source_workspace uuid;w uuid;new_id uuid:=gen_random_uuid();size integer;
 pair jsonb;mapping jsonb:='{}';targets uuid[]:='{}';source_id uuid;destination_id uuid;ref record;a public.media_assets;b public.media_assets;seen integer:=0;i integer;j integer;
begin
 select workspace_id into source_workspace from public.decks where id=p_deck_id;
 if not found then raise exception 'Presentation unavailable.' using errcode='42501';end if;
 perform 1 from private.document_usage where id for update;
 for w in select distinct value from unnest(array[source_workspace,p_destination_workspace_id]) value order by value loop perform private.lock_deck_workspace(w);end loop;
 select * into d from public.decks where id=p_deck_id;
 if not found then raise exception 'Presentation unavailable.' using errcode='42501';end if;
 if p_expected_revision is null or p_expected_revision<>d.revision then raise exception 'Presentation changed while media was copied.' using errcode='40001';end if;
 if source_workspace=p_destination_workspace_id or jsonb_typeof(p_media_map) is distinct from 'array' or jsonb_array_length(p_media_map)>20200 then raise exception 'Invalid media mapping.' using errcode='22023';end if;
 p_draft:=private.validate_slide_document(coalesce(p_draft,d.document),source_workspace,p_deck_id);
 for pair in select value from jsonb_array_elements(p_media_map) loop
  if jsonb_typeof(pair) is distinct from 'object' or (select count(*) from jsonb_object_keys(pair))<>2 or not(pair?'sourceId' and pair?'destinationId') then raise exception 'Invalid media mapping.' using errcode='22023';end if;
  begin source_id:=(pair->>'sourceId')::uuid;destination_id:=(pair->>'destinationId')::uuid;exception when invalid_text_representation then raise exception 'Invalid media mapping.' using errcode='22023';end;
  if source_id is null or destination_id is null or mapping?source_id::text or destination_id=any(targets) then raise exception 'Duplicate or missing media mapping.' using errcode='22023';end if;
  mapping:=mapping||jsonb_build_object(source_id::text,destination_id::text);targets:=array_append(targets,destination_id);
 end loop;
 for ref in select distinct media_id,kind from private.document_media_refs(p_draft) loop
  destination_id:=(mapping->>ref.media_id::text)::uuid;if destination_id is null then raise exception 'Every referenced file needs a destination copy.' using errcode='22023';end if;
  select * into a from public.media_assets where id=ref.media_id and workspace_id=source_workspace and state='active';
  if not found then raise exception 'Source media unavailable.' using errcode='42501';end if;
  select * into b from public.media_assets where id=destination_id and workspace_id=p_destination_workspace_id and state='active';
  if not found then raise exception 'Destination media unavailable.' using errcode='42501';end if;
  if a.kind<>b.kind or a.location<>b.location or a.mime<>b.mime or a.bytes<>b.bytes or a.sha256<>b.sha256 or a.width<>b.width or a.height<>b.height or a.duration is distinct from b.duration then raise exception 'Destination media must contain the same verified original.' using errcode='22023';end if;
  seen:=seen+1;
 end loop;
 if seen<>jsonb_array_length(p_media_map) then raise exception 'Unexpected media mapping.' using errcode='22023';end if;
 for i in 0..jsonb_array_length(p_draft->'slides')-1 loop
  if p_draft#>>array['slides',i::text,'background','kind']<>'solid' then
   p_draft:=jsonb_set(p_draft,array['slides',i::text,'background','mediaId'],mapping->((p_draft#>>array['slides',i::text,'background','mediaId'])::uuid::text));
  end if;
  if p_draft#>array['slides',i::text]?'standaloneVideoId' then
   p_draft:=jsonb_set(p_draft,array['slides',i::text,'standaloneVideoId'],mapping->((p_draft#>>array['slides',i::text,'standaloneVideoId'])::uuid::text));
  end if;
  for j in 0..jsonb_array_length(p_draft#>array['slides',i::text,'elements'])-1 loop
   if p_draft#>>array['slides',i::text,'elements',j::text,'kind']='image' then
    p_draft:=jsonb_set(p_draft,array['slides',i::text,'elements',j::text,'mediaId'],mapping->((p_draft#>>array['slides',i::text,'elements',j::text,'mediaId'])::uuid::text));
   end if;
  end loop;
 end loop;
 p_draft:=jsonb_set(jsonb_set(p_draft,'{id}',to_jsonb(new_id::text)),'{workspaceId}',to_jsonb(p_destination_workspace_id::text));
 p_draft:=private.validate_slide_document(p_draft,p_destination_workspace_id,new_id);size:=octet_length(p_draft::text);
 perform private.consume_operation(actor,'content');perform private.adjust_document_usage(p_destination_workspace_id,size);
 insert into public.decks(id,workspace_id,created_by,title,document,byte_size) values(new_id,p_destination_workspace_id,actor,p_draft->>'title',p_draft,size) returning * into d;
 return jsonb_build_object('document',d.document,'revision',d.revision);
end $$;
create function public.duplicate_slide_deck_with_media(p_deck_id uuid,p_destination_workspace_id uuid,p_expected_revision integer,p_media_map jsonb,p_draft jsonb default null) returns jsonb language sql security invoker set search_path='' as $$select private.duplicate_slide_deck_with_media(p_deck_id,p_destination_workspace_id,p_expected_revision,p_media_map,p_draft);$$;
revoke all on function private.duplicate_slide_deck_with_media(uuid,uuid,integer,jsonb,jsonb),public.duplicate_slide_deck_with_media(uuid,uuid,integer,jsonb,jsonb) from public,anon;
grant execute on function private.duplicate_slide_deck_with_media(uuid,uuid,integer,jsonb,jsonb),public.duplicate_slide_deck_with_media(uuid,uuid,integer,jsonb,jsonb) to authenticated;
