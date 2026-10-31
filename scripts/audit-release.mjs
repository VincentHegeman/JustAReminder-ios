/**
 * Fail-closed launch gate. Cannot certify server state from local source.
 * This deliberately fails until external Apple/Supabase/APNs integration is complete.
 */
import fs from 'node:fs';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const config=fs.readFileSync('www/app-config.js','utf8');
const deps=pkg.dependencies||{};
const problems=[];
function requireCheck(ok,label){if(!ok) problems.push(label);}
requireCheck(!/iosPurchasesReady:\s*false/.test(config),'Apple StoreKit-aankopen + server-side transactiecontrole ontbreken.');
requireCheck(Boolean(deps['@capacitor/push-notifications']),'Native iOS-pushplugin is niet aangesloten.');
requireCheck(fs.existsSync('supabase/functions/apple-transaction-verify/index.ts'),'Beveiligde Apple-transactieverificatie-Edge Function ontbreekt.');
requireCheck(fs.existsSync('supabase/functions/apple-server-notifications/index.ts'),'Apple server-notificaties V2 handler ontbreekt.');
requireCheck(fs.existsSync('supabase/functions/register-apns-device/index.ts'),'APNs apparaatregistratie ontbreekt.');
requireCheck(fs.existsSync('docs/RELEASE-GOEDGEKEURD.json'),'Gecontroleerde test-/privacy-/reviewondertekening ontbreekt (zie docs/KLANTLANCERING.md).');
if(fs.existsSync('docs/RELEASE-GOEDGEKEURD.json')){
 const data=JSON.parse(fs.readFileSync('docs/RELEASE-GOEDGEKEURD.json','utf8'));
 for(const name of ['real_device_iphone','purchase_monthly_yearly','restore_purchases','refund_expiry','push_foreground_background','supabase_rls','account_deletion','privacy_metadata','family_and_prive','offline_error_states']){
  requireCheck(data[name]?.result==='passed' && !!data[name]?.evidence && !!data[name]?.tested_at,`Bewijs ontbreekt: ${name}`);
 }
}
if(problems.length){
 console.error('\n⛔ JUSTAREMINDER IS NOG NIET GEREED VOOR BETALENDE IPHONE-KLANTEN.');
 for(const problem of problems)console.error(' - '+problem);
 console.error('\nDit commando stopt met code 1; TestFlight-bouw blijft afzonderlijk mogelijk.');
 process.exitCode=1;
} else console.log('Broncontrole voor publicatie doorlopen. Controleer ook alle externe systemen; dit script kan ze niet live bewijzen.');
