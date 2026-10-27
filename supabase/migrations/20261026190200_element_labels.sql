create or replace function private.validate_slide_document(p_document jsonb,p_workspace_id uuid,p_deck_id uuid) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare slide jsonb; element jsonb; background jsonb; seen uuid[]:=array[p_deck_id]; identity uuid; z numeric; output jsonb:='[]'; sorted jsonb;
begin
  perform private.document_keys(p_document,array['schemaVersion','id','workspaceId','title','width','height','slides'],array['schemaVersion','id','workspaceId','title','width','height','slides']);
  if p_document->'schemaVersion' is distinct from '1'::jsonb or p_document->'width' is distinct from '1920'::jsonb or p_document->'height' is distinct from '1080'::jsonb
    or private.document_uuid(p_document->>'id')<>p_deck_id or private.document_uuid(p_document->>'workspaceId')<>p_workspace_id
    or jsonb_typeof(p_document->'title') is distinct from 'string' or char_length(btrim(p_document->>'title')) not between 1 and 120
    or octet_length(p_document::text)>2097152 then raise exception 'Unsupported presentation document.' using errcode='22023'; end if;
  if jsonb_typeof(p_document->'slides') is distinct from 'array' then raise exception 'Invalid slides.' using errcode='22023'; end if;
  if jsonb_array_length(p_document->'slides') not between 1 and 200 then raise exception 'Slide limit exceeded.' using errcode='22023'; end if;
  for slide in select value from jsonb_array_elements(p_document->'slides') loop
    perform private.document_keys(slide,array['id','category','background','elements','standaloneVideoId'],array['id','category','background','elements']);
    identity:=private.document_uuid(slide->>'id');
    if identity=any(seen) then raise exception 'Duplicate document identifier.' using errcode='22023'; end if; seen:=array_append(seen,identity);
    if jsonb_typeof(slide->'category') is distinct from 'string' or slide->>'category' not in ('lyrics','scripture','sermon','announcement','welcome-closing') then raise exception 'Unknown slide category.' using errcode='22023'; end if;
    background:=slide->'background';
    if background->>'kind'='solid' then
      perform private.document_keys(background,array['kind','color'],array['kind','color']);
      if jsonb_typeof(background->'color') is distinct from 'string' or background->>'color' !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid slide color.' using errcode='22023'; end if;
    elsif background->>'kind' in ('image','video') then
      perform private.document_keys(background,array['kind','mediaId'],array['kind','mediaId']); perform private.document_uuid(background->>'mediaId');
      if background->>'kind'='video' and slide ? 'standaloneVideoId' then raise exception 'Use one video at a time.' using errcode='22023'; end if;
      raise exception 'Add workspace media before saving this reference.' using errcode='0A000';
    else raise exception 'Invalid slide background.' using errcode='22023'; end if;
    if slide ? 'standaloneVideoId' then perform private.document_uuid(slide->>'standaloneVideoId'); raise exception 'Standalone media is not available yet.' using errcode='0A000'; end if;
    if jsonb_typeof(slide->'elements') is distinct from 'array' then raise exception 'Invalid elements.' using errcode='22023'; end if;
    if jsonb_array_length(slide->'elements')>100 then raise exception 'Element limit exceeded.' using errcode='22023'; end if;
    for element in select value from jsonb_array_elements(slide->'elements') loop
      if element->>'kind'='text' then
        perform private.document_keys(element,array['id','kind','x','y','width','height','z','text','fontFamily','fontSize','color','align','label'],array['id','kind','x','y','width','height','z','text','fontFamily','fontSize','color','align']);
        if jsonb_typeof(element->'text') is distinct from 'string' or char_length(element->>'text')>20000 or element->'fontFamily' is distinct from '"Figtree"'::jsonb
          or jsonb_typeof(element->'align') is distinct from 'string' or element->>'align' not in ('left','center','right')
          or jsonb_typeof(element->'color') is distinct from 'string' or element->>'color' !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid text styling.' using errcode='22023'; end if;
        perform private.document_number(element,'fontSize',8,300);
      elsif element->>'kind'='image' then
        perform private.document_keys(element,array['id','kind','x','y','width','height','z','mediaId','fit','label'],array['id','kind','x','y','width','height','z','mediaId','fit']);
        perform private.document_uuid(element->>'mediaId');
        raise exception 'Add workspace media before saving this reference.' using errcode='0A000';
      else raise exception 'Invalid element type.' using errcode='22023'; end if;
      if element ? 'label' and (jsonb_typeof(element->'label') is distinct from 'string' or char_length(element->>'label')>120 or char_length(btrim(element->>'label'))=0) then raise exception 'Invalid element label.' using errcode='22023'; end if;
      identity:=private.document_uuid(element->>'id');
      if identity=any(seen) then raise exception 'Duplicate document identifier.' using errcode='22023'; end if; seen:=array_append(seen,identity);
      perform private.document_number(element,'x',0,1920); perform private.document_number(element,'y',0,1080);
      if private.document_number(element,'width',0,1920)=0 or private.document_number(element,'height',0,1080)=0 then raise exception 'Invalid element size.' using errcode='22023'; end if;
      z:=private.document_number(element,'z',0,10000); if z<>trunc(z) then raise exception 'Invalid layer.' using errcode='22023'; end if;
    end loop;
    select coalesce(jsonb_agg(value order by (value->>'z')::numeric,value->>'id'),'[]'::jsonb) into sorted from jsonb_array_elements(slide->'elements');
    output:=output||jsonb_build_array(jsonb_set(slide,'{elements}',sorted));
  end loop;
  return jsonb_set(jsonb_set(p_document,'{slides}',output),'{title}',to_jsonb(btrim(p_document->>'title')));
end $$;

