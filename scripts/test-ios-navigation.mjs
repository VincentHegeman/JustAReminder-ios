/* Native navigation and session regression tests: no network, real iPhone, or database required. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const session = fs.readFileSync('www/ios/native-session.js','utf8');
const navigation = fs.readFileSync('www/ios/native-navigation.js','utf8');
function store(){const map=new Map(); return {get length(){return map.size}, key(i){return [...map.keys()][i]||null},getItem(k){return map.has(k)?map.get(k):null},setItem(k,v){map.set(k,String(v))},removeItem(k){map.delete(k)}};}
function instance(path){
 const localStorage=store(), sessionStorage=store();
 const assigned=[]; const navCalls=[];
 const location={protocol:'capacitor:',host:'localhost',origin:'null',pathname:path,href:'capacitor://localhost'+path,assign(url){assigned.push(url)}};
 const elements=new Map();
 const header={querySelector(){return null},insertBefore(el){elements.set(el.id,el)}};
 const document={referrer:'',readyState:'complete',visibilityState:'visible',body:{},
  createElement(tag){return {tag,id:'',hidden:false,className:'',type:'',textContent:'',addEventListener(name,fn){this[name]=fn}}},
  getElementById(id){return elements.get(id)||null},
  querySelector(sel){return sel==='.mobile-header'?header:null},
  addEventListener(){}};
 const window={Capacitor:{isNativePlatform:()=>true},localStorage,sessionStorage,location,history:{length:1,back(){assigned.push('history.back')}} ,addEventListener(){},jarProdNavigate(which){navCalls.push(which)}};
 const ctx={window,document,URL,console,setTimeout(fn){fn()},getComputedStyle(){return {}}};
 vm.runInNewContext(session,ctx);
 vm.runInNewContext(navigation,ctx);
 return {window,document,localStorage,sessionStorage,assigned,navCalls,elements};
}
{
 const app=instance('/prive/dashboard.html');
 assert.equal(app.window.JAR_iOS_session.route(),'prive/dashboard.html','remember native capacitor:// URL');
 app.window.JAR_iOS_session.mark('prive');
 assert.equal(app.window.JAR_iOS_session.resumeUrl(),'prive/dashboard.html');
 app.window.jarProdNavigate('todo');
 assert.equal(app.navCalls.at(-1),'todo');
 assert.equal(app.elements.get('jar-ios-dashboard-back').hidden,false);
 app.window.JAR_iOS_back();
 assert.equal(app.navCalls.at(-1),'overview','back returns to previous tab without logging out');
 assert.equal(app.assigned.length,0,'no redirects on tab back');
 app.window.JAR_iOS_session.bindUser('user-a');
 app.window.JAR_iOS_session.mark('family');
 app.window.JAR_iOS_session.markRoute('capacitor://localhost/family/family-dashboard.html');
 assert.equal(app.window.JAR_iOS_session.resumeUrl(),'family/family-dashboard.html');
 app.window.JAR_iOS_session.bindUser('user-b');
 assert.equal(app.window.JAR_iOS_session.resumeUrl(),'prive/dashboard.html','new login never inherits previous user workspace');
}
{
 const app=instance('/prive/instellingen.html');
 app.window.JAR_iOS_session.mark('prive');
 app.window.JAR_iOS_session.back();
 assert.equal(app.assigned.at(-1),'/prive/dashboard.html','back on secondary page uses root absolute route');
}
console.log('OK: native capacitor:// deep route, user isolation, tab back and safe settings fallback');
