create table public.decks (
  id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check(char_length(btrim(title)) between 1 and 120),
  document jsonb not null,
  revision integer not null default 1 check(revision>0),
  byte_size integer not null check(byte_size between 1 and 2097152),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,id)
);
create index decks_workspace_updated on public.decks(workspace_id,updated_at desc,id);
create index decks_creator on public.decks(created_by);
alter table public.decks enable row level security;
revoke all on public.decks from public,anon,authenticated;
grant select on public.decks to authenticated;
create policy current_member_deck_read on public.decks for select to authenticated using(private.is_workspace_member(workspace_id));

-- Serialized document bytes are app budgets, not a claim about provider disk usage.
create table private.document_usage (id boolean primary key default true check(id),used_bytes bigint not null default 0 check(used_bytes>=0));
insert into private.document_usage(id) values(true);
alter table private.document_usage enable row level security;
revoke all on private.document_usage from public,anon,authenticated;

create function private.document_keys(p_object jsonb,p_allowed text[],p_required text[]) returns void
language plpgsql immutable security invoker set search_path='' as $$
begin
  if jsonb_typeof(p_object) is distinct from 'object' then raise exception 'Invalid document object.' using errcode='22023'; end if;
  if not(p_object ?& p_required) or exists(select 1 from jsonb_object_keys(p_object) as k where not(k=any(p_allowed))) then
    raise exception 'Unsupported document fields.' using errcode='22023';
  end if;
end $$;
create function private.document_uuid(p_value text) returns uuid language plpgsql immutable security invoker set search_path='' as $$
begin
  if p_value is null or p_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Invalid document identifier.' using errcode='22023'; end if;
  return p_value::uuid;
end $$;
create function private.document_number(p_object jsonb,p_key text,p_min numeric,p_max numeric) returns numeric
language plpgsql immutable security invoker set search_path='' as $$
declare value numeric;
begin
  if jsonb_typeof(p_object->p_key) is distinct from 'number' then raise exception 'Invalid document geometry.' using errcode='22023'; end if;
  value:=(p_object->>p_key)::numeric;
  if value<p_min or value>p_max then raise exception 'Invalid document geometry.' using errcode='22023'; end if;
  return value;
end $$;
create function private.validate_slide_document(p_document jsonb,p_workspace_id uuid,p_deck_id uuid) returns jsonb
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
        perform private.document_keys(element,array['id','kind','x','y','width','height','z','text','fontFamily','fontSize','color','align'],array['id','kind','x','y','width','height','z','text','fontFamily','fontSize','color','align']);
        if jsonb_typeof(element->'text') is distinct from 'string' or char_length(element->>'text')>20000 or element->'fontFamily' is distinct from '"Figtree"'::jsonb
          or jsonb_typeof(element->'align') is distinct from 'string' or element->>'align' not in ('left','center','right')
          or jsonb_typeof(element->'color') is distinct from 'string' or element->>'color' !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid text styling.' using errcode='22023'; end if;
        perform private.document_number(element,'fontSize',8,300);
      elsif element->>'kind'='image' then
        perform private.document_keys(element,array['id','kind','x','y','width','height','z','mediaId','fit'],array['id','kind','x','y','width','height','z','mediaId','fit']);
        perform private.document_uuid(element->>'mediaId');
        raise exception 'Add workspace media before saving this reference.' using errcode='0A000';
      else raise exception 'Invalid element type.' using errcode='22023'; end if;
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

