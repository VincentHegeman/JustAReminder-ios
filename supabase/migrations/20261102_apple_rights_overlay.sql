-- Apply after the ledger migration; requires explicit review on the live database.
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
