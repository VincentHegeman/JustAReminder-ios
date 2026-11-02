-- One-time Apple Sandbox notification test runner.
-- Never grants purchase rights, never touches Mollie or live Apple switches.
create table if not exists public.jar_apple_notification_test_runs(
 id uuid primary key default gen_random_uuid(),
 authorization_sha256 text not null unique,
 expires_at timestamptz not null,
 requested_at timestamptz not null default now(),
 claimed_at timestamptz,
 completed_at timestamptz,
 net_request_id bigint,
 apple_http_code integer,
 result text not null default 'queued',
 delivery_results jsonb,
 diagnostic text
);
alter table public.jar_apple_notification_test_runs enable row level security;
revoke all on public.jar_apple_notification_test_runs from public, anon, authenticated;
grant select,insert,update on public.jar_apple_notification_test_runs to service_role;

create or replace function public.jar_apple_notification_test_claim(p_nonce text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public
as $body$
declare v_id uuid;
begin
 if p_nonce is null or length(p_nonce) <> 64 or p_nonce !~ '^[a-f0-9]+$' then return null; end if;
 update public.jar_apple_notification_test_runs
 set claimed_at=now(),result='running'
 where authorization_sha256=encode(sha256(convert_to(p_nonce,'UTF8')),'hex')
   and claimed_at is null and completed_at is null and expires_at>now()
 returning id into v_id;
 return v_id;
end $body$;
revoke all on function public.jar_apple_notification_test_claim(text) from public,anon,authenticated;
grant execute on function public.jar_apple_notification_test_claim(text) to service_role;

create or replace function public.jar_apple_notification_test_complete(
 p_run_id uuid, p_code integer, p_result text, p_delivery jsonb, p_diagnostic text)
returns void language plpgsql security definer set search_path=pg_catalog,public
as $body$
begin
 if p_result not in ('delivered','pending','rejected','error')
    or p_diagnostic is not null and length(p_diagnostic)>300 then
   raise exception 'Invalid test result';
 end if;
 update public.jar_apple_notification_test_runs
 set completed_at=now(),apple_http_code=p_code,result=p_result,
     delivery_results=coalesce(p_delivery,'[]'::jsonb),
     diagnostic=p_diagnostic
 where id=p_run_id and claimed_at is not null and completed_at is null;
end $body$;
revoke all on function public.jar_apple_notification_test_complete(uuid,integer,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.jar_apple_notification_test_complete(uuid,integer,text,jsonb,text) to service_role;

-- Only SQL admins can queue a test. The one-time nonce never leaves PostgreSQL
-- except as a header to the dedicated Supabase Edge function.
create or replace function public.jar_apple_notification_test_trigger()
returns uuid language plpgsql security definer set search_path=pg_catalog,public
as $body$
declare v_nonce text;v_id uuid;v_request bigint;
begin
 if current_user <> 'postgres' then raise exception 'Only database administrator'; end if;
 v_nonce:=replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 insert into public.jar_apple_notification_test_runs(authorization_sha256,expires_at)
 values(encode(sha256(convert_to(v_nonce,'UTF8')),'hex'),now()+interval '4 minutes')
 returning id into v_id;
 v_request:=net.http_post(
  url:='https://fqupzovqwzaqkatcfbka.supabase.co/functions/v1/jar-apple-notification-test',
  body:='{}'::jsonb,
  headers:=jsonb_build_object('Content-Type','application/json','x-jar-apple-one-time',v_nonce),
  timeout_milliseconds:=30000
 );
 update public.jar_apple_notification_test_runs set net_request_id=v_request where id=v_id;
 return v_id;
end $body$;
revoke all on function public.jar_apple_notification_test_trigger() from public,anon,authenticated,service_role;
