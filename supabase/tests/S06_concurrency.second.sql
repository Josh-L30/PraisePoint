begin;
create temp table s06_race_output(result jsonb);grant select,insert on s06_race_output to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a6600000-0000-4000-8000-000000000002","app_metadata":{"provider":"google"}}',true);
do $$ declare started timestamptz:=clock_timestamp();w uuid:=(public.ensure_personal_workspace()->>'workspaceId')::uuid;asset jsonb;lease jsonb;outcome text;reason text;begin
 asset:=jsonb_build_object('id','a6600000-0000-4000-8000-000000000011','workspaceId',w,'kind','image','location','cloud','mime','image/png','bytes',5242880,'sha256',repeat('b',64),'revision',1,'originalName','S06 quota B.png');
 begin lease:=public.reserve_image_upload(asset,null);outcome:='reserved';exception when insufficient_resources then outcome:='capacity';reason:=sqlerrm;end;

 insert into s06_race_output values(jsonb_build_object('status',outcome,'reason',reason,'pid',pg_backend_pid(),'started',extract(epoch from started),'finished',extract(epoch from clock_timestamp()),'reservation',lease));
end $$;
reset role;select result from s06_race_output;commit;
