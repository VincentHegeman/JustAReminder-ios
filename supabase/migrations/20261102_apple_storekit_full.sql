-- JustAReminder Apple IAP, isolated from existing Mollie ledgers and settings.
-- Production Apple purchases and Apple production rights are OFF by default.
create table if not exists public.jar_apple_iap_settings (
 id boolean primary key default true check (id),
 sandbox_test_enabled boolean not null default false,
 production_purchases_enabled boolean not null default false,
 production_rights_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into public.jar_apple_iap_settings(id) values(true) on conflict(id) do nothing;
alter table public.jar_apple_iap_settings enable row level security;
revoke all on public.jar_apple_iap_settings from anon, authenticated;
-- Anonymous clients receive no access to Apple ledgers.
revoke all on public.jar_apple_iap_transactions,public.jar_apple_iap_subscriptions,
 public.jar_apple_iap_notifications from anon, authenticated;

alter table public.jar_apple_iap_subscriptions
 add column if not exists last_signed_at timestamptz,
 add column if not exists auto_renew_enabled boolean,
 add column if not exists grace_expires_at timestamptz;

-- Server-to-server signed payloads only: NEVER make this callable by app clients.
create or replace function public.jar_apple_apply_signed_transaction(
 p_environment text, p_user uuid, p_transaction_id text,
 p_original_transaction_id text, p_product_id text,
 p_app_account_token uuid, p_purchased_at timestamptz,
 p_expires_at timestamptz, p_revoked_at timestamptz,
 p_signed_at timestamptz, p_status text, p_auto_renew boolean default null,
 p_grace_expires_at timestamptz default null
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public as $body$
declare v_existing public.jar_apple_iap_subscriptions%rowtype;
        v_rows integer; v_status text;
begin
 if auth.role() <> 'service_role' then
   raise exception 'Service-role only' using errcode='42501';
 end if;
 if p_environment not in ('Sandbox','Production')
    or p_user is null or p_transaction_id is null or p_original_transaction_id is null
    or p_product_id is null or p_app_account_token is distinct from p_user
    or p_purchased_at is null or p_expires_at is null or p_signed_at is null
    or p_expires_at < p_purchased_at
    or p_signed_at > now() + interval '1 day'
    or p_status not in ('active','grace_period','billing_retry','expired','revoked','unknown') then
   raise exception 'Invalid signed Apple transaction data' using errcode='22023';
 end if;
 if not exists(select 1 from public.jar_apple_iap_products where product_id=p_product_id) then
   raise exception 'Unknown Apple product' using errcode='22023';
 end if;
 -- Reject binding of any original subscription or transaction to different accounts.
 select * into v_existing from public.jar_apple_iap_subscriptions s
  where s.environment=p_environment and s.original_transaction_id=p_original_transaction_id for update;
 if found and v_existing.user_id<>p_user then
   raise exception 'Apple subscription already owned by another account' using errcode='23505';
 end if;
 if exists(select 1 from public.jar_apple_iap_transactions t
   where t.environment=p_environment and t.transaction_id=p_transaction_id and t.user_id<>p_user) then
   raise exception 'Apple transaction already owned by another account' using errcode='23505';
 end if;
 insert into public.jar_apple_iap_transactions(
   environment,transaction_id,original_transaction_id,user_id,product_id,app_account_token,
   purchased_at,expires_at,revoked_at,verified_at)
 values(p_environment,p_transaction_id,p_original_transaction_id,p_user,p_product_id,p_app_account_token,
   p_purchased_at,p_expires_at,p_revoked_at,now())
 on conflict(environment,transaction_id) do update set
   revoked_at=case when excluded.revoked_at is not null then excluded.revoked_at
                   else public.jar_apple_iap_transactions.revoked_at end,
   verified_at=now()
 where public.jar_apple_iap_transactions.user_id=excluded.user_id;
 get diagnostics v_rows=row_count;
 if v_rows<>1 then raise exception 'Apple transaction conflict' using errcode='23505'; end if;
 -- Older notifications or device restores cannot overwrite a newer subscription state.
 v_status:=case when p_revoked_at is not null then 'revoked' else p_status end;
 insert into public.jar_apple_iap_subscriptions(
   environment,original_transaction_id,user_id,product_id,latest_transaction_id,
   status,expires_at,revoked_at,last_verified_at,last_signed_at,auto_renew_enabled,grace_expires_at,updated_at)
 values(p_environment,p_original_transaction_id,p_user,p_product_id,p_transaction_id,
   v_status,p_expires_at,p_revoked_at,now(),p_signed_at,p_auto_renew,p_grace_expires_at,now())
 on conflict(environment,original_transaction_id) do update set
   product_id=excluded.product_id,latest_transaction_id=excluded.latest_transaction_id,
   status=excluded.status,expires_at=excluded.expires_at,revoked_at=excluded.revoked_at,
   last_verified_at=now(),last_signed_at=excluded.last_signed_at,
   auto_renew_enabled=coalesce(excluded.auto_renew_enabled,public.jar_apple_iap_subscriptions.auto_renew_enabled),
   grace_expires_at=excluded.grace_expires_at,
   updated_at=now()
 where public.jar_apple_iap_subscriptions.user_id=excluded.user_id
   and (public.jar_apple_iap_subscriptions.last_signed_at is null
     or excluded.last_signed_at >= public.jar_apple_iap_subscriptions.last_signed_at)
   and (public.jar_apple_iap_subscriptions.latest_transaction_id=excluded.latest_transaction_id
     or public.jar_apple_iap_subscriptions.expires_at is null
     or excluded.expires_at >= public.jar_apple_iap_subscriptions.expires_at
     or excluded.revoked_at is not null);
 return jsonb_build_object('recorded',true,'environment',p_environment,'transaction_id',p_transaction_id);
end $body$;
revoke all on function public.jar_apple_apply_signed_transaction(text,uuid,text,text,text,uuid,timestamptz,timestamptz,timestamptz,timestamptz,text,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.jar_apple_apply_signed_transaction(text,uuid,text,text,text,uuid,timestamptz,timestamptz,timestamptz,timestamptz,text,boolean,timestamptz) to service_role;

create or replace function public.jar_apple_effective_rights(p_user uuid)
returns jsonb language sql stable security definer
set search_path=pg_catalog,public as $body$
 with enabled as (
   select coalesce((select production_rights_enabled from public.jar_apple_iap_settings where id),false) as is_enabled
 ), active as (
  select p.product_kind,p.plan_tier,p.extra_reminders from public.jar_apple_iap_subscriptions s
  join public.jar_apple_iap_products p on p.product_id=s.product_id
  where s.environment='Production' and s.user_id=p_user
    and s.status in ('active','grace_period') and s.revoked_at is null
    and (case when s.status='grace_period' and s.grace_expires_at>s.expires_at
                   then s.grace_expires_at else s.expires_at end)>now()
    and (select is_enabled from enabled)
 ), tier as (
  select case when bool_or(plan_tier='premium') then 'premium'
              when bool_or(plan_tier='private') then 'plus' else 'free' end as plan
   from active where product_kind='base'
 )
 select jsonb_build_object('plan',(select plan from tier),
   'bundle_count',case when (select plan from tier)='free' then 0
     else coalesce((select max(extra_reminders)/50 from active where product_kind='extra'),0) end,
   'verified_paid',(select plan from tier)<>'free')
 $body$;
revoke all on function public.jar_apple_effective_rights(uuid) from public,anon,authenticated;
-- Called internally by existing SECURITY DEFINER entitlement functions, not by clients.

-- Preserve the Mollie/legacy entitlement calculation and overlay verified Apple
-- entitlements only after an explicit later production activation.
create or replace function public.jar_private_entitlement(p_user uuid)
returns jsonb language plpgsql stable security definer
set search_path to 'pg_catalog','public' as $body$
declare
 v_live boolean; v_plan text; v_status text; v_bundles integer;
 v_legacy jsonb; v_legacy_code text; v_valid boolean;
 v_apple jsonb; v_apple_plan text; v_apple_bundles integer;
begin
 v_live:=public.jar_private_billing_live();
 select e.plan_code,e.status,e.bundle_count,
   (e.status in ('active','trialing') and (e.valid_until is null or e.valid_until>now()))
 into v_plan,v_status,v_bundles,v_valid
 from public.jar_user_plan_entitlements e where e.user_id=p_user;
 v_plan:=coalesce(v_plan,'free');v_bundles:=coalesce(v_bundles,0);
 if v_live then
   if not coalesce(v_valid,false) then v_plan:='free';v_bundles:=0;end if;
   if v_plan not in ('plus','premium') then v_bundles:=0;end if;
 else
   select to_jsonb(p) into v_legacy from public.profiles p where p.id=p_user;
   v_legacy_code:=coalesce(v_legacy->>'plan_code',v_legacy->>'plan','free');
   if coalesce(v_valid,false) and v_plan in ('plus','premium') then
     null;
   elsif v_legacy_code in ('free','basic25','pro50') then
     v_plan:=case v_legacy_code when 'basic25' then 'plus' when 'pro50' then 'premium' else 'free' end;
     v_bundles:=case when v_plan='premium' and coalesce(v_legacy->>'addon50_active','false')='true' then 1 else 0 end;
   else
     if v_plan not in ('plus','premium') then v_bundles:=0;end if;
   end if;
 end if;
 v_bundles:=greatest(v_bundles,0);
 v_apple:=public.jar_apple_effective_rights(p_user);
 v_apple_plan:=coalesce(v_apple->>'plan','free');
 v_apple_bundles:=greatest(0,coalesce((v_apple->>'bundle_count')::integer,0));
 if v_apple_plan='premium' then v_plan:='premium';
 elsif v_apple_plan='plus' and v_plan='free' then v_plan:='plus';end if;
 if v_plan<>'free' and v_apple_plan<>'free' then v_bundles:=greatest(v_bundles,v_apple_bundles);end if;
 v_valid:=coalesce(v_valid,false) or coalesce((v_apple->>'verified_paid')::boolean,false);
 return jsonb_build_object(
  'plan',v_plan,'bundle_count',v_bundles,'billing_live',v_live,
  'limit',case v_plan when 'plus' then 25+50*v_bundles
                        when 'premium' then 50+50*v_bundles else 3 end,
  'verified_paid',v_valid);
end $body$;

-- Apple Premium explicitly includes the Family workspace owned by the buyer.
-- Family direct Mollie subscriptions remain unchanged.
create or replace function public.jar_family_paid(p_family_id uuid)
returns boolean language sql stable security definer
set search_path to 'pg_catalog','public' as $body$
 select exists (
  select 1 from public.jar_family_subscription_entitlements e
  where e.family_id=p_family_id and e.status in ('active','trialing')
  and (e.valid_until is null or e.valid_until>now())
 ) or exists (
  select 1 from public.families f
  where f.id=p_family_id
   and (public.jar_apple_effective_rights(f.owner_id)->>'plan')='premium'
 );
$body$;

create or replace function public.jar_family_capacity(p_family_id uuid)
returns integer language sql stable security definer
set search_path to 'pg_catalog','public' as $body$
 select case when not public.jar_family_billing_live() then 50
  when public.jar_family_paid(p_family_id) then
   50+50*greatest(
      coalesce((select s.bundle_count from public.jar_family_subscription_entitlements s where s.family_id=p_family_id),0),
      coalesce((select (public.jar_apple_effective_rights(f.owner_id)->>'bundle_count')::integer
         from public.families f where f.id=p_family_id
           and (public.jar_apple_effective_rights(f.owner_id)->>'plan')='premium'),0)
   ) else 3 end;
$body$;

create or replace function public.jar_get_family_subscription(p_family_id uuid)
returns jsonb language plpgsql stable security definer
set search_path to 'pg_catalog','public' as $body$
declare v_owner uuid;v_bundles integer;v_paid boolean;v_premium boolean;
        v_count integer;v_limit integer;v_pending text;v_apple jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.family_members fm
   where fm.family_id=p_family_id and fm.user_id=auth.uid() and fm.status='active') then
   raise exception 'Je bent geen actief gezinslid.';
 end if;
 select owner_id into v_owner from public.families where id=p_family_id;
 select coalesce(bundle_count,0) into v_bundles from public.jar_family_subscription_entitlements where family_id=p_family_id;
 v_bundles:=coalesce(v_bundles,0);
 v_apple:=public.jar_apple_effective_rights(v_owner);
 if v_apple->>'plan'='premium' then
   v_bundles:=greatest(v_bundles,coalesce((v_apple->>'bundle_count')::integer,0));
 end if;
 v_paid:=public.jar_family_paid(p_family_id);
 v_premium:=exists(select 1 from public.jar_user_plan_entitlements
   where user_id=v_owner and plan_code='premium' and status in ('active','trialing')
   and (valid_until is null or valid_until>now())) or (v_apple->>'plan'='premium');
 v_count:=public.jar_family_active_count(p_family_id);
 v_limit:=public.jar_family_capacity(p_family_id);
 select change_kind into v_pending from public.jar_family_change_requests
  where family_id=p_family_id and status='pending' limit 1;
 return jsonb_build_object(
   'family_id',p_family_id,'owner_id',v_owner,'is_billing_owner',(v_owner=auth.uid()),
   'paid',v_paid,'billing_live',public.jar_family_billing_live(),
   'covered_by_prive_premium',v_premium,
   'active_count',v_count,'task_limit',v_limit,'bundle_count',v_bundles,
   'pending_action',v_pending,'can_remove_bundle',(v_paid and v_bundles>0 and v_count<=v_limit-50),
   'minimum_to_complete',case when v_bundles>0 then greatest(0,v_count-(v_limit-50)) else 0 end);
end $body$;
