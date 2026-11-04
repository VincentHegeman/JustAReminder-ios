#!/usr/bin/env node
/* Fast preflight: simulate both Capacitor iOS keyboard resize behaviours.
   Runs before a costly Xcode archive; requires Node built-ins only. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js=fs.readFileSync('www/ios/native-fixes.js','utf8');
const css=fs.readFileSync('www/ios/native-fixes.css','utf8');
assert.match(css,/#modalBackdrop\.modal-backdrop\.show/);
assert.match(css,/#reminderForm:not\(\[hidden\]\)/);
assert.match(css,/#wizardTouchArea\s*\{/);
assert.match(css,/#jar-ios-keyboard-done/);
assert.match(js,/keyboardDidShow/);
assert.match(js,/keyboardDidHide/);

function check(mode) {
  const names=new Set(),sizes=new Map(),kbListeners={},docListeners={},viewListeners={};
  let done=null,blurs=0,hideCalls=0;
  const root={
    classList:{
      add:x=>names.add(x), remove:x=>names.delete(x),
      toggle:(x,on)=>{if(on===undefined)on=!names.has(x);on?names.add(x):names.delete(x);return on;}
    },
    style:{getPropertyValue:x=>sizes.get(x)||'',setProperty:(x,v)=>sizes.set(x,v)},
    getAttribute:()=>null
  };
  const field={
    matches:x=>x.includes('textarea'),closest:()=>null,
    blur(){blurs++;},getBoundingClientRect:()=>({top:150,bottom:180})
  };
  const header={querySelector:()=>null,insertBefore:b=>{done=b;}};
  const modal={
    querySelector:x=>x==='.wizard-modal .modal-header'?header:null,
    contains:x=>x===field,classList:{contains:()=>true}
  };
  const document={
    readyState:'loading',documentElement:root,activeElement:null,
    body:{classList:{toggle:()=>{}},appendChild:()=>{}},
    querySelector:()=>null,querySelectorAll:()=>[],
    getElementById:x=>x==='modalBackdrop'?modal:null,
    addEventListener:(name,fn)=>{(docListeners[name]??=[]).push(fn);},
    createElement:()=>({
      setAttribute:()=>{},
      addEventListener(name,fn){if(name==='click')this.click=fn;}
    })
  };
  const window={
    innerHeight:800,
    visualViewport:{height:800,offsetTop:0,addEventListener:(name,fn)=>{viewListeners[name]=fn;}},
    Capacitor:{isNativePlatform:()=>true,Plugins:{Keyboard:{
      addListener:(name,fn)=>{kbListeners[name]=fn;return Promise.resolve({remove:async()=>{}});},
      hide:()=>{hideCalls++;return Promise.resolve();}
    }}},
    addEventListener:()=>{},
    setTimeout:fn=>fn()
  };
  const context={
    window,document,navigator:{onLine:true},
    MutationObserver:class {observe(){}},
    getComputedStyle:()=>({getPropertyValue:()=>''}),
    requestAnimationFrame:fn=>fn()
  };
  vm.runInNewContext(js,context);
  assert.ok(docListeners.DOMContentLoaded?.length,'iOS script must initialize');
  docListeners.DOMContentLoaded[0]();
  const inset=()=>sizes.get('--jar-ios-keyboard-bottom');
  const visible=()=>sizes.get('--jar-visible-height');
  assert.equal(inset(),'0px','keyboard closed');
  if (mode==='overlay') {
    kbListeners.keyboardDidShow({keyboardHeight:300});
    assert.equal(inset(),'300px','native keyboard overlay');
    assert.equal(visible(),'500px','visible modal height');
    window.visualViewport.height=500;viewListeners.resize();
    assert.equal(inset(),'300px','do not double-subtract overlay and viewport');
  } else {
    window.innerHeight=500;window.visualViewport.height=500;
    kbListeners.keyboardDidShow({keyboardHeight:300});
    assert.equal(inset(),'0px','native WebView was already resized');
    assert.equal(visible(),'500px','preserve already visible area');
  }
  document.activeElement=field;
  docListeners.focusin[0]({target:field});
  assert.ok(names.has('jar-ios-wizard-field-focus'),'keyboard focus class set');
  assert.equal(done?.textContent,'Gereed','keyboard dismissal control');
  done.click();
  assert.equal(blurs,1,'focused input blurred');
  assert.equal(hideCalls,1,'native keyboard hidden');
  window.innerHeight=800;window.visualViewport.height=800;
  kbListeners.keyboardDidHide();
  assert.equal(inset(),'0px','keyboard hide clears inset');
}
check('overlay');
check('native-resize');
console.log('OK: native keyboard events, overlay vs resize, modal scroll targets, dismiss button.');