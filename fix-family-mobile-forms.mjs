#!/usr/bin/env node
/* JustAReminder Family: scoped checkbox / member-name layout fix.
 * Preserves assignments, data, payments, navigation and web/push behavior.
 * Run at repo root before Capacitor copies www into the iOS bundle.
 * Running locally and committing the changed HTML also fixes the web dashboard.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const file = path.join(root, 'www/family/family-dashboard.html');
if (!fs.existsSync(file)) throw Error('Family-dashboard ontbreekt: ' + file);
let html = fs.readFileSync(file, 'utf8');
const marker = 'jarFamilyMobileMemberCheckboxFix20261101';
const broken = '#jarBetaResult .jar-beta-field :is(input:not([type=color]),select,textarea) {';
const fixed = '#jarBetaResult .jar-beta-field :is(input:not([type=color]):not([type=checkbox]):not([type=radio]),select,textarea) {';

if (!html.includes(marker)) {
  const occurrences = html.split(broken).length - 1;
  if (occurrences !== 1) throw Error('Onverwachte Family-CSS-versie: kan de algemene invoerveldselector niet veilig corrigeren. Aantal=' + occurrences);
  const required = [
    'id="jarBetaAssignees"','id="jarBetaRecipients"',
    'id="assignmentGrid"','id="recipientGrid"',
    'id="messageRecipientGrid"','id="routineRecipientGrid"',
    'className=\'jar-beta-member-choice\''
  ];
  for (const s of required) if (!html.includes(s)) throw Error('Family-invoerstructuur veranderd: ' + s);
  html = html.replace(broken, fixed);

  const styles = `<style id="${marker}">
/* iPhone/Web: deze regels gelden uitsluitend voor Family-lidkeuzes.
   De invoerveldselector hierboven sluit checkbox/radio uit: geen 100%-breedte
   of 48px-hoge input meer binnen de gezinsledenlijst. */
#jarBetaResult :is(#jarBetaAssignees,#jarBetaRecipients) {
  box-sizing:border-box; display:grid; min-width:0; max-width:100%; width:100%;
  grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px;
}
#jarBetaResult :is(#jarBetaAssignees,#jarBetaRecipients) > .jar-beta-member-choice {
  box-sizing:border-box; display:flex!important; flex-direction:row!important;
  align-items:center!important; gap:11px!important;
  min-width:0!important; width:100%; max-width:100%;
  min-height:48px; height:auto!important; margin:0; padding:11px 13px;
  white-space:normal!important; text-align:left;
}
#jarBetaResult :is(#jarBetaAssignees,#jarBetaRecipients) > .jar-beta-member-choice > input[type=checkbox],
#reminderModal :is(#recipientGrid,#assignmentGrid) .recipient > input[type=checkbox],
#routineModal #routineRecipientGrid .recipient > input[type=checkbox],
#messageRecipientGrid .recipient > input[type=checkbox] {
  box-sizing:border-box!important; appearance:auto;
  display:block!important; position:static!important;
  width:21px!important; min-width:21px!important; max-width:21px!important;
  height:21px!important; min-height:21px!important; max-height:21px!important;
  flex:0 0 21px!important;
  margin:0!important; padding:0!important; line-height:normal!important;
  border-radius:5px; accent-color:#467b80; align-self:center!important;
}
#jarBetaResult :is(#jarBetaAssignees,#jarBetaRecipients) > .jar-beta-member-choice > span,
#reminderModal :is(#recipientGrid,#assignmentGrid) .recipient > span,
#routineModal #routineRecipientGrid .recipient > span,
#messageRecipientGrid .recipient > span {
  display:block; flex:1 1 auto; min-width:0!important; max-width:100%;
  width:auto!important; white-space:normal!important; word-break:normal;
  overflow-wrap:break-word; line-height:1.4; font-size:clamp(14px,3.8vw,16px);
}
/* De gewone Family-taak- en herinneringenwizard gebruikt dezelfde keuzekaarten. */
#reminderModal :is(#recipientGrid,#assignmentGrid),
#routineModal #routineRecipientGrid,
#messageRecipientGrid {
  box-sizing:border-box; width:100%; max-width:100%; min-width:0;
  display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px;
}
#reminderModal :is(#recipientGrid,#assignmentGrid) > .recipient,
#routineModal #routineRecipientGrid > .recipient,
#messageRecipientGrid > .recipient {
  box-sizing:border-box; display:flex!important; flex-direction:row!important;
  align-items:center!important; min-width:0; max-width:100%; width:100%;
  min-height:46px; height:auto!important; padding:10px 12px; gap:11px;
  white-space:normal!important;
}
@media(max-width:700px) {
  #jarBetaResult :is(#jarBetaAssignees,#jarBetaRecipients),
  #reminderModal :is(#recipientGrid,#assignmentGrid),
  #routineModal #routineRecipientGrid,
  #messageRecipientGrid {grid-template-columns:minmax(0,1fr)!important;}
}
</style>`;
  if (!html.includes('</head>')) throw Error('HTML heeft geen </head>');
  html = html.replace('</head>', styles + '\n</head>');
  fs.writeFileSync(file, html, 'utf8');
  console.log('JustAReminder Family checkbox- en naamfix geïnstalleerd.');
} else {
  if (!html.includes(fixed)) throw Error('Marker bestaat, maar CSS-selector is niet veilig gecorrigeerd.');
  console.log('Family form-fix was al geïnstalleerd (veilig herhaald).');
}
