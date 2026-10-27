-- Pure validator regression, no account or content rows created.
begin;
do $$ declare d jsonb; parsed jsonb; invalid jsonb; begin
  d:=jsonb_build_object('schemaVersion',1,'id','a5000000-0000-4000-8000-000000000010','workspaceId','a5000000-0000-4000-8000-000000000001','title','Label validator test','width',1920,'height',1080,
    'slides',jsonb_build_array(jsonb_build_object('id','a5000000-0000-4000-8000-000000000011','category','scripture','background',jsonb_build_object('kind','solid','color','#12343D'),
      'elements',jsonb_build_array(jsonb_build_object('id','a5000000-0000-4000-8000-000000000012','kind','text','z',1,'label','Passage','text','Literal passage',
        'fontFamily','Figtree','fontSize',64,'color','#FFFFFF','align','left','x',96,'y',240,'width',1728,'height',520)))));
  parsed:=private.validate_slide_document(d,(d->>'workspaceId')::uuid,(d->>'id')::uuid);
  assert parsed#>>'{slides,0,elements,0,label}'='Passage', 'field label lost';
  foreach invalid in array array['null'::jsonb,'""'::jsonb,'12'::jsonb,to_jsonb(repeat('x',121))] loop
    begin perform private.validate_slide_document(jsonb_set(d,'{slides,0,elements,0,label}',invalid),(d->>'workspaceId')::uuid,(d->>'id')::uuid);
      raise exception 'invalid label accepted'; exception when invalid_parameter_value then null; end;
  end loop;
  perform private.validate_slide_document(d#-'{slides,0,elements,0,label}',(d->>'workspaceId')::uuid,(d->>'id')::uuid);
end $$;
select 'S04 optional label validation and unlabeled compatibility passed; rolled back' as result;
rollback;
