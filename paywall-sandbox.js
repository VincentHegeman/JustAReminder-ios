/* JustAReminder StoreKit 2: product listing, purchase, restore, finish, status.
 * UI can never grant rights. Server verifies signed JWS and owns all entitlements.
 * The current release gate is OFF until App Store Server Notifications + Sandbox QA.
 */
(function(){
'use strict';
const endpoint='https://fqupzovqwzaqkatcfbka.supabase.co';
const publishable='sb_publishable_ahp4b1jbybZmcQDDkkdNrg_IvbVXZsY';
const catalogue=window.JAR_APPLE_PRODUCTS;
const native=!!window.Capacitor?.isNativePlatform?.();
const api=native&&(window.Capacitor.Plugins?.JARStoreKit||window.Capacitor.registerPlugin?.('JARStoreKit'));
const canBuy=native&&window.JAR_MOBILE_CONFIG?.iosPurchasesReady===true;
const environment=window.JAR_MOBILE_CONFIG?.iosPurchaseEnvironment==='Sandbox'?'Sandbox':'Production';
const productIds=Object.values(catalogue||{}).flatMap(v=>typeof v==='object'?Object.values(v):[]).filter(v=>typeof v==='string');
const productPrices=new Map();
const section=document.getElementById('status');
const buttons=[...document.querySelectorAll('[data-plan]')];
let period='monthly',busy=false,store=null;
const id=(name)=>document.getElementById(name);
function message(v){if(section){section.textContent=v;section.classList.add('show');section.scrollIntoView({behavior:'smooth',block:'nearest'});}}
function setBusy(v){busy=v;for(const b of buttons)b.disabled=v;if(id('bundleInfo'))id('bundleInfo').disabled=v;if(id('restorePurchases'))id('restorePurchases').disabled=v;}
function render(){
 id('monthly')?.setAttribute('aria-pressed',String(period==='monthly'));
 id('yearly')?.setAttribute('aria-pressed',String(period==='yearly'));
 for(const [target,tier,defaultPrice] of [
  ['plus-price','private',period==='monthly'?'€ 4,99':'€ 49,99'],
  ['premium-price','premium',period==='monthly'?'€ 9,99':'€ 99,99']]){
  const node=id(target);if(node)node.textContent=(productPrices.get(catalogue?.[tier]?.[period])||defaultPrice)+(period==='monthly'?' / maand':' / jaar');
 }
 const bundle=id('bundle');if(bundle)for(const option of [...bundle.options]){
  const key='eu.justareminder.'+option.value;
  const price=productPrices.get(key);
  if(price)option.textContent='+'+(option.value.match(/\d+/)||[''])[0]+' herinneringen · '+price+' / maand';
 }
 for(const b of buttons){b.textContent=canBuy?'Kies abonnement':'Nog niet beschikbaar';b.disabled=busy||!canBuy;}
 const extra=id('bundleInfo');if(extra){extra.textContent=canBuy?'Kies uitbreiding':'Nog niet beschikbaar';extra.disabled=busy||!canBuy;}
}
function client(){
 if(store)return store;
 if(!window.supabase?.createClient)throw Error('Beveiligde loginbibliotheek niet beschikbaar');
 store=window.supabase.createClient(endpoint,publishable,window.JAR_iOS_session?.authOptions()||{});
 return store;
}
async function account(){
 const {data:{user},error}=await client().auth.getUser();
 if(error||!user)throw Error('Log eerst in met je JustAReminder-account');
 return user;
}
async function server(action,args={}){
 const {data,error}=await client().functions.invoke('jar-apple-verify',{
  body:{action,...args},headers:{'Content-Type':'application/json'}
 });
 if(error)throw Error(data?.error||error.message||'Betalingsserver niet beschikbaar');
 if(data?.error)throw Error(data.error);
 return data;
}
async function appleProducts(){
 if(!api){message('Apple StoreKit is alleen beschikbaar in de geïnstalleerde iPhone-app.');return;}
 try {
  const response=await api.getProducts({productIds});
  for(const p of response?.products||[])if(p?.id&&p?.displayPrice)productPrices.set(p.id,p.displayPrice);
  render();
  if(!productPrices.size)message('Apple heeft geen abonnementen teruggegeven. Controleer App Store Connect en de StoreKit-beschikbaarheid.');
 }catch(e){message('Apple-abonnementen ophalen mislukt: '+(e.message||'onbekende fout'));}
}
async function verifyAndFinish(transaction,env){
 if(!transaction?.signedTransaction||!transaction.transactionId)throw Error('Apple heeft geen ondertekende transactie teruggegeven');
 const result=await server('verify',{signedTransaction:transaction.signedTransaction,environment:env});
 if(!result.verified||!result.recorded||!result.rightsReady)throw Error('Apple-aankoop is geregistreerd, maar de abonnementsrechten zijn nog niet vrijgegeven.');
 const finish=await api.finishAfterServerVerification({transactionId:String(transaction.transactionId)});
 if(finish?.finished===false)console.info('Apple purchase already finished or no longer unfinished');
 return result;
}
async function buy(productId){
 if(busy)return;
 if(!canBuy){message('Apple-aankopen staan voor deze versie nog uit.');return;}
 setBusy(true);
 try{
  const user=await account();
  const preflight=await server('preflight',{environment,productId});
  if(!preflight.ready)throw Error('De betaalserver is nog niet klaar');
  const result=await api.purchase({productId,accountId:user.id});
  if(result?.status==='cancelled')message('Aankoop afgebroken, er is niets gewijzigd.');
  else if(result?.status==='pending')message('Apple verwerkt de aankoop nog. Je rechten worden na bevestiging aangepast.');
  else if(result?.status==='verify_on_server'){
   await verifyAndFinish(result,result.environment==='Sandbox'?'Sandbox':environment);
   message('Je Apple-abonnement is geverifieerd en actief. Open opnieuw je dashboard om je nieuwe rechten te zien.');
  }else throw Error('Onbekend antwoord van de App Store');
 }catch(e){message('Aankoop niet afgerond: '+(e.message||'Onbekende fout'));}
 finally{setBusy(false)}
}
async function restore(){
 if(busy)return;
 if(!api){message('Herstel aankopen werkt alleen in de geïnstalleerde iPhone-app.');return;}
 setBusy(true);
 try{
  await account();
  const results=await api.restorePurchases();
  const transactions=results?.transactions||[];
  if(!transactions.length){message('Apple heeft geen actieve aankopen gevonden voor dit Apple-account.');return;}
  let done=0,errors=0;
  for(const transaction of transactions){
   try{await verifyAndFinish(transaction,transaction.environment==='Sandbox'?'Sandbox':'Production');done++}
   catch(e){errors++;console.warn('Restore failed',e?.message||e)}
  }
  message(errors?`${done} abonnement(en) hersteld; ${errors} konden niet aan dit account worden gekoppeld. Gebruik het oorspronkelijke JustAReminder-account of neem contact op met support.`:
   `${done} Apple-abonnement(en) hersteld. Je rechten worden via de server bijgewerkt.`);
 }catch(e){message('Herstellen mislukt: '+(e.message||'Onbekende fout'));}
 finally{setBusy(false)}
}
id('monthly')?.addEventListener('click',()=>{period='monthly';render()});
id('yearly')?.addEventListener('click',()=>{period='yearly';render()});
id('free')?.addEventListener('click',()=>location.assign('../prive/index.html'));
for(const b of buttons)b.addEventListener('click',()=>buy(catalogue[b.dataset.plan==='plus'?'private':'premium'][period]));
id('bundleInfo')?.addEventListener('click',()=>buy('eu.justareminder.'+id('bundle').value));
id('restorePurchases')?.addEventListener('click',restore);
render();if(api)void appleProducts();
})();
