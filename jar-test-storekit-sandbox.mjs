#!/usr/bin/env node
/* Tests storefront source integrity. Cannot claim a successful Apple transaction. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const page=read('www/ios/abonnementen.html');
const source=read('www/ios/paywall.js');
const native=read('JARStoreKitSandbox.swift');
const cfg=read('www/app-config.js');
assert.match(page,/id="restorePurchases"/);
assert.match(page,/supabase-js@2/);
assert.match(page,/src="\.\.\/app-config\.js"/);
assert.match(source,/finishAfterServerVerification/);
assert.match(source,/functions\.invoke\('jar-apple-verify'/);
assert.match(source,/canBuy=native&&window\.JAR_MOBILE_CONFIG\?\.iosPurchasesReady===true/);
assert.match(source,/server\('preflight'/);
assert.match(source,/server\('verify'/);
assert.match(source,/restorePurchases/);
assert.match(native,/CAPPluginMethod\(name: "finishAfterServerVerification"/);
assert.match(native,/\.appAccountToken\(accountUUID\)/);
assert.match(cfg,/iosPurchasesReady:\s*false/);
assert.match(cfg,/iosPurchaseEnvironment:\s*'Sandbox'/);
assert(!source.includes('jar_user_plan_entitlements'));
assert.match(source,/sandboxRecorded/,'Sandbox transactions must be server-recorded before finish');
assert.match(source,/env==='Sandbox'/,'Sandbox completion must be separated from production rights');
assert.match(source,/Er zijn geen productie-rechten gewijzigd/,'Restore must not claim production rights in sandbox');
assert(!source.includes('mollie.com'));
console.log('StoreKit volledige clientflow aanwezig: products, preflight, signed purchase, server verify, finish, restore. Live aankoopflag UIT.');
