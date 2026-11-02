/* JustAReminder Apple subscription reconciliation.
 * Manually invoked by a trusted server/cron using the service-role bearer.
 * No production purchases enabled, no Mollie writes, no app client access.
 * Uses Apple's signed current subscription status to recover missed notifications.
 */
import {importPKCS8,SignJWT} from 'npm:jose@6.2.14';
import {adminClient,verifier,jwsOK,recordSignedTransaction} from '../_shared/apple.ts';
type Environment='Sandbox'|'Production';
const result=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const validId=(id:unknown)=>typeof id==='string'&&/^[0-9]{1,25}$/.test(id);
async function authorized(req:Request):Promise<boolean>{
 const provided=req.headers.get('authorization')||'';
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!secret||!provided.startsWith('Bearer '))return false;
 const encoder=new TextEncoder();
 const [a,b]=await Promise.all([
  crypto.subtle.digest('SHA-256',encoder.encode(provided.slice(7))),
  crypto.subtle.digest('SHA-256',encoder.encode(secret))
 ]);
 const aa=new Uint8Array(a),bb=new Uint8Array(b);let different=0;
 for(let i=0;i<aa.length;i++)different|=aa[i]^bb[i];
 return different===0;
}
async function appleToken(){
 const keyId=Deno.env.get('APPLE_IAP_KEY_ID')?.trim();
 const issuer=Deno.env.get('APPLE_IAP_ISSUER_ID')?.trim();
 const bundle=Deno.env.get('APPLE_IAP_BUNDLE_ID')?.trim();
 const privateKey=Deno.env.get('APPLE_IAP_PRIVATE_KEY')?.replace(/\\n/g,'\n').trim();
 if(!keyId||!issuer||bundle!=='eu.justareminder.app'||!privateKey)throw Error('Apple API key not configured');
 const key=await importPKCS8(privateKey,'ES256');
 const now=Math.floor(Date.now()/1000);
 return await new SignJWT({bid:bundle}).setProtectedHeader({alg:'ES256',kid:keyId,typ:'JWT'})
  .setIssuer(issuer).setAudience('appstoreconnect-v1').setIssuedAt(now)
  .setExpirationTime(now+300).sign(key);
}
async function currentStatus(token:string,env:Environment,originalId:string){
 const host=env==='Sandbox'?'https://api.storekit-sandbox.apple.com':'https://api.storekit.apple.com';
 const response=await fetch(host+'/inApps/v1/subscriptions/'+encodeURIComponent(originalId),{
  headers:{authorization:'Bearer '+token,accept:'application/json'},
  signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw Error('Apple subscription API HTTP '+response.status);
 const body=await response.json();
 if(!body||!Array.isArray(body.data))throw Error('Unexpected Apple subscription response');
 return body.data as Array<{lastTransactions?:Array<{
  originalTransactionId?:string,status?:number,
  signedTransactionInfo?:string,signedRenewalInfo?:string
 }>}>
}
Deno.serve(async req=>{
 if(req.method!=='POST')return result({error:'POST only'},405);
 if(!await authorized(req))return result({error:'Unauthorized'},401);
 let body:{apply?:boolean,environment?:string,limit?:number}={};
 try{body=await req.json()}catch{return result({error:'Invalid input'},400)}
 const env:Environment=body.environment==='Sandbox'?'Sandbox':'Production';
 const limit=Number.isSafeInteger(body.limit)?Math.max(1,Math.min(25,body.limit!)):15;
 const dryRun=body.apply!==true;
 const db=adminClient();
 const {data:settings,error:settingsError}=await db.from('jar_apple_iap_settings')
  .select('sandbox_test_enabled,production_rights_enabled').eq('id',true).single();
 if(settingsError||!settings)return result({error:'Settings unavailable'},503);
 // Mutating production subscription ledger is disabled until explicit rollout.
 if(!dryRun&&env==='Production'&&!settings.production_rights_enabled)
  return result({error:'Production Apple reconciliation not approved'},403);
 if(!dryRun&&env==='Sandbox'&&!settings.sandbox_test_enabled)
  return result({error:'Sandbox reconciliation is disabled'},403);
 const {data:subscriptions,error:readError}=await db.from('jar_apple_iap_subscriptions')
  .select('original_transaction_id,user_id')
  .eq('environment',env).in('status',['active','grace_period','billing_retry','unknown'])
  .order('last_verified_at',{ascending:true}).limit(limit);
 if(readError)return result({error:'Subscription lookup failed'},503);
 if(!subscriptions?.length)return result({ok:true,environment:env,dryRun,checked:0,updated:0,errors:0});
 let jwt:string;
 try{jwt=await appleToken()}catch{return result({error:'Apple server API authentication unavailable'},503)}
 const verify=verifier(env);
 let checked=0,updated=0,errors=0,needsManualReview=0;
 for(const sub of subscriptions){
  if(!validId(sub.original_transaction_id)){errors++;continue}
  try{
   const groups=await currentStatus(jwt,env,sub.original_transaction_id);
   let seen=false;
   for(const group of groups)for(const item of group.lastTransactions||[]){
    if(!jwsOK(item.signedTransactionInfo))continue;
    const tx=await verify.verifyAndDecodeTransaction(item.signedTransactionInfo);
    // Apple's response can include other subscription groups; never attach them
    // to the chain being reconciled.
    if(tx.originalTransactionId!==sub.original_transaction_id)continue;
    if(tx.appAccountToken!==sub.user_id)
      throw Error('Apple subscription account/chain mismatch');
    seen=true;
    let autoRenew: boolean|undefined;let graceExpires:number|undefined;
    if(jwsOK(item.signedRenewalInfo)){
     const renewal=await verify.verifyAndDecodeRenewalInfo(item.signedRenewalInfo);
     if(renewal.originalTransactionId!==tx.originalTransactionId)throw Error('Renewal chain mismatch');
     if(renewal.autoRenewStatus!==undefined)autoRenew=renewal.autoRenewStatus===1;
     if(typeof renewal.gracePeriodExpiresDate==='number')graceExpires=renewal.gracePeriodExpiresDate;
    }
    const status=({1:'active',2:'expired',3:'billing_retry',4:'grace_period',5:'revoked'} as Record<number,string>)[item.status??0];
    if(!status)throw Error('Unknown signed subscription status');
    if(!dryRun){
     await recordSignedTransaction(db,tx,env,status,autoRenew,graceExpires);updated++;
    }
   }
   if(!seen)needsManualReview++;
   checked++;
  }catch(e){errors++;console.warn('Apple reconciliation error',e instanceof Error?e.message:'unknown')}
 }
 return result({ok:errors===0,environment:env,dryRun,checked,updated,errors,needsManualReview},
  errors?207:200);
});
