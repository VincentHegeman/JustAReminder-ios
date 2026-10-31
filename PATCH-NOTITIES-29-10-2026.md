# JustAReminder iOS – patchnotities 29-10-2026

Aangepast op basis van de gemelde iPhone-problemen en screenshots.

## Gefixt

1. **iOS / native sessie onthouden verbeterd**
   - onthouden van ingelogd blijven op toestel
   - laatste account + laatste bruikbare pagina wordt onthouden
   - vanuit het hoofdmenu en na opnieuw openen keert de app terug naar de laatste route

2. **Terug-navigatie voor iOS verbeterd**
   - extra `← Vorige` knop op secundaire pagina’s
   - `← Terug naar menu` toegevoegd zonder uit te loggen
   - terugvalroute gaat naar de laatste bekende pagina i.p.v. onnodig naar het hoofdmenu

3. **Mobiele header / witruimte bovenin compacter gemaakt**
   - minder lege ruimte onder iOS statusbalk
   - compactere bovenkant op mobiel
   - notificatieknop die toch nog niet werkt wordt op mobiel verborgen

4. **Modals / sheets op iPhone verbeterd**
   - onderbladen openen netter vanaf onderen
   - betere scroll binnen modal
   - sticky footer met veilige ondermarge
   - beter gedrag met iOS toetsenbord

5. **Extra opties / tabs verbeterd**
   - tabknoppen zoals `Kleuren & sfeer` wrappen netjes
   - betere layout op smalle schermen

6. **Taak vs herinnering in invoer verbeterd**
   - titel en copy wisselen duidelijker mee
   - taak zet melding standaard uit

## Belangrijkste bestanden
- `www/ios/native-session.js`
- `www/ios/native-fixes.js`
- `www/ios/native-fixes.css`
- `www/index.html`
- `www/prive/inloggen.html`
- `www/family/index.html`

