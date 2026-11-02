import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const script=fs.readFileSync('paywall-sandbox.js','utf8');
const ids=['status','monthly','yearly','free','bundle','bundleInfo','restorePurchases','plus-price','premium-price'];
async function exercise(enabled){
 const events=[];
 const el=(name)=>({id:name,disabled:false,value:'extra50.monthly',options:[{value:'extra50.monthly',textContent:''}],dataset:{},
   textContent:'',setAttribute(){},scrollIntoView(){},classList:{add(){}},addEventListener(type,cb){this.handlers??={};this.handlers[type]=cb;}});
 const nodes=new Map(ids.map(id=>[id,el(id)]));
 const plus=el('plus'),premium=el('premium');plus.dataset.plan='plus';premium.dataset.plan='premium';
 const document={getElementById:id=>nodes.get(id)||null,querySelectorAll:()=>[plus,premium]};
 const transaction={transactionId:'12345',environment:'Sandbox',signedTransaction:'signed-test-jws'};
 const plugin={
   async getProducts(){events.push('products');return {products:[{id:'eu.justareminder.private.monthly.v2',displayPrice:'€ 4,99'}]}},
   async purchase(args){events.push('applePurchase');assert.equal(args.accountId,'11111111-1111-4111-8111-111111111111');return {...transaction,status:'verify_on_server'}},
   async restorePurchases(){events.push('restore');return {transactions:[transaction]}},
   async finishAfterServerVerification(){events.push('finish');return {finished:true}}
 };
 const supabase={createClient(){return {
   auth:{async getUser(){return {data:{user:{id:'11111111-1111-4111-8111-111111111111'}}}}},
   functions:{async invoke(_name,args){events.push(args.body.action);return {data:args.body.action==='preflight'?{ready:true,accountId:'11111111-1111-4111-8111-111111111111'}:args.body.action==='verify'?{verified:true,recorded:true,rightsReady:true}: {subscriptions:[]}}}}
 }}};
 const window={JAR_APPLE_PRODUCTS:{private:{monthly:'eu.justareminder.private.monthly.v2',yearly:'eu.justareminder.private.yearly'},premium:{monthly:'eu.justareminder.premium.monthly',yearly:'eu.justareminder.premium.yearly'},extras:{'50':'eu.justareminder.extra50.monthly'}},
 Capacitor:{isNativePlatform:()=>true,Plugins:{JARStoreKit:plugin}},JAR_MOBILE_CONFIG:{iosPurchasesReady:enabled,iosPurchaseEnvironment:'Sandbox'},supabase,JAR_iOS_session:{authOptions:()=>({})}};
 vm.runInNewContext(script,{window,document,location:{assign(){}},console,Map});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(nodes.get('plus-price').textContent,'€ 4,99 / maand');
 assert.equal(plus.disabled,!enabled);
 if(enabled){
  await plus.handlers.click();
  assert(events.indexOf('preflight')<events.indexOf('applePurchase'));
  assert(events.indexOf('applePurchase')<events.indexOf('verify'));
  assert(events.indexOf('verify')<events.indexOf('finish'));
 }
 await nodes.get('restorePurchases').handlers.click();
 assert(events.includes('restore'));
 assert(events.includes('finish'));
 console.log('UI '+(enabled?'enabled':'blocked')+': '+events.join(' > '));
}
await exercise(false);
await exercise(true);
