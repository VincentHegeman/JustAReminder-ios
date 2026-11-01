#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const family=fs.readFileSync(path.join(root,'www/family/family-dashboard.html'),'utf8');
const checks={
 'Bugselector is verwijderd':!family.includes('#jarBetaResult .jar-beta-field :is(input:not([type=color]),select,textarea) {'),
 'Tekstinvoervelden blijven breed':family.includes('input:not([type=color]):not([type=checkbox]):not([type=radio])'),
 'Mobiele Family-ledenfix is actief':family.includes('jarFamilyMobileMemberCheckboxFix20261101'),
 'Slim invoeren — taaktoewijzing':family.includes('id="jarBetaAssignees"'),
 'Slim invoeren — zichtbaarheid':family.includes('id="jarBetaRecipients"'),
 'Gewone taak en herinnering — toewijzing':family.includes('id="assignmentGrid"'),
 'Gewone taak en herinnering — ontvangers':family.includes('id="recipientGrid"'),
 'Routine- en berichtontvangers':family.includes('id="routineRecipientGrid"')&&family.includes('id="messageRecipientGrid"'),
 'Selectievakken 21 px groot':family.includes('width:21px!important; min-width:21px!important; max-width:21px!important;'),
 'Mobiel één kolom':family.includes('@media(max-width:700px) {\n  #jarBetaResult :is(#jarBetaAssignees,#jarBetaRecipients)'),
 'Naam naast vinkje':family.includes('overflow-wrap:break-word; line-height:1.4;'),
 'Bestaande familiewizard behouden':family.includes('id="reminderForm"'),
 'Bestaande opslaanfunctie behouden':family.includes('jarBetaSaveNow()')
};
let failures=0;
for(const [name,ok] of Object.entries(checks)){console.log(`${ok?'OK':'FOUT'} ${name}`);if(!ok)failures++;}
if(failures)process.exit(1);
console.log(`Alle ${Object.keys(checks).length} controles geslaagd. (Visuele iPhone-test blijft nodig.)`);