create function private.lock_deck_workspace(p_workspace_id uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.workspaces where id=p_workspace_id for update;
  if not found or not private.is_workspace_member(p_workspace_id) then raise exception 'Workspace unavailable.' using errcode='42501'; end if;
end $$;
create function private.adjust_document_usage(p_workspace_id uuid,p_delta integer) returns void language plpgsql security invoker set search_path='' as $$
begin
  if (select used_bytes+p_delta>104857600 from private.document_usage where id) or
    (select coalesce(sum(byte_size),0)+p_delta>26214400 from public.decks where workspace_id=p_workspace_id) then
    raise exception 'The free application document capacity has been reached.' using errcode='53000';
  end if;
  update private.document_usage set used_bytes=used_bytes+p_delta where id;
end $$;
create function private.create_slide_deck(p_workspace_id uuid,p_document jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); d public.decks; document_id uuid:=private.document_uuid(p_document->>'id'); size integer;
begin
  perform 1 from private.document_usage where id for update;
  perform private.lock_deck_workspace(p_workspace_id);
  p_document:=private.validate_slide_document(p_document,p_workspace_id,document_id); size:=octet_length(p_document::text);
  perform private.consume_operation(actor,'content'); perform private.adjust_document_usage(p_workspace_id,size);
  insert into public.decks(id,workspace_id,created_by,title,document,byte_size) values(document_id,p_workspace_id,actor,p_document->>'title',p_document,size) returning * into d;
  return jsonb_build_object('document',d.document,'revision',d.revision);
end $$;
create function private.save_slide_deck(p_document jsonb,p_expected_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); d public.decks; w uuid; size integer;
begin
  if p_expected_revision is null or p_expected_revision<1 then raise exception 'Invalid expected revision.' using errcode='22023'; end if;
  select workspace_id into w from public.decks where id=private.document_uuid(p_document->>'id');
  if not found then raise exception 'Presentation unavailable.' using errcode='42501'; end if;
  perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
  select * into d from public.decks where id=(p_document->>'id')::uuid for update;
  if not found then raise exception 'Presentation unavailable.' using errcode='42501'; end if;
  p_document:=private.validate_slide_document(p_document,w,d.id);
  if d.revision<>p_expected_revision then raise exception 'A newer revision exists.' using errcode='40001'; end if;
  size:=octet_length(p_document::text); perform private.consume_operation(actor,'content'); perform private.adjust_document_usage(w,size-d.byte_size);
  update public.decks set title=p_document->>'title',document=p_document,revision=revision+1,byte_size=size,updated_at=now() where id=d.id returning * into d;
  return jsonb_build_object('document',d.document,'revision',d.revision);
end $$;
create function private.duplicate_slide_deck(p_deck_id uuid,p_destination_workspace_id uuid,p_draft jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); d public.decks; source_workspace uuid; w uuid; new_id uuid:=gen_random_uuid(); size integer;
begin
  select workspace_id into source_workspace from public.decks where id=p_deck_id;
  if not found then raise exception 'Presentation unavailable.' using errcode='42501'; end if;
  perform 1 from private.document_usage where id for update;
  for w in select distinct value from unnest(array[source_workspace,p_destination_workspace_id]) as value order by value loop perform private.lock_deck_workspace(w); end loop;
  select * into d from public.decks where id=p_deck_id;
  if not found then raise exception 'Presentation unavailable.' using errcode='42501'; end if;
  p_draft:=private.validate_slide_document(coalesce(p_draft,d.document),source_workspace,p_deck_id);
  p_draft:=jsonb_set(jsonb_set(p_draft,'{id}',to_jsonb(new_id::text)),'{workspaceId}',to_jsonb(p_destination_workspace_id::text));
  p_draft:=private.validate_slide_document(p_draft,p_destination_workspace_id,new_id); size:=octet_length(p_draft::text);
  perform private.consume_operation(actor,'content'); perform private.adjust_document_usage(p_destination_workspace_id,size);
  insert into public.decks(id,workspace_id,created_by,title,document,byte_size) values(new_id,p_destination_workspace_id,actor,p_draft->>'title',p_draft,size) returning * into d;
  return jsonb_build_object('document',d.document,'revision',d.revision);
end $$;
create function private.delete_slide_deck(p_deck_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.google_actor(); d public.decks; w uuid;
begin
  select workspace_id into w from public.decks where id=p_deck_id;
  if not found then raise exception 'Presentation unavailable.' using errcode='42501'; end if;
  perform 1 from private.document_usage where id for update; perform private.lock_deck_workspace(w);
  select * into d from public.decks where id=p_deck_id for update;
  if not found or (d.created_by<>actor and not private.is_workspace_owner(w)) then raise exception 'Only the creator or workspace owner can delete this presentation.' using errcode='42501'; end if;
  perform private.consume_operation(actor,'content'); perform private.adjust_document_usage(w,-d.byte_size);
  delete from public.decks where id=p_deck_id;
end $$;

create function public.create_slide_deck(p_workspace_id uuid,p_document jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.create_slide_deck(p_workspace_id,p_document); $$;
create function public.save_slide_deck(p_document jsonb,p_expected_revision integer) returns jsonb language sql security invoker set search_path='' as $$ select private.save_slide_deck(p_document,p_expected_revision); $$;
create function public.duplicate_slide_deck(p_deck_id uuid,p_destination_workspace_id uuid,p_draft jsonb default null) returns jsonb language sql security invoker set search_path='' as $$ select private.duplicate_slide_deck(p_deck_id,p_destination_workspace_id,p_draft); $$;
create function public.delete_slide_deck(p_deck_id uuid) returns void language sql security invoker set search_path='' as $$ select private.delete_slide_deck(p_deck_id); $$;
revoke all on function private.document_keys(jsonb,text[],text[]),private.document_uuid(text),private.document_number(jsonb,text,numeric,numeric),private.validate_slide_document(jsonb,uuid,uuid),private.lock_deck_workspace(uuid),private.adjust_document_usage(uuid,integer) from public,anon,authenticated;
revoke all on function private.create_slide_deck(uuid,jsonb),private.save_slide_deck(jsonb,integer),private.duplicate_slide_deck(uuid,uuid,jsonb),private.delete_slide_deck(uuid) from public,anon;
grant execute on function private.create_slide_deck(uuid,jsonb),private.save_slide_deck(jsonb,integer),private.duplicate_slide_deck(uuid,uuid,jsonb),private.delete_slide_deck(uuid) to authenticated;
revoke all on function public.create_slide_deck(uuid,jsonb),public.save_slide_deck(jsonb,integer),public.duplicate_slide_deck(uuid,uuid,jsonb),public.delete_slide_deck(uuid) from public,anon;
grant execute on function public.create_slide_deck(uuid,jsonb),public.save_slide_deck(jsonb,integer),public.duplicate_slide_deck(uuid,uuid,jsonb),public.delete_slide_deck(uuid) to authenticated;
