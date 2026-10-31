import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script, runInNewContext} from 'node:vm';
import {join} from 'node:path';

const root=process.cwd();
const script=readFileSync(join(root,'www/ios/native-session.js'),'utf8');
function store(){ const data=new Map();return {get length(){return data.size;}, key(i){return [...data.keys()][i]||null;}, getItem(k){return data.has(k)?data.get(k):null;}, setItem(k,v){data.set(k,String(v));}, removeItem(k){data.delete(k);}}; }
function init(native){
 const localStorage=store(),sessionStorage=store();
 const window={localStorage,sessionStorage,Capacitor:{isNativePlatform:()=>native},location:{pathname:'/index.html',assign:()=>{}}};
 const document={readyState:'loading',addEventListener:()=>{},getElementById:()=>null};
 runInNewContext(script,{window,document,URLSearchParams,console});
 return {api:window.JAR_iOS_session, localStorage,sessionStorage};
}
{
 const {api,localStorage,sessionStorage}=init(true);
 assert.equal(api.native,true);
 assert.equal(api.remember(),true);
 api.mark('family');assert.equal(api.last(),'family');
 const adapter=api.authOptions().auth.storage;
 const key='sb-example-auth-token';
 adapter.setItem(key,'TOKEN');assert.equal(localStorage.getItem(key),'TOKEN');
 api.setRemember(false);
 assert.equal(localStorage.getItem(key),null);
 assert.equal(sessionStorage.getItem(key),'TOKEN');
 adapter.setItem(key,'NEXT');assert.equal(sessionStorage.getItem(key),'NEXT');
 adapter.removeItem(key);assert.equal(sessionStorage.getItem(key),null);
 api.setRemember(true);adapter.setItem(key,'PERSISTED');assert.equal(localStorage.getItem(key),'PERSISTED');
}
{
 const {api}=init(false);
 assert.equal(api.native,false);
 assert.equal(Object.keys(api.authOptions()).length,0);
}
// Check that every HTML inline script is syntactically valid without running app services.
for(const path of ['www/index.html','www/prive/inloggen.html','www/prive/account.html','www/prive/dashboard.html','www/prive/instellingen.html','www/family/index.html','www/family/family-dashboard.html']){
 const html=readFileSync(join(root,path),'utf8');
 for (const match of html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)) {
   if(match[1].trim())new Script(match[1],{filename:path});
 }
 assert.ok(html.includes('native-session.js'),path+' does not load native-session.js');
}
assert.ok(readFileSync(join(root,'scripts/apply-ios-assets.mjs'),'utf8').includes("JAR_IOS_BUILD_NUMBER||'5'"));
console.log('OK: native/login session storage, workspace, HTML syntax and iOS build number 5');
