#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.cwd());
const has=(f,s)=>fs.readFileSync(path.join(root,f),'utf8').includes(s);
const ready=[
 ['Paywall toont Apple-prijzen en blokkeert purchases',has('www/ios/paywall.js','plugin.getProducts')&&!has('www/ios/paywall.js','plugin.purchase(')],
 ['Geen betaalrechten uit client',!has('www/ios/paywall.js','jar_user_plan_entitlements')],
 ['App Store afgeschermd',has('www/app-config.js','iosPurchasesReady: false')],
 ['Productpagina bestaat',has('www/ios/abonnementen.html','id="premium-price"')],
 ['Native Mollie-guard blijft actief',fs.existsSync(path.join(root,'www/ios/ios-checkout-guard.js'))],
 ['Family-formulierfix behouden',fs.existsSync(path.join(root,'fix-family-mobile-forms.mjs'))]
];
let failed=0;for(const [label,ok] of ready){console.log((ok?'OK ':'FOUT ')+label);if(!ok)failed++;}
if(failed)process.exitCode=1;
