import fs from 'node:fs';
import assert from 'node:assert/strict';

// These checks protect against regressions before signing a TestFlight IPA.
const paywall = fs.readFileSync('www/ios/abonnementen.html', 'utf8');
const family = fs.readFileSync('www/family/family-dashboard.html', 'utf8');
const config = fs.readFileSync('www/app-config.js', 'utf8');

assert.match(paywall, /viewport-fit=cover/, 'iOS must expose the safe-area inset');
assert.match(paywall, /JAR IOS PAYWALL STATUS BAR SHIELD/, 'iPhone status-bar shield missing');
const shield = paywall.match(/:root\.jar-ios-native body::before\s*\{([^}]+)\}/)?.[1];
assert.ok(shield, 'Status-bar shield must only run in the native iOS wrapper');
assert.match(shield, /position:\s*fixed/, 'Status-bar shield must stay visible while scrolling');
assert.match(shield, /height:\s*max\(env\(safe-area-inset-top,\s*0px\),\s*44px\)/, 'Shield must cover native safe area');
assert.match(shield, /background:\s*var\(--bg\)/, 'Shield must be opaque to hide scrolling content');
assert.match(shield, /pointer-events:\s*none/, 'Shield must not intercept tapping');
assert.match(family, /mode==='reminder'\s*&&\s*pos===3\s*&&\s*Number\(jarWizValue\('notificationMinutes'\)\)>=0\s*&&\s*\(!jarWizValue\('dateInput'\)\s*\|\|\s*!jarWizValue\('timeInput'\)\)/, 'Family push requires date and time');
assert.match(config, /iosPurchasesReady:\s*false/, 'Production purchases must remain disabled');
console.log('OK: native paywall status bar shield, Family push schedule validation, Apple live purchases disabled');
