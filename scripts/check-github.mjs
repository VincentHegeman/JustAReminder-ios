import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const blockFiles = [/^\.env(?:\.|$)/i, /\.(?:p8|p12|pem|key|mobileprovision|jks|keystore|pfx)$/i, /credentials\.json$/i, /service.account.*\.json$/i];
const badPatterns = [
  ['Privésleutel', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Apple / Supabase geheim', /\b(?:sb_secret|sk_live|ghp|github_pat)_[A-Za-z0-9_-]{16,}\b/],
  ['Mollie API-sleutel', /\b(?:live|test)_[A-Za-z0-9]{25,}\b/],
  ['Mogelijke Supabase JWT', /\beyJ[A-Za-z0-9_-]{16,}\.eyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{12,}\b/],
];
let problems=[];
function scan(folder){
 for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
  const p=path.join(folder,entry.name);const rel=path.relative(root,p);
  if(entry.name==='.git'||entry.name==='node_modules'||entry.name==='ios'||entry.name==='android')continue;
  if(blockFiles.some(rx=>rx.test(entry.name))) { problems.push(`${rel}: bestand kan vertrouwelijk zijn`);continue; }
  if(entry.isDirectory()) {scan(p);continue;}
  if(!entry.isFile())continue;
  if(/\.(?:png|jpe?g|ico|gif|webp|pdf|zip)$/i.test(entry.name))continue;
  const contents=fs.readFileSync(p,'utf8');
  for(const [label,rx] of badPatterns){ if(rx.test(contents))problems.push(`${rel}: ${label}`); }
 }
}
scan(root);
if(problems.length){console.error('STOP: controleer de volgende bestanden voordat je naar GitHub uploadt:');for(const problem of problems)console.error('- '+problem);process.exit(1);}
console.log('[OK] Geen bekende sleutelpatronen of geheime sleutelbestanden gevonden.');
console.log('Let op: deze automatische controle kan niet alle soorten geheimen herkennen.');
