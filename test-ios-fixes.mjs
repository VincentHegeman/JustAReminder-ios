import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const get=p=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
const paths=['www/index.html','www/prive/dashboard.html','www/family/family-dashboard.html','www/prive/inloggen.html','www/prive/account.html','www/prive/instellingen.html','www/family/index.html','www/family/agenda-scanner.html','www/ios/abonnementen.html'];
for(const p of paths){
 const html=get(p);assert(html.includes('native-fixes.js'),`Missing native fixes: ${p}`);
 assert(html.includes('native-fixes.css'),`Missing native CSS: ${p}`);
}
for(const p of ['www/prive/dashboard.html','www/family/family-dashboard.html']){
 assert(get(p).includes('viewport-fit=cover'),p+' viewport');
 assert(!get(p).includes('user-scalable=no'),p+' must preserve user zoom');
}
assert(get('www/ios/native-fixes.js').includes('isNativePlatform'), 'Native app detection is required');
assert(get('www/ios/ios-checkout-guard.js').includes('startMollieCheckout'),'iOS web checkout guard must remain');
assert(get('www/app-config.js').includes('iosPurchasesReady: false'),'Payments must stay disabled without server');
assert(get('www/prive/dashboard.html').includes('Taak toegevoegd.'),'Task confirmation');
assert(get('www/prive/dashboard.html').includes('Naam van herinnering *'), 'source labels retained');
assert(get('scripts/apply-ios-assets.mjs').includes('JAR_IOS_BUILD_NUMBER'),'build number bump');
console.log('OK: 9 pages, iOS UI, task labels, purchase safety and build number checks');
