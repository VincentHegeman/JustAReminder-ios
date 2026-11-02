/* JustAReminder StoreKit 2 voorbereidings-UI.
   Native purchase blijft UIT totdat de volledige server-rechtenintegratie is getest.
   Geen Mollie-aanroepen en geen premiumrechten uit Javascript. */
(function () {
  'use strict';
  const state = document.getElementById('status');
  const catalogue = window.JAR_APPLE_PRODUCTS;
  const native = !!window.Capacitor?.isNativePlatform?.();
  const plugin = native && (window.Capacitor.Plugins?.JARStoreKit || window.Capacitor.registerPlugin?.('JARStoreKit'));
  let duration='monthly', priceMap = new Map();
  const PRODUCT_IDS = Object.values(catalogue || {}).flatMap(item =>
    typeof item === 'object' && item ? Object.values(item) : []).filter(x => typeof x === 'string');
  function status(message) { if (state) {state.textContent=message;state.classList.add('show');} }
  function render() {
    document.getElementById('monthly').setAttribute('aria-pressed',String(duration==='monthly'));
    document.getElementById('yearly').setAttribute('aria-pressed',String(duration==='yearly'));
    for(const [element,tier,defaultText] of [
      ['plus-price','private',duration==='monthly'?'€ 4,99':'€ 49,99'],
      ['premium-price','premium',duration==='monthly'?'€ 9,99':'€ 99,99']
    ]) {
      const pid=catalogue?.[tier]?.[duration];
      const display = priceMap.get(pid) || defaultText;
      const host=document.getElementById(element);
      if(host)host.textContent=display+(duration==='monthly'?' / maand':' / jaar');
    }
  }
  document.getElementById('monthly').addEventListener('click',()=>{duration='monthly';render();});
  document.getElementById('yearly').addEventListener('click',()=>{duration='yearly';render();});
  document.getElementById('free').addEventListener('click',()=>{location.assign('../prive/index.html');});
  document.querySelectorAll('[data-plan]').forEach(btn=>btn.addEventListener('click',()=>{
    status('Apple-producten zijn voorbereid. Aankopen blijven uit totdat veilige serververificatie, herstel en abonnementsrechten zijn goedgekeurd.');
  }));
  document.getElementById('bundleInfo').addEventListener('click',()=>{
    status('Extra uitbreidingen worden na de abonnementstests aangesloten. Er is geen betaling gestart.');
  });
  async function getProducts() {
    if(!plugin){status('Native StoreKit nog niet in deze iPhone-build aanwezig.');return;}
    try {
      const response=await plugin.getProducts({productIds:PRODUCT_IDS});
      for(const p of response?.products||[])if(p?.id && p?.displayPrice)priceMap.set(p.id,p.displayPrice);
      render();
      if(!priceMap.size)status('Apple toont nog geen producten voor dit TestFlight-account. Controleer Sandbox-producten in App Store Connect.');
    }catch(e){status('Producten ophalen is nog niet gelukt: '+(e?.message||'onbekende fout'));}
  }
  if(plugin)void getProducts(); else render();
})();
