import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(process.argv[2] || process.cwd());
const css=fs.readFileSync(path.join(root,'www/ios/native-fixes.css'),'utf8');
const verify=(re,msg)=>assert.match(css,re,msg);
assert.equal(css.split('/* JAR IOS SCREENSHOT LAYOUT FIX BEGIN').length,2,'Fix precies een keer geïnstalleerd');
verify(/body\.jar-ios-dashboard-layout\s*\{\s*box-sizing:[^}]+padding-top:\s*var\(--jar-ios-safe-top\)/,'Statusbar body inset');
verify(/#mobileMenu\.mobile-menu\s*\{[^}]*z-index:\s*300/,'Zijmenu boven bottom nav');
verify(/#mobileMenuBackdrop\.mobile-menu-backdrop\s*\{[^}]*z-index:\s*290/,'Backdrop boven bottom nav');
verify(/calendar-toolbar-actions\s*\{[^}]*display:\s*grid/,'Agenda-grid');
verify(/grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,'Drie agendabuttons');
assert.match(fs.readFileSync(path.join(root,'www/ios/native-fixes.js'),'utf8'),/root\.classList\.add\('jar-ios-native'\)/);
for(const file of ['www/prive/dashboard.html','www/family/family-dashboard.html']){
 assert.match(fs.readFileSync(path.join(root,file),'utf8'),/src="\.\.\/ios\/native-fixes\.js"/);
 assert.match(fs.readFileSync(path.join(root,file),'utf8'),/href="\.\.\/ios\/native-fixes\.css"/);
}
console.log('GESLAAGD: statusbalk, agenda-controls, zijmenu/bottom-nav, uitsluitend Capacitor, beide dashboards.');
