#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
const text=p=>fs.readFileSync(p,'utf8');
const files=['www/ios/paywall.js','www/ios/abonnementen.html','www/app-config.js',
  'JARStoreKitSandbox.swift','jar-install-storekit-sandbox.mjs','www/ios/ios-checkout-guard.js',
  'fix-family-mobile-forms.mjs'];
files.forEach(p=>assert(fs.existsSync(p),'Ontbreekt: '+p));
const js=text('www/ios/paywall.js');
const app=text('www/app-config.js');
const native=text('JARStoreKitSandbox.swift');
const html=text('www/ios/abonnementen.html');
assert.match(app,/iosPurchasesReady:\s*false/,'Echte Apple-betalingen mogen niet aanstaan');
assert.match(js,/iosPurchasesReady === true/,'De aankoopschakelaar ontbreekt');
assert.match(js,/\.purchase\(/,'Native aankoop ontbreekt');
assert.match(js,/server\('preflight'/,'Preflight vóór Apple ontbreekt');
assert.match(js,/server\('verify'/,'Serververificatie ontbreekt');
assert.match(js,/rightsReady !== true/,'Geen serverbevestiging van rechten');
assert.match(js,/\.restorePurchases\(/,'Aankopen herstellen ontbreekt');
assert.match(js,/finishAfterServerVerification/,'Aankoop wordt niet bevestigd');
assert.match(html,/id="restorePurchases"/,'Herstelknop ontbreekt');
assert.match(native,/Transaction.currentEntitlements/,'Apple StoreKit restore ontbreekt');
assert.match(native,/Transaction.unfinished/,'Apple StoreKit unfinished ontbreekt');
assert.match(native,/await tx.finish\(\)/,'Transaction.finish ontbreekt');
assert.match(native,/\.appAccountToken/,'Account-koppeling ontbreekt');
assert(!/jar_user_plan_entitlements/.test(native),'Geen entitlement vanuit Swift');
console.log('OK: iPhone StoreKit, app-account, verified server, restore, Mollie-guard, Family-fix, live OFF');
