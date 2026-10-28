begin;
create temp table s06_workspace_race_output(result jsonb) on commit drop;grant select,insert on s06_workspace_race_output to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a6600000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
do $$ declare started timestamptz:=clock_timestamp();w uuid:=(public.ensure_personal_workspace()->>'workspaceId')::uuid;asset jsonb;lease jsonb;outcome text;reason text;begin
 asset:=jsonb_build_object('id','a6600000-0000-4000-8000-000000000010','workspaceId',w,'kind','image','location','cloud','mime','image/png','bytes',5242880,'sha256',repeat('a',64),'revision',1,'originalName','S06 quota A.png');
 begin lease:=public.reserve_image_upload(asset,null);outcome:='reserved';exception when insufficient_resources then outcome:='capacity';reason:=sqlerrm;end;
 perform pg_sleep(55);
 insert into s06_workspace_race_output values(jsonb_build_object('status',outcome,'reason',reason,'pid',pg_backend_pid(),'started',extract(epoch from started),'finished',extract(epoch from clock_timestamp()),'reservation',lease));
end $$;
reset role;select result from s06_workspace_race_output;commit;
