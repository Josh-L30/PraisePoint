begin;
create temp table s03_race_output(result jsonb);
grant select,insert on s03_race_output to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a4000000-0000-4000-8000-000000000001","app_metadata":{"provider":"google"}}',true);
do $$ declare started timestamptz:=clock_timestamp(); d jsonb; value jsonb; begin
  select document into strict d from public.decks where id='a4000000-0000-4000-8000-000000000010';
  value:=public.save_slide_deck(jsonb_set(d,'{title}','"First race writer"'),1);
  perform pg_sleep(30);
  insert into s03_race_output values(jsonb_build_object('status','saved','pid',pg_backend_pid(),'started',extract(epoch from started),'finished',extract(epoch from clock_timestamp()),'revision',value->'revision'));
end $$;
reset role;
select result from s03_race_output;
commit;
