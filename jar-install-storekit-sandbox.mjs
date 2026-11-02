#!/usr/bin/env node
/* Native Capacitor 8 StoreKit bridge installer.
   Runs twice in Codemagic: before npm install and after cap sync ios.
   Never enables live purchases, changes Mollie, or grants entitlements. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=process.cwd(), here=path.dirname(fileURLToPath(import.meta.url));
const full=p=>path.join(root,p);
const read=p=>fs.readFileSync(full(p),'utf8');
const save=(p,content)=>{fs.mkdirSync(path.dirname(full(p)),{recursive:true});fs.writeFileSync(full(p),content,'utf8')};
if(JSON.parse(read('capacitor.config.json')).appId!=='eu.justareminder.app')
  throw Error('Onverwacht iOS-bundle-ID');
if(!process.argv.includes('--native')){
  let config=read('www/app-config.js');
  if(!/iosPurchasesReady:\s*false/.test(config))
    throw Error('Apple-purchasegate mag tijdens het voorbereiden niet aanstaan');
  if(!config.includes('iosPurchaseEnvironment:')){
    config=config.replace(/iosPurchasesReady:\s*false\s*,/,
      "iosPurchasesReady: false,\n  iosPurchaseEnvironment: 'Sandbox',");
    save('www/app-config.js',config);
  }
  const page='www/ios/abonnementen.html';
  let html=read(page);
  html=html.replace('Testversie zonder aankopen.', 'Sandbox-test zonder echte betalingen.');
  html=html.replace('Apple-betalingen zijn nog niet gekoppeld en er wordt niets afgeschreven.',
    'Apple Sandbox-aankopen worden uitsluitend met TestFlight uitgevoerd. Er wordt geen echt geld afgeschreven.');
  const anchor='<script src="paywall.js"></script>';
  if(!html.includes(anchor))throw Error('Abonnementenpagina heeft geen paywall-script');
  if(!html.includes('src="../app-config.js"'))
    html=html.replace(anchor,'<script src="../app-config.js"></script>\n'+anchor);
  if(!html.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js@2'))
    html=html.replace(anchor,'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n'+anchor);
  if(!html.includes('id="restorePurchases"'))
    html=html.replace('<div id="status"',
      '<section class="restore-purchases" style="padding:14px 0"><button type="button" id="restorePurchases" style="background:white;color:#245752;border:1px solid #b7d1c7;padding:14px;border-radius:12px;font:inherit;font-weight:700">Herstel Apple-aankopen</button><p>Beheer of annuleer je abonnement via <a href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noopener noreferrer">Apple</a>.</p></section><div id="status"');
  save(page,html);
  save('www/ios/paywall.js',fs.readFileSync(path.join(here,'paywall-sandbox.js'),'utf8'));
  console.log('StoreKit webbrug geïnstalleerd; aankopen blijven UIT.');
} else {
  const delegate='ios/App/App/AppDelegate.swift';
  const storyboard='ios/App/App/Base.lproj/Main.storyboard';
  let swift=read(delegate),xml=read(storyboard);
  if(!swift.includes('// JAR-SK2-SANDBOX')){
    if(!/import Capacitor\b/.test(swift)||!/class AppDelegate\b/.test(swift))
      throw Error('Onverwachte AppDelegate');
    const plugin=fs.readFileSync(path.join(here,'JARStoreKitSandbox.swift'),'utf8');
    if(!plugin.includes('// JAR-SK2-SANDBOX'))throw Error('StoreKit-veiligheidsmarkering ontbreekt');
    save(delegate,swift+'\n'+plugin+'\n');
  }
  if(xml.includes('customClass="CAPBridgeViewController"')){
    if((xml.match(/customClass="CAPBridgeViewController"/g)||[]).length!==1)
      throw Error('Onverwachte Capacitor-storyboard');
    xml=xml.replace(/customClass="CAPBridgeViewController"(?: customModule="Capacitor")?/,
      'customClass="JARBridgeViewController" customModule="App"');
    save(storyboard,xml);
  }
  if(!xml.includes('customClass="JARBridgeViewController"'))
    throw Error('De native StoreKit-brug is niet aan de storyboard gekoppeld');
  console.log('Native StoreKit 2-plugin in iOS-brug geregistreerd.');
}
