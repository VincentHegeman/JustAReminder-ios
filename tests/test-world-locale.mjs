import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const world = fs.readFileSync('www/ios/world-locale.js','utf8');
const prive = fs.readFileSync('www/prive/dashboard.html','utf8');
const family = fs.readFileSync('www/family/family-dashboard.html','utf8');
const paywall = fs.readFileSync('www/ios/abonnementen.html','utf8');
const landing = fs.readFileSync('www/index.html','utf8');
const privateLogin = fs.readFileSync('www/prive/inloggen.html','utf8');
const privateRegister = fs.readFileSync('www/prive/account.html','utf8');
const familyLogin = fs.readFileSync('www/family/index.html','utf8');
const paywallJs = fs.readFileSync('paywall-sandbox.js','utf8');
const config = fs.readFileSync('www/app-config.js','utf8');
new vm.Script(world,{filename:'world-locale.js'});
new vm.Script(paywallJs,{filename:'paywall-sandbox.js'});

function make(device, saved) {
  const w = {navigator:{language:device,languages:[device]},localStorage:{getItem:key=>key==='jar_language'?saved:null}};
  vm.runInNewContext(world,{window:w,Intl,Date,WeakMap,Object,Promise,Number,String});
  return w.JAR_WORLD_LOCALE;
}
const eu=make('nl-NL',null);
assert.equal(Object.keys(eu.names).length,24,'Existing 24 EU languages must stay selectable');
assert.equal(eu.pick('',null),'nl');
assert.equal(eu.locale('nl'),'nl-NL');
assert.equal(eu.date('2026-11-05',{day:'2-digit',month:'2-digit',year:'numeric'},'nl'),'05-11-2026');
assert.equal(eu.time('14:30','nl'),'14:30');
assert.equal(eu.date('2026-11-05T13:00:00Z',{dateStyle:'short'},'nl').length>0,true);
assert.equal(make('en-US',null).pick('',null),'en');
assert.equal(make('en-US',null).locale('en'),'en-US');
assert.equal(make('en-US','de').pick('de',null),'de','Chosen language overrides device');
assert.equal(make('ar-EG',null).pick('',null),'en','Unsupported device language must fall back to English');
assert.equal(make('ar-EG',null).locale('en'),'en-EG','English fallback must keep the user's country');
assert.equal(make('pt-BR',null).pick('',null),'pt','Supported language must work outside Europe');
assert.equal(make('fr-CA','es').pick('es','fr'),'es','Explicit selection must override profile and device');
assert.equal(eu.time('99:99','nl'),'99:99','Invalid times must not be reinterpreted');

for (const [path,source] of [['Private',prive],['Family',family],['Paywall',paywall],['Entry',landing],['Private login',privateLogin],['Private registration',privateRegister],['Family login',familyLogin]]) {
  assert.match(source,/world-locale\.js/,'Missing shared locale module in '+path);
}
assert.match(prive,/JAR_WORLD_LOCALE\.populate\(selector\)/,'Private language selector not enabled');
assert.match(prive,/JAR_WORLD_LOCALE\.locale\(l\)/,'Private date locale not country-aware');
assert.match(family,/JAR_WORLD_LOCALE\.startFamily\(\)/,'Family UI translations not installed');
assert.match(family,/JAR_WORLD_LOCALE\.applyFamily\(lang\)/,'Family selected language not applied');
assert.match(paywall,/JAR_WORLD_LOCALE\.applyPaywall/,'Paywall localization missing');
assert.match(paywallJs,/JAR_WORLD_LOCALE\?\.paywallText/,'Paywall button labels not localized');
assert.match(privateLogin,/JAR_WORLD_LOCALE\.pick\(stored,null\)/,'Private login does not detect device language');
assert.match(familyLogin,/JAR_WORLD_LOCALE\.pick\(localStorage\.getItem/,'Family login does not detect device language');
assert.match(config,/iosPurchasesReady:\s*false/,'Production Apple purchases must remain OFF');
console.log('OK: worldwide device locale, country date/time formats, 24 EU languages, English fallback, iOS pages and live payments OFF');
