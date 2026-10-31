#!/usr/bin/env node
/* Install JustAReminder's Capacitor iOS APNs support during Codemagic.
 * First call (before npm install): patch package.json, app pages and copy JS.
 * Second call (after cap add/sync): patch generated AppDelegate + entitlements.
 * Safe to run again; all changes are scoped to the build checkout.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const native = process.argv.includes('--native');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, contents) => {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === contents) return;
  fs.writeFileSync(file, contents);
  console.log('APNs installed:', name);
};
const expect = (condition, message) => { if (!condition) throw new Error(message); };
expect(fs.existsSync(path.join(root,'capacitor.config.json')), 'Run from JustAReminder-ios repository root');
expect(JSON.parse(read('capacitor.config.json')).appId === 'eu.justareminder.app','Unexpected iOS bundle identifier');
if (!native) {
  const capacitorConfig = JSON.parse(read('capacitor.config.json'));
  capacitorConfig.plugins ||= {};
  capacitorConfig.plugins.PushNotifications = { presentationOptions: ['badge', 'sound', 'alert'] };
  write('capacitor.config.json', JSON.stringify(capacitorConfig, null, 2) + '\n');
  const pkg = JSON.parse(read('package.json'));
  pkg.dependencies ||= {};
  pkg.dependencies['@capacitor/push-notifications'] = '^8.1.3';
  write('package.json', JSON.stringify(pkg, null, 2) + '\n');
  write('www/ios/native-push.js', fs.readFileSync(path.join(here, 'jar-native-push.js'), 'utf8'));
  for (const page of ['www/prive/dashboard.html','www/family/family-dashboard.html']) {
    const tag = '<script src="../ios/native-push.js" defer></script>';
    const html = read(page);
    expect(html.includes('</head>'), page + ' has no </head>');
    write(page, html.includes(tag) ? html : html.replace('</head>', tag + '\n</head>'));
  }
  console.log('Capacitor push plugin and JustAReminder UI are prepared.');
} else {
  const delegate = 'ios/App/App/AppDelegate.swift';
  const pbx = 'ios/App/App.xcodeproj/project.pbxproj';
  expect(fs.existsSync(path.join(root,delegate)) && fs.existsSync(path.join(root,pbx)), 'Capacitor iOS project missing: run cap add + sync first');
  let swift = read(delegate);
  expect(/class\s+AppDelegate\s*:\s*CAPBridgeViewController|class\s+AppDelegate\s*:\s*UIResponder/.test(swift), 'Unexpected AppDelegate; inspect native code');
  if (!swift.includes('capacitorDidRegisterForRemoteNotifications')) {
    expect(/import Capacitor\b/.test(swift), 'AppDelegate does not import Capacitor');
    expect(!/didRegisterForRemoteNotificationsWithDeviceToken/.test(swift), 'Existing APNs handlers need manual review');
    const anchor = swift.lastIndexOf('\n}');
    expect(anchor > 0, 'Could not find AppDelegate end');
    const handlers = `
    // Capacitor push plugin: forward native APNs registration to JavaScript.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
`;
    swift = swift.slice(0,anchor) + handlers + swift.slice(anchor);
    write(delegate,swift);
  }
  // Apple's provisioning profile must grant Push Notifications for this app ID.
  const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>aps-environment</key><string>production</string></dict></plist>
`;
  write('ios/App/App/App.entitlements',entitlements);
  let project = read(pbx);
  if (!/CODE_SIGN_ENTITLEMENTS\s*=\s*App\/App\.entitlements\s*;/.test(project)) {
    const re = /(CODE_SIGN_STYLE\s*=\s*Automatic\s*;)/g;
    const matches = project.match(re) || [];
    expect(matches.length >= 2, 'Expected automatic signing in Debug/Release for app target');
    project = project.replace(re, '$1\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;');
    write(pbx,project);
  }
  console.log('iOS Push Notifications entitlement and AppDelegate callbacks configured.');
}
