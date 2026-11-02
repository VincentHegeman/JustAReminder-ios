// WebCrypto-only Apple JWS verification. Hosted Supabase Edge Runtime currently
// lacks Node X509Certificate verify()/raw/checkIssued(), required by Apple's
// official server library (supabase/edge-runtime issue #761, Oct 2026).
import 'npm:reflect-metadata@0.2.2';
import { X509Certificate, BasicConstraintsExtension } from 'npm:@peculiar/x509@2.2.0';
import { compactVerify, decodeProtectedHeader, importX509 } from 'npm:jose@6.2.14';
import { createClient } from 'npm:@supabase/supabase-js@2.57.0';
export const BUNDLE = 'eu.justareminder.app';
const ROOT_URLS = [
 'https://www.apple.com/appleca/AppleIncRootCertificate.cer',
 'https://www.apple.com/certificateauthority/AppleRootCA-G2.cer',
 'https://www.apple.com/certificateauthority/AppleRootCA-G3.cer',
];
let rootsCache:Promise<X509Certificate[]>|undefined;
function roots():Promise<X509Certificate[]> {
 rootsCache ??= (async()=>{
  const known=Deno.env.get('APPLE_ROOT_CERTS_BASE64');
  if(known){
    const list=JSON.parse(known);
    if(!Array.isArray(list)||list.length<1||list.length>4||!list.every((x:unknown)=>typeof x==='string'))
      throw Error('Apple roots are not configured');
    return list.map((x:string)=>new X509Certificate(x));
  }
  // Root certificates are *only* loaded from Apple's fixed HTTPS endpoints.
  const downloaded=await Promise.allSettled(ROOT_URLS.map(async u=>{
    const response=await fetch(u,{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('Apple root certificate unavailable');
    const data=new Uint8Array(await response.arrayBuffer());
    if(data.length<500||data.length>15000)throw Error('Invalid Apple CA certificate size');
    return new X509Certificate(data);
  }));
  const available=downloaded.filter((r):r is PromiseFulfilledResult<X509Certificate>=>r.status==='fulfilled').map(r=>r.value);
  if(!available.length)throw Error('Apple trusted roots unavailable');
  return available;
 })().catch(e=>{rootsCache=undefined;throw e});
 return rootsCache;
}
const toByteArray=(raw:string)=>{
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)||raw.length>20000)throw Error('Invalid x5c certificate');
  return Uint8Array.from(atob(raw),c=>c.charCodeAt(0));
};
const validDate=(cert:X509Certificate,now:Date)=>cert.notBefore<=now&&cert.notAfter>=now;
export async function verifyAppleSignedJws(signed:string):Promise<Record<string,any>>{
 if(!jwsOK(signed))throw Error('Invalid JWS');
 const header=decodeProtectedHeader(signed);
 if(header.alg!=='ES256'||!Array.isArray(header.x5c)||header.x5c.length!==3||
   !header.x5c.every(x=>typeof x==='string'))throw Error('Unexpected Apple signing certificate chain');
 const now=new Date();
 const [leaf,issuer]=header.x5c.slice(0,2).map(x=>new X509Certificate(toByteArray(x)));
 if(!validDate(leaf,now)||!validDate(issuer,now)||leaf.issuer!==issuer.subject)
   throw Error('Apple certificate expired or not linked');
 if(!leaf.getExtension('1.2.840.113635.100.6.11.1')||
    !issuer.getExtension('1.2.840.113635.100.6.2.1')||
    issuer.getExtension(BasicConstraintsExtension)?.ca!==true)
   throw Error('Apple code-signing certificate markers are missing');
 if(!await leaf.verify({publicKey:issuer.publicKey,date:now}))
   throw Error('Apple leaf certificate not signed by intermediate');
 let chainOK=false;
 for(const root of await roots()){
  if(issuer.issuer!==root.subject||!validDate(root,now))continue;
  if(await issuer.verify({publicKey:root.publicKey,date:now})){chainOK=true;break}
 }
 if(!chainOK)throw Error('Apple intermediate not rooted in trusted Apple CA');
 const key=await importX509(leaf.toString('pem'),'ES256');
 const {payload}=await compactVerify(signed,key,{algorithms:['ES256']});
 const obj=JSON.parse(new TextDecoder().decode(payload));
 if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('Invalid signed Apple payload');
 return obj;
}
export function verifier(environment:'Sandbox'|'Production') {
 const appID=Number(Deno.env.get('APPLE_APP_ID'));
 if(environment==='Production'&&(!Number.isSafeInteger(appID)||appID<1))
   throw Error('APPLE_APP_ID is not configured');
 const checkEnv=(p:Record<string,any>)=>{
  if(p.environment!==environment)throw Error('Wrong Apple environment');
  return p;
 };
 const checkApp=(p:Record<string,any>)=>{
  if(p.bundleId!==BUNDLE)throw Error('Wrong Apple bundle ID');
  if(environment==='Production'&&Number(p.appAppleId)!==appID)throw Error('Wrong Apple app ID');
  return p;
 };
 return {
  async verifyAndDecodeTransaction(jws:string){return checkApp(checkEnv(await verifyAppleSignedJws(jws)))},
  async verifyAndDecodeRenewalInfo(jws:string){return checkEnv(await verifyAppleSignedJws(jws))},
  async verifyAndDecodeNotification(jws:string){
   const p=await verifyAppleSignedJws(jws);
   if(p.data){
    if(p.data.environment!==environment||p.data.bundleId!==BUNDLE)
      throw Error('Invalid signed Apple notification environment/bundle');
    if(environment==='Production'&&Number(p.data.appAppleId)!==appID)
      throw Error('Invalid signed Apple notification app ID');
   }
   return p;
  }
 };
}
export function adminClient(){
 const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)throw Error('Supabase service credentials unavailable');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function publicClient(){
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_ANON_KEY');
 if(!url||!key)throw Error('Supabase client configuration unavailable');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function payloadDate(ms:unknown): string|null {
 if(typeof ms!=='number'||!Number.isFinite(ms)||ms<0) return null;
 const d=new Date(ms);return Number.isNaN(d.getTime())?null:d.toISOString();
}
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const jwsOK=(s:unknown):s is string=>typeof s==='string'&&s.length<50000&&s.length>64&&s.split('.').length===3;
export async function recordSignedTransaction(db:ReturnType<typeof adminClient>,
 tx: Record<string,any>, environment:'Sandbox'|'Production', status?:string,autoRenew?:boolean,graceExpiresAt?:number){
 const user=tx.appAccountToken, purchased=payloadDate(tx.purchaseDate),expires=payloadDate(tx.expiresDate);
 const signed=payloadDate(tx.signedDate);
 if(typeof user!=='string'||!UUID.test(user)||!purchased||!expires||!signed||
 !tx.productId||!tx.transactionId||!tx.originalTransactionId||tx.bundleId!==BUNDLE||
 tx.environment!==environment)throw Error('Incomplete verified Apple transaction');
 const computed=tx.revocationDate?'revoked':new Date(expires)>new Date()?'active':'expired';
 const validStatuses=['active','grace_period','billing_retry','expired','revoked','unknown'];
 const effective=validStatuses.includes(status||'')?status!:computed;
 const {data,error}=await db.rpc('jar_apple_apply_signed_transaction',{
  p_environment:environment,p_user:user,p_transaction_id:String(tx.transactionId),
  p_original_transaction_id:String(tx.originalTransactionId),p_product_id:tx.productId,
  p_app_account_token:user,p_purchased_at:purchased,p_expires_at:expires,
  p_revoked_at:payloadDate(tx.revocationDate),p_signed_at:signed,
  p_status:effective,p_auto_renew:autoRenew??null,
  p_grace_expires_at:payloadDate(graceExpiresAt)
 });
 if(error)throw Error('Verified Apple transaction ledger failed: '+error.code);
 return data;
}
