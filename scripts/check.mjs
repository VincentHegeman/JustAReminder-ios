import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('www');
const files = ['index.html','ios/abonnementen.html','ios/product-catalog.js','ios/paywall.js','ios/ios-checkout-guard.js','prive/dashboard.html','family/family-dashboard.html','prive/inloggen.html'];
let ok=true;
for (const file of files) {
 if (!fs.existsSync(path.join(root,file))) {console.error('[ONTBREEKT]',file);ok=false;}
 else console.log('[OK]',file);
}
const paywall=fs.readFileSync(path.join(root,'ios','product-catalog.js'),'utf8');
const n=(paywall.match(/eu\.justareminder\./g)||[]).length;
if(n!==8){console.error('[FOUT] Apple product IDs:',n);ok=false;}
else console.log('[OK] 8 Apple-product-ID’s');
const cfg=JSON.parse(fs.readFileSync('capacitor.config.json','utf8'));
if(cfg.appId!=='eu.justareminder.app'){console.error('[FOUT] iOS Bundle ID');ok=false;}
if(!ok)process.exit(1);
console.log('Basiscontrole geslaagd. Dit is GEEN native betaaltest.');
