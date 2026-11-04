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
const iosSource=get('www/ios/native-fixes.js');
const iosCSS=get('www/ios/native-fixes.css');
assert.match(iosSource,/wizardBody\.scrollTop/,'Focused task input must scroll inside modal');
assert.match(iosSource,/jar-ios-keyboard-bottom/,'iPhone keyboard coverage must update');
assert.match(iosCSS,/#modalBackdrop\.show\s*>\s*\.wizard-modal\s+#reminderForm:not\(\[hidden\]\)/,'Task form must be a scroll-safe flex column');
assert.match(iosCSS,/#wizardTouchArea\s*\{/,'Wizard content scroll area must exist');
assert.match(iosSource,/JARNativePush/,'Legacy push button must use real APNs');
assert(!iosSource.includes("el.textContent = 'iPhone-meldingen worden in een volgende testversie toegevoegd.'"),'Do not claim APNs is unavailable');
assert(get('www/ios/ios-checkout-guard.js').includes('startMollieCheckout'),'iOS web checkout guard must remain');
assert(get('www/app-config.js').includes('iosPurchasesReady: false'),'Payments must stay disabled without server');
assert(get('www/prive/dashboard.html').includes('Taak toegevoegd.'),'Task confirmation');
assert(get('www/prive/dashboard.html').includes('Naam van herinnering *'), 'source labels retained');
assert(get('scripts/apply-ios-assets.mjs').includes('JAR_IOS_BUILD_NUMBER'),'build number bump');
console.log('OK: 9 pages, iOS UI, task labels, purchase safety and build number checks');
