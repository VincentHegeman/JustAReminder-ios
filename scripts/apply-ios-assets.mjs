#!/usr/bin/env node
/** Run ONLY after `npx cap add ios` / `npx cap sync ios` on Codemagic Mac. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root=process.cwd();
const pbx=path.join(root,'ios/App/App.xcodeproj/project.pbxproj');
const assets=path.join(root,'ios/App/App/Assets.xcassets/AppIcon.appiconset');
const icon=path.join(root,'resources/ios/JustAReminder-AppIcon-1024.png');
const build=String(process.env.JAR_IOS_BUILD_NUMBER||'5');
if(!/^\d+$/.test(build)||Number(build)<5)throw new Error('JAR_IOS_BUILD_NUMBER must be >= 5');
if(!fs.existsSync(pbx)||!fs.existsSync(icon)||!fs.existsSync(assets))throw new Error('iOS files/icons missing. Run cap add and cap sync first.');
let project=fs.readFileSync(pbx,'utf8');
if(!/CURRENT_PROJECT_VERSION\s*=\s*\d+\s*;/.test(project))throw new Error('Cannot locate CURRENT_PROJECT_VERSION in Xcode project');
project=project.replace(/(CURRENT_PROJECT_VERSION\s*=\s*)\d+(\s*;)/g,`$1${build}$2`);
fs.writeFileSync(pbx,project);
const contentPath=path.join(assets,'Contents.json');
if(!fs.existsSync(contentPath))throw new Error('AppIcon Contents.json not found');
const contents=JSON.parse(fs.readFileSync(contentPath,'utf8'));
let num=0;
for(const item of contents.images||[]){
 const name=item.filename;
 if(!name)continue;
 const [w,h]=String(item.size||'1024x1024').split('x').map(Number);
 const scale=Number(String(item.scale||'1x').replace('x',''));
 const size=Math.round((w||1024)*scale);
 if(size>1024 ||size<1) throw new Error('Unexpected app icon size '+size);
 const target=path.join(assets,path.basename(name));
 execFileSync('sips',['-z',String(size),String(size),icon,'--out',target],{stdio:'pipe'});
 num++;
}
if(!num) throw new Error('No image filenames referenced in AppIcon Contents.json. Do not build with default icon.');
console.log('AppIcon installed ('+num+' entries); iOS build '+build);
