import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
const required=[
 'www/index.html','www/prive/inloggen.html','www/prive/account.html','www/prive/dashboard.html',
 'www/prive/instellingen.html','www/family/index.html','www/family/family-dashboard.html','www/family/agenda-scanner.html',
 'www/ios/abonnementen.html','www/ios/native-fixes.js','www/ios/native-fixes.css',
 'www/ios/native-session.js','www/ios/native-navigation.js','www/ios/ios-checkout-guard.js','www/ios/product-catalog.js',
 'resources/ios/JustAReminder-AppIcon-1024.png','capacitor.config.json','codemagic.yaml'
];
let problems=[];let filesChecked=0, scriptsChecked=0;
const check=(ok,msg)=>{if(!ok)problems.push(msg);};
for(const p of required){check(fs.existsSync(path.join(root,p)),`Bestand ontbreekt: ${p}`);}
const config=JSON.parse(fs.readFileSync('capacitor.config.json','utf8'));
check(config.appId==='eu.justareminder.app','Verkeerd iOS bundle ID');
check(config.webDir==='www','Webbundel moet www zijn');
const cfg=fs.readFileSync('www/app-config.js','utf8');
check(/iosPurchasesReady:\s*false/.test(cfg),'Onbeveiligde betaalfuncties: iosPurchasesReady moet false blijven zonder server');
const catalogue=fs.readFileSync('www/ios/product-catalog.js','utf8');
check((catalogue.match(/eu\.justareminder\./g)||[]).length===8,'Apple-productcatalogus moet 8 IDs bevatten');
for(const p of required.filter(p=>p.endsWith('.html'))){
 if(!fs.existsSync(p))continue;
 const html=fs.readFileSync(p,'utf8'); filesChecked++;
 check(/<meta[^>]*viewport-fit=cover/i.test(html),`Viewport-fit ontbreekt: ${p}`);
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!m[2].trim())continue;
  const isModule=/\btype=[\"']module[\"']/i.test(m[1]);
  if(isModule){
    const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:m[2],encoding:'utf8'});
    if(result.status!==0)problems.push(`Inline module JS ongeldig in ${p}: ${(result.stderr||'').trim().slice(0,300)}`);
    else scriptsChecked++;
  }else {
    try{new Script(m[2],{filename:p});scriptsChecked++;}catch(err){problems.push(`Inline JS ongeldig in ${p}: ${err.message}`);}
  }
 }
 for(const m of html.matchAll(/<(?:script|link|img)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)){
   const target=m[1];
   if(/^\s*(https?:|data:|#|\/\/)/i.test(target))continue;
   const file=target.split(/[?#]/)[0];
   if(!file||file.startsWith('/'))continue;
   const resolved=path.normalize(path.join(path.dirname(p),file));
   if(!resolved.startsWith('www'+path.sep)||!fs.existsSync(resolved))problems.push(`Verwijzing bestaat niet: ${p} -> ${target}`);
 }
}
// The app must never accidentally ship service-role keys or private credentials.
const secretName=/(?:^\.env(?:\.|$)|\.(?:p8|p12|pem|key|mobileprovision|jks|keystore|pfx)$)/i;
function scan(base){
 for(const item of fs.readdirSync(base,{withFileTypes:true})){
  const absolute=path.join(base,item.name); const rel=path.relative(root,absolute);
  if(['node_modules','.git','ios','android'].includes(item.name))continue;
  if(secretName.test(item.name))problems.push('Mogelijk geheim bestand: '+rel);
  if(item.isDirectory())scan(absolute);
  if(!item.isFile()||!/(?:\.html|\.js|\.json|\.swift|\.yaml|\.md|\.mjs)$/i.test(item.name))continue;
  const text=fs.readFileSync(absolute,'utf8');
  if(/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(text))problems.push('Private key in '+rel);
  if(/\bsb_secret_[A-Za-z0-9_-]{16,}\b|\bsk_live_[A-Za-z0-9_-]{16,}\b/.test(text))problems.push('Live secret in '+rel);
 }
}
scan(root);
if(problems.length){console.error(`AFGEKEURD (${problems.length} bevindingen):\n`+problems.map(x=>' - '+x).join('\n'));process.exitCode=1;}
else console.log(`OK broncontrole: ${filesChecked} HTML-pagina’s, ${scriptsChecked} inline scripts, icon, catalogus en zichtbare secretpatronen. Geen iPhone-/backendgarantie.`);
