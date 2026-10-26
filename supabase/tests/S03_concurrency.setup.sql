-- Temporary, explicitly marked account. Paired cleanup removes only this fixture.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values('a4000000-0000-4000-8000-000000000001','s03-save-race@example.invalid',now(),'{"provider":"google"}','{"full_name":"S03 Save Race","test_fixture":"S03_save_race"}');
select set_config('request.jwt.claims','{"sub":"a4000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
do $$ declare w uuid:=(public.ensure_personal_workspace()->>'workspaceId')::uuid; d jsonb; begin
  d:=jsonb_build_object('schemaVersion',1,'id','a4000000-0000-4000-8000-000000000010','workspaceId',w::text,'title','S03 disposable race','width',1920,'height',1080,
    'slides',jsonb_build_array(jsonb_build_object('id','a4000000-0000-4000-8000-000000000011','category','lyrics','background',jsonb_build_object('kind','solid','color','#12343D'),
      'elements',jsonb_build_array(jsonb_build_object('id','a4000000-0000-4000-8000-000000000012','kind','text','z',1,'text','Race fixture','fontFamily','Figtree','fontSize',72,'color','#FFFFFF','align','center','x',96,'y',300,'width',1728,'height',480)))));
  perform public.create_slide_deck(w,d);
end $$;
commit;
select id,revision from public.decks where id='a4000000-0000-4000-8000-000000000010';
