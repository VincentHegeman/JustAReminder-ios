#!/usr/bin/env node
/** Safe, repeatable native-only CSS patch. Run from the extracted patch folder,
 * passing the repo root as an argument, or run in the repo root itself. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(process.argv[2] || process.cwd());
const target=path.join(root,'www','ios','native-fixes.css');
const css=fs.readFileSync(path.join(here,'ios-layout-fix.css'),'utf8').trim()+'\n';
const start='/* JAR IOS SCREENSHOT LAYOUT FIX BEGIN';
const end='/* JAR IOS SCREENSHOT LAYOUT FIX END */';
const required=['www/prive/dashboard.html','www/family/family-dashboard.html','www/ios/native-fixes.js'];
if(!fs.existsSync(target) || required.some(p=>!fs.existsSync(path.join(root,p)))) {
 console.error('NIET TOEGEPAST: kies de hoofdmap van JustAReminder-ios (met www/prive en www/family).');
 process.exit(1);
}
const old=fs.readFileSync(target,'utf8');
if(!old.includes(':root.jar-ios-native') || !old.includes('jar-ios-dashboard-layout')){
 console.error('NIET TOEGEPAST: onverwachte native-fixes.css; controleer je projectversie.');
 process.exit(1);
}
let next=old;
const from=old.indexOf(start),to=old.indexOf(end);
if((from<0)!=(to<0) || (from>=0&&to<from)){
 console.error('NIET TOEGEPAST: bestaande fix is onvolledig; herstel de CSS eerst.');
 process.exit(1);
}
if(from>=0){next=old.slice(0,from).trimEnd()+'\n\n'+css+old.slice(to+end.length).trimStart();}
else next=old.trimEnd()+'\n\n'+css;
if(next===old){console.log('Geen wijzigingen: iOS layoutfix is al geïnstalleerd.');process.exit(0);}
const backup=target+'.voor-layoutfix.bak';
if(!fs.existsSync(backup))fs.copyFileSync(target,backup);
fs.writeFileSync(target,next);
console.log('GEREED: '+target);
console.log('Backup: '+backup);
console.log('Deze fix verandert geen HTML, gegevens, Supabase, betalingen of web/PWA-layout.');
