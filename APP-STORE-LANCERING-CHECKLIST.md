# JustAReminder – preflight App Store (1 november 2026)

Dit is een momentopname uit de gekoppelde GitHub-repository en Supabase.
**Geen toestemming tot een openbare release is uitgevoerd; geen betalingen zijn gewijzigd.**

## 1. Formulierbug – fix voorbereid

- Oorzaak: de bestaande CSS-selector voor Slim invoeren `input:not([type=color])` omvat ook checkboxes, waardoor 100%-breedte en min. 48 px op de kleine vakjes terechtkomen.
- `fix-family-mobile-forms.mjs` maakt hiervan `input:not([type=color]):not([type=checkbox]):not([type=radio])`.
- Gerichte responsieve stijl voor:
  - Slim invoeren: Family-zichtbaarheid en taaktoewijzing.
  - Normale taak- en herinneringenwizard: ontvangers en taaktoewijzing.
  - Routine- en berichtontvangers.
- Mobiele weergave: één kolom, 21px-vakjes, namen ernaast, geen horizontale overflow.
- Werking getest op nagemaakte formulieren bij 320, 375, 430 en 768 px. **Echte app op iPhone nog testen na nieuwe build.**
- De Privé-wizard bevat geen Family-ledenkeuze en heeft deze specifieke fout dus niet.
- Het pakket past het Family-HTML-bestand **tijdens Codemagic** aan. Om de website ook te wijzigen moet het HTML-bestand in de website-repository worden gewijzigd en gedeployed.

## 2. Blokkers vóór een betaalde openbare App Store-launch

| Onderdeel | Bevestigde status | Volgende actie |
| --- | --- | --- |
| iOS APNs test en automatische herinnering | Werkende iPhone-proeven gemeld; Edge Function en minuutplanning actief | Test meerdere gebruikers, Family-toewijzing, offline, herhaalde taak, dubbele meldingen, accountwisseling |
| StoreKit 2 Apple-abonnementen | `iosPurchasesReady: false`; acht Apple-productregels aanwezig, nul voor aankoop ingeschakeld; geen aankopen in ledger; geen `jar-apple-verify` of Apple Server Notifications V2-functie operationeel | Apple-producten App Store Connect, aankoop/restore, JWS-verificatie op server, rechten, refunds, expiratie, upgrades/downgrades, servernotificaties, Sandbox/TestFlight |
| Release-audit | `scripts/audit-release.mjs` bevat fail-closed checks die niet gehaald kunnen worden in de huidige bronstatus | Pas na aantoonbare tests en geldige implementatie vrijgeven; gate niet omzeilen |
| Native aankoopguard | `www/ios/ios-checkout-guard.js` onderschept oude Mollie-acties; `www/ios/paywall.js` toont momenteel alleen een placeholder, geen actieve aankoop | Werkende StoreKit-koopinterface toevoegen vóór betaalde iOS-lancering |
| Gegevensbescherming | Accountverwijdering, privacyverklaring, bewaartermijnen, RLS, support, privacylabels niet end-to-end gevalideerd | Leg vast en bewijs de werking, incl. data deletion en in-app account deletion |
| Apple reviewinformatie | Status niet automatisch inzichtelijk via GitHub/Supabase | Controleer App Store Connect: naam/omschrijving, screenshots, privacy-URL, support-URL, leeftijdscategorie, demo-login, review notes, contactgegevens |
| EU DSA trader | Status in Apple-account niet geverifieerd | Verifieer handelsstatus/contactgegevens volgens Apple; geen persoonsgegevens delen in broncode |
| Apple Developer-overeenkomst | Screenshot liet vernieuwde overeenkomst zien met deadline 14 nov 2026 | Controleren of de overeenkomst geaccepteerd is |
| iOS build | Codemagic maakt IPA en uploadde build 16 naar Apple; Xcode 26.x | Test volgende build met gerepareerde UI; controleer APNs entitlement, signing en crashlogs |

## 3. Betalingen: zorgvuldig onderscheid

- Apple IAP blijft uit; er is geen iOS-abonnementsverificatie operationeel.
- In Supabase zijn de bestaande private- en Family-betalings- en handhavingsschakelaars **true**, en `jar_mollie_live_rights_settings.enabled` is **true**. Dit is uitsluitend een statuswaarneming, geen wijziging. Controleer afzonderlijk of de feitelijke Mollie-productiecheckout en live-rechten overeenkomen met het bedoelde commerciële beleid.
- De bestaande Mollie-webbetalingen en klantgegevens blijven behouden. De iOS-app mag digitale aankopen niet rechtstreeks via oude Mollie-webcheckout aanbieden zonder toepasselijke App Store-regels en eventuele specifieke EU-entitlements te regelen.
- Pas geen betaal- of rechtenflag aan zonder afzonderlijke gecontroleerde beslissing.

## 4. Aanpak naar de App Store

1. Upload de drie pakketbestanden naar de GitHub-root en laat Codemagic de iPhone-layoutfix in TestFlight bouwen.
2. Test Family Slim invoeren, taaktoewijzing, zichtbaarheid en gewone taak/herinnering op echte iPhone met meerdere gezinsleden. Test vervolgens Privé-wizard; wijzig/sla op, sluit/open de app, test toetsenbord en scroll.
3. Rond Apple StoreKit 2 + serververificatie en Apple abonnementsrechten af, inclusief herstel van aankopen, server-to-server notificaties en foutgevallen. Houd aankopen dicht totdat dit werkt.
4. Test APNs van accounts A/B en Family-ontvangers en waarborg privé-isolatie, herhaling en geen dubbele meldingen.
5. Verifieer accountverwijdering, appprivacy, RLS, de inlog- en herstelflow en dataexport/retentie waar vereist.
6. Maak App Store Connect metadata, screenshots, review-login, leeftijdscategorie, privacybeleid, supportpagina, DSA handelaar en overige afspraken af.
7. Voer de release-audit uit met aantoonbare bewijzen; alleen na geslaagde audit en expliciete finale goedkeuring indienen ter beoordeling.

## 5. Apple-bronnen

- Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Review demo-account: https://developer.apple.com/help/app-review/before-submitting-for-review/complete-review
- EU trader/Digital Services Act: https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements
- SDK vereisten: https://developer.apple.com/news/upcoming-requirements/

**Dit pakket maakt geen App Store-publicatie en zet geen Apple- of Mollie-betaling aan.**
