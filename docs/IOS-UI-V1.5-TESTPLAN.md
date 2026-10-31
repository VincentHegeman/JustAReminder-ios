# JustAReminder iOS — volledige herstelronde v1.5

## Vaste bron en beperkingen
- Deze set gebruikt het volledige v1.4-project als basis. De aangeleverde v1.1-ZIP bevat slechts wijzigingen en is ouder.
- Dit is een testproject, geen goedgekeurde klantrelease.
- Publicatie, betalingen, abonnementrechten en Supabase-gegevens zijn niet aangepast.

## Herstelde gebruikersproblemen
| Onderdeel | Aanpassing | Verificatie |
|---|---|---|
| Grote witte strook bovenaan | Safe-area slechts eenmaal, compactere header; zoekbalk verborgen buiten overzicht | Chromium 375/430/768 px |
| `Nog niet beschikbaar` in topbar | In native iOS verborgen, backend blijft uit | CSS broncode |
| Donkere tekst op donker thema | Contrastcontrole voor custom donkere thema's | Chromium dark/light wissel |
| `Extra opties` raakt buiten beeld | Schuifbare inhoud + blijvende knoppen onderaan | Chromium modal-scroll |
| Smalle instellingentabs | Instellingentabs op 2 kolommen | Chromium |
| Herinnering invoeren | Beveiligde scrollende wizard, betere footer | Broncodecontrole; echt toetsenbord nog testen |
| iOS terugknop | Verlaat eerst modal/menu/tab, secundaire pagina terug naar werkruimte | geautomatiseerde navigatietest |
| Altijd menu/inloggen | Menu is géén uitloggen; onthouden en laatst geopende werkruimte/tab | sessie- en navigatietest |
| Verschillende accounts | Laatste werkruimte/tab wordt bij andere gebruiker niet hergebruikt | geautomatiseerde navigatietest |

## Nog testen op de echte iPhone vóór productie
1. Op een echt iPhone-scherm met statusbalk/Dynamic Island: alle 5 tabbladen en thema's.
2. Keyboard openen, datum/tijd kiezen, herinnering opslaan/bewerken en teruggaan.
3. Afbreken van een wizard, wisselen van tabs zonder verlies van invoer.
4. App afsluiten/heropenen, wisselen naar Family, terug naar Privé, uitloggen, onthouden uit.
5. Visuele contrastcontrole van alle eigen kleurcombinaties en Family-schermen.
6. Pas na Apple StoreKit serververificatie, APNs en security/aankooptests: klantrelease.

## Lokaal uitvoeren
`npm run check:all` — voert broncontrole, sessie- en navigatietests uit. Geen internet nodig voor de controles.
`npm run audit:release` — stopt bewust omdat klantrelease nog NIET gereed is.
