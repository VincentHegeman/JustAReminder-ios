// One-time, internal-only Apple Sandbox TEST notification. No purchases or entitlement changes.
import {importPKCS8, SignJWT} from 'npm:jose@6.2.14';
import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

function normalizeAppleKey(raw:string|undefined):string {
 if(!raw||!raw.trim())throw Error('APPLE_IAP_PRIVATE_KEY is missing');
 let value=raw.trim();
 if(value.startsWith('"')&&value.endsWith('"')){
  try {const parsed=JSON.parse(value);if(typeof parsed==='string')value=parsed.trim()}catch{/* literal PEM */}
 }
 value=value.replace(/\\r\\n/g,'\n').replace(/\\n/g,'\n').replace(/\r\n/g,'\n');
 if(!value.includes('-----BEGIN PRIVATE KEY-----')){
  const compact=value.replace(/\s/g,'');
  if(/^[A-Za-z0-9+/]+={0,2}$/.test(compact)){
   try {
    const plain=atob(compact);
    if(plain.includes('-----BEGIN PRIVATE KEY-----'))value=plain.trim();
    else if(plain.charCodeAt(0)===0x30)
      value='-----BEGIN PRIVATE KEY-----\n'+compact.match(/.{1,64}/g)?.join('\n')+'\n-----END PRIVATE KEY-----';
   }catch{/* report invalid format below */}
  }
 }
 if(!value.includes('-----BEGIN PRIVATE KEY-----')||!value.includes('-----END PRIVATE KEY-----'))
  throw Error('APPLE_IAP_PRIVATE_KEY not in Apple PKCS#8 .p8 PEM format');
 return value;
}

type Attempt={sendAttemptResult?:string};
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return reply({error:'POST only'},405);
 const nonce=req.headers.get('x-jar-apple-one-time')||'';
 if(!/^[a-f0-9]{64}$/.test(nonce))return reply({error:'Unauthorized'},401);
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key)return reply({error:'Database credentials unavailable'},503);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:runId,error:authError}=await db.rpc('jar_apple_notification_test_claim',{p_nonce:nonce});
 if(authError||!runId)return reply({error:'Unauthorized or test already used'},401);
 let apiStatus:number|null=null;
 let diagnostic='';
 let delivery:string[]=[];
 let outcome:'delivered'|'pending'|'rejected'|'error'='error';
 try{
  const kid=Deno.env.get('APPLE_IAP_KEY_ID')?.trim();
  const issuer=Deno.env.get('APPLE_IAP_ISSUER_ID')?.trim();
  const bundle=Deno.env.get('APPLE_IAP_BUNDLE_ID')?.trim();
  const pem=normalizeAppleKey(Deno.env.get('APPLE_IAP_PRIVATE_KEY'));
  if(!kid||!issuer||bundle!=='eu.justareminder.app'||!pem)
   throw Error('Apple IAP API credentials missing or bundle ID mismatch');
  const key=await importPKCS8(pem,'ES256');
  const now=Math.floor(Date.now()/1000);
  const jwt=await new SignJWT({bid:bundle})
   .setProtectedHeader({alg:'ES256',kid,typ:'JWT'})
   .setIssuer(issuer).setAudience('appstoreconnect-v1')
   .setIssuedAt(now).setExpirationTime(now+300).sign(key);
  const endpoint='https://api.storekit-sandbox.apple.com/inApps/v1/notifications/test';
  const request=await fetch(endpoint,{
   method:'POST',
   headers:{Authorization:'Bearer '+jwt,Accept:'application/json'},
   signal:AbortSignal.timeout(15000)
  });
  apiStatus=request.status;
  const data=await request.json().catch(()=>({}));
  if(!request.ok){
   diagnostic='Apple Sandbox test rejected request (HTTP '+request.status+', Apple error '+String(data?.errorCode??'unknown').slice(0,20)+')';
   outcome='rejected';
  }else if(typeof data.testNotificationToken!=='string'||data.testNotificationToken.length>200){
   diagnostic='Apple test did not provide a valid test token';
  }else{
   outcome='pending';
   for(let i=0;i<4;i++){
    if(i)await new Promise(resolve=>setTimeout(resolve,2500));
    const check=await fetch(endpoint+'/'+encodeURIComponent(data.testNotificationToken),{
     headers:{Authorization:'Bearer '+jwt,Accept:'application/json'},
     signal:AbortSignal.timeout(15000)
    });
    if(check.status===404)continue;
    if(!check.ok){
     diagnostic='Apple Sandbox test-status API HTTP '+check.status;break;
    }
    const status=await check.json().catch(()=>({}));
    delivery=Array.isArray(status.sendAttempts)?status.sendAttempts.slice(0,6)
     .map((a:Attempt)=>typeof a.sendAttemptResult==='string'?a.sendAttemptResult:'unknown'):[];
    if(delivery.length){
     outcome=delivery.some(x=>x==='SUCCESS')?'delivered':'rejected';
     diagnostic=outcome==='delivered'?'Apple confirmed HTTP 200 from webhook':'Apple delivery: '+delivery.join(', ');
     break;
    }
   }
   if(outcome==='pending'&&!diagnostic)diagnostic='Apple accepted test; delivery status not yet available';
  }
 }catch(e){
  diagnostic=(e instanceof Error?e.message:'Unknown Apple test failure').slice(0,250);
  outcome='error';
  console.error('Apple Sandbox server notification test error:',diagnostic);
 }
 const {error:saveError}=await db.rpc('jar_apple_notification_test_complete',{
  p_run_id:runId,p_code:apiStatus,p_result:outcome,
  p_delivery:delivery,p_diagnostic:diagnostic
 });
 if(saveError)return reply({error:'Test result could not be persisted'},503);
 return reply({ok:outcome==='delivered',result:outcome,appleHttpCode:apiStatus,
   deliveryResults:delivery,diagnostic},outcome==='delivered'?200:202);
});
