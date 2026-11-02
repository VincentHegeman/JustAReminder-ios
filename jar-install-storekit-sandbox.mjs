#!/usr/bin/env node
/* Phased, fail-closed Capacitor 8 iOS StoreKit bridge installer.
   Step 1: before cap sync. Step 2: after jar-install-native-push --native.
   Does not enable purchase or grant entitlements. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.cwd());
const here=path.dirname(fileURLToPath(import.meta.url));
const native=process.argv.includes('--native');
function file(rel){return path.join(root,rel);}
function read(rel){if(!fs.existsSync(file(rel)))throw Error('Ontbrekend bestand: '+rel);return fs.readFileSync(file(rel),'utf8');}
function write(rel,text){fs.mkdirSync(path.dirname(file(rel)),{recursive:true});fs.writeFileSync(file(rel),text,'utf8');}
if(JSON.parse(read('capacitor.config.json')).appId!=='eu.justareminder.app')throw Error('Verkeerd bundle ID');
if(!native){
  const page='www/ios/abonnementen.html';let html=read(page);
  const source='<script src="paywall.js"></script>';
  if(!html.includes(source))throw Error('iOS-paywallscript ontbreekt');
  if(!html.includes('src="../app-config.js"'))html=html.replace(source,'<script src="../app-config.js"></script>\n'+source);
  write(page,html);
  write('www/ios/paywall.js',fs.readFileSync(path.join(here,'paywall-sandbox.js'),'utf8'));
  console.log('StoreKit-productlijst voorbereid; Apple-aankopen nog geblokkeerd.');
} else {
  const delegate='ios/App/App/AppDelegate.swift';
  const storyboard='ios/App/App/Base.lproj/Main.storyboard';
  let swift=read(delegate), xml=read(storyboard);
  const marker='// JAR-SK2-SANDBOX';
  if(!swift.includes(marker)){
    if(!/import Capacitor\b/.test(swift)||!/class AppDelegate\b/.test(swift))throw Error('Onverwachte AppDelegate, native code niet aangepast');
    const plugin=fs.readFileSync(path.join(here,'JARStoreKitSandbox.swift'),'utf8');
    if(!plugin.includes(marker))throw Error('Swift-bestand mist veiligheidsmarkering');
    swift+='\n'+plugin+'\n';
    write(delegate,swift);
  }
  if(xml.includes('customClass="CAPBridgeViewController"')){
    const matches=xml.match(/customClass="CAPBridgeViewController"/g)||[];
    if(matches.length!==1)throw Error('Onverwacht aantal storyboard bridge controllers');
    xml=xml.replace(/customClass="CAPBridgeViewController"(?: customModule="Capacitor")?/,
       'customClass="JARBridgeViewController" customModule="App"');
    write(storyboard,xml);
  }
  if(!xml.includes('customClass="JARBridgeViewController"'))throw Error('Storyboard registreert JARBridgeViewController niet');
  console.log('StoreKit 2 bridged plugin geregistreerd in de iPhone-app.');
}
