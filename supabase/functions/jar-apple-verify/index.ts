import { adminClient,publicClient,verifier,recordSignedTransaction,jwsOK } from '../_shared/apple.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
 'Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const respond=(data:unknown,status=200)=>Response.json(data,{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return respond({error:'Alleen POST toegestaan'},405);
 const auth=req.headers.get('authorization')||'';
 if(!/^Bearer \S+$/.test(auth))return respond({error:'Log eerst in'},401);
 try{
  const api=publicClient(); const db=adminClient();
  const {data:{user},error}=await api.auth.getUser(auth.slice(7));
  if(error||!user)return respond({error:'Sessie verlopen'},401);
  const body=await req.json();
  if(!body||typeof body!=='object')return respond({error:'Ongeldig verzoek'},400);
  const {data:settings,error:settingsError}=await db.from('jar_apple_iap_settings')
     .select('sandbox_test_enabled,production_purchases_enabled,production_rights_enabled').eq('id',true).single();
  if(settingsError||!settings)return respond({error:'Abonnementenconfiguratie niet beschikbaar'},503);
  if(body.action==='status'){
   const {data,error:e}=await db.from('jar_apple_iap_subscriptions')
    .select('product_id,status,expires_at,environment,revoked_at,auto_renew_enabled')
    .eq('user_id',user.id).order('expires_at',{ascending:false}).limit(30);
   if(e)throw Error('Status query unavailable');
   return respond({subscriptions:(data||[]).map(s=>({
      productId:s.product_id,status:s.status,expiresAt:s.expires_at,
      environment:s.environment,revoked:s.revoked_at!==null,autoRenew:s.auto_renew_enabled
   })),productionRightsEnabled:settings.production_rights_enabled});
  }
  const env=(body.environment==='Production'?'Production':'Sandbox') as 'Production'|'Sandbox';
  if(body.action==='preflight'){
   if(env==='Sandbox'&&!settings.sandbox_test_enabled)
    return respond({ready:false,error:'Apple Sandbox-tests staan uit'},503);
   if(env==='Production'&&!settings.production_purchases_enabled)
    return respond({ready:false,error:'Echte Apple-aankopen staan uit'},503);
   // Avoid double-billing an existing Mollie customer on first Apple purchase.
   if(env==='Production'){
    const {data:active}=await db.from('jar_user_plan_entitlements').select('plan_code,status,valid_until')
       .eq('user_id',user.id).maybeSingle();
    if(active&&['active','trialing'].includes(active.status)&&
        (!active.valid_until||new Date(active.valid_until)>new Date()))
      return respond({ready:false,error:'Er staat al een actief abonnement op dit account. Controleer eerst je bestaande betaalmethode.'},409);
   }
   const requested=body.productId;
   const {data:product}=await db.from('jar_apple_iap_products').select('product_id,enabled_for_purchase')
    .eq('product_id',requested||'').maybeSingle();
   if(!product || (env==='Production'&&!product.enabled_for_purchase))
    return respond({ready:false,error:'Dit abonnement is nog niet beschikbaar'},409);
   return respond({ready:true,environment:env,accountId:user.id});
  }
  if(body.action!=='verify'||!jwsOK(body.signedTransaction))return respond({error:'Ongeldig Apple-aankoopbewijs'},400);
  // Signed JWS must be checked even when purchase switches are off, to allow
  // restoring prior subscriptions after the switch has been turned off.
  let decoded;
  try{decoded=await verifier(env).verifyAndDecodeTransaction(body.signedTransaction)}
  catch{return respond({error:'Apple-handtekening kon niet worden geverifieerd'},422)}
  if(String(decoded.appAccountToken||'').toLowerCase()!==user.id.toLowerCase())
    return respond({error:'De Apple-aankoop is gekoppeld aan een ander JustAReminder-account'},403);
  try {await recordSignedTransaction(db,decoded as Record<string,any>,env)}
  catch(e){console.error('Apple verified purchase not stored',e);return respond({error:'Apple-aankoop kon niet veilig worden geregistreerd'},503)}
  return respond({verified:true,recorded:true,transactionId:String(decoded.transactionId),
   environment:env,rightsReady:env==='Sandbox'?settings.sandbox_test_enabled:settings.production_rights_enabled});
 }catch(e){console.error('Apple verify failed:',e);return respond({error:'Apple-betaaldienst tijdelijk niet beschikbaar'},503)}
});
