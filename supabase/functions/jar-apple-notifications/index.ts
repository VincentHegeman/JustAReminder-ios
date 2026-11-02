import { adminClient,verifier,recordSignedTransaction,jwsOK } from '../_shared/apple.ts';
const reply=(obj:unknown,status=200)=>Response.json(obj,{status,headers:{'Cache-Control':'no-store'}});
const statusFrom=(type:string,appleStatus:unknown):string|undefined=>{
 if(type==='REFUND'||type==='REVOKE')return 'revoked';
 if(appleStatus===1)return 'active';if(appleStatus===2)return 'expired';
 if(appleStatus===3)return 'billing_retry';if(appleStatus===4)return 'grace_period';
 if(appleStatus===5)return 'revoked';return undefined;
};
Deno.serve(async req=>{
 if(req.method!=='POST')return reply({error:'Only POST'},405);
 let signed:unknown;
 try{const body=await req.json();signed=body?.signedPayload}catch{return reply({error:'Malformed Apple request'},400)}
 if(!jwsOK(signed))return reply({error:'Missing signed notification'},400);
 const db=adminClient();
 // Determine environment ONLY after signature verification under the chosen environment.
 // No unsigned headers, untrusted payload properties or HTTP auth grant permissions.
 let decoded:any,env:'Sandbox'|'Production'|undefined;
 for(const candidate of ['Sandbox','Production'] as const){
  try {decoded=awaitverifier(candidate).verifyAndDecodeNotification(signed);env=candidate;break}
  catch{continue}
 }
 if(!env||!decoded)return reply({error:'Apple JWS could not be verified'},401);
 const id=decoded.notificationUUID, type=decoded.notificationType,subtype=decoded.subtype||null;
 if(typeof id!=='string'||id.length>128||!type)return reply({error:'Invalid signed notification'},400);
 const {data:record,error:readError}=await db.from('jar_apple_iap_notifications').select('processing_status')
  .eq('environment',env).eq('notification_uuid',id).maybeSingle();
 if(readError)return reply({error:'Notification database unavailable'},503);
 if(record?.processing_status==='processed')return reply({ok:true,duplicate:true});
 const {error:pendingError}=await db.from('jar_apple_iap_notifications').upsert({
  environment:env,notification_uuid:id,notification_type:type,subtype,
  processing_status:'verified',error_message:null
 },{onConflict:'environment,notification_uuid'});
 if(pendingError)return reply({error:'Notification ledger unavailable'},503);
 try {
  const data=decoded.data;
  if(data?.signedTransactionInfo){
   if(!jwsOK(data.signedTransactionInfo))throw Error('Missing signed transaction');
   const verify=verifier(env);
   const tx:any=await verify.verifyAndDecodeTransaction(data.signedTransactionInfo);
   let autoRenew: boolean|undefined;let graceExpiresAt:number|undefined;
   if(data.signedRenewalInfo){
    if(!jwsOK(data.signedRenewalInfo))throw Error('Missing signed renewal');
    const renewal:any=await verify.verifyAndDecodeRenewalInfo(data.signedRenewalInfo);
    if(renewal.originalTransactionId!==tx.originalTransactionId)throw Error('Renewal chain mismatch');
    if(renewal.autoRenewStatus!==undefined) autoRenew=renewal.autoRenewStatus===1;
    if(typeof renewal.gracePeriodExpiresDate==='number')graceExpiresAt=renewal.gracePeriodExpiresDate;
   }
   // Apple sandbox and production subscriptions may contain legacy transactions
   // with no appAccountToken. We cannot assign those to a random Supabase user.
   if(!tx.appAccountToken)throw Error('No account token: transaction needs manual reconciliation');
   await recordSignedTransaction(db,tx,env,statusFrom(type,data.status),autoRenew,graceExpiresAt);
  } else if(data?.signedRenewalInfo) {
   // Notifications without a transaction do not update entitlement state.
   const verify=verifier(env);
   await verify.verifyAndDecodeRenewalInfo(data.signedRenewalInfo);
  }
  const {error:e}=await db.from('jar_apple_iap_notifications').update({
    processing_status:'processed',processed_at:new Date().toISOString(),error_message:null
  }).eq('environment',env).eq('notification_uuid',id);
  if(e)throw Error('Notification processing status unavailable');
  return reply({ok:true});
 }catch(e){
  console.error('Apple signed notification processing failed',e);
  await db.from('jar_apple_iap_notifications').update({
    processing_status:'failed',error_message:'Verified notification was not processed'
  }).eq('environment',env).eq('notification_uuid',id);
  return reply({error:'Retry notification'},503);
 }
});
