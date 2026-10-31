# JustAReminder — klantlancering: GO / NO GO

## Uitkomst op 29 oktober 2026: NO GO

De app is installeerbaar via TestFlight. **Niet openbaar publiceren voor betalende klanten.** De iOS bron bevat nog een expliciet uitgeschakelde Apple-aankoopfunctie en heeft geen aangesloten APNs-backend. De Codemagic-workflow publiceert niet openbaar. De bestaande website en Mollie-betalingen zijn **niet aangepast**.

## Wat is in v1.3 gerepareerd?

- De automatische start bevestigt bij Supabase dat het laatst opgeslagen account nog een geldige sessie heeft, in plaats van alleen op lokale sessiedata te vertrouwen.
- Netwerkuitval krijgt in de iOS-app een duidelijke waarschuwing, zonder onterecht op te slaan.
- Browser-`localhost` wordt niet meer automatisch als een echte geïnstalleerde native app herkend.
- Abonnementen tonen informatie en doen geen onbeveiligde aankopen; technische betaalstatus wordt niet als 'account actief' voorgesteld.
- Het wachtwoordherstel legt uit dat de herstel-link mogelijk in de browser opent.
- Buildnummer 4 staat klaar, maar **start geen extra build voordat de andere blokkades opgelost en getest zijn**.
- Nieuwe automatische broncontrole (`npm run audit:source`) en bewust falende klant-releasecontrole (`npm run audit:release`).

## Wat moet echt werken vóór openbaar gaan?

1. **Apple IAP:** alle 8 bestaande product-ID's ophalen; prijzen rechtstreeks via StoreKit; aankoop en hersteltransacties; serververificatie van Apple JWS; rechten in Supabase; refunds, verlopen en gewijzigde abonnementen; abonnementen en extra bundels niet door elkaar halen; herstellen van aankopen; lokaal geteste sandbox-scenario's. App Store-producten en groepsvolgorde controleren. Geen betaalrechten op basis van JavaScript.
2. **Push:** Push Notifications capability in Apple Developer; APNs authenticatie op server; apparaat-tokenregistratie per ingelogde gebruiker; toestemmingsscherm; verplaatsen/verwijderen van tokens bij logout; herinneringsscheduler met tijdzone/DST; iPhone op voorgrond, achtergrond, uitgelogd en offline testen. Geen claim 'meldingen werken' zolang dit niet betrouwbaar is.
3. **Supabase:** Row Level Security en `SECURITY DEFINER` RPCs apart laten auditen op volledige tabellen. Test twee echte gebruikers: zij mogen elkaars private taken, familienotities en facturen niet kunnen lezen of aanpassen. Backup/restore en rate limits controleren.
4. **Apple-review:** privacyverklaring in de app, juiste URL en App Privacy-labels, voorwaarden, accountverwijdering inclusief abonnementen, echte screenshots, beschrijving, ondersteuning, demo-inlog voor reviewer, locatie/tijdzones/vertalingen, leeftijdsclassificatie en contactgegevens. Alle demo/testteksten uit de klantapp verwijderen.
5. **Toesteltests:** aanmaken, wijzigen, voltooien, verwijderen, agenda, tijdzones (o.a. Nederland zomertijd), Privé ↔ Family, e-mailherstel, inlog onthouden aan/uit, terug naar menu, app geforceerd afsluiten, netwerkverlies, toetsenbord, kleine iPhones en iPads. Screenshot/video als bewijs.
6. **Facturatie:** voorwaarden voor maandelijks/jaarlijks, extra bundels, opzegging, btw-weergave en customer support moeten overeenkomen met de werkelijke Apple-producten en prijsinformatie.

## Gebruik zonder per ongeluk te publiceren

- `npm run audit:source` controleert de iOS-broncode.
- `npm run audit:release` toont **NO GO** zolang backend, Apple/Push en aantoonbare tests ontbreken; zet geen vlaggetjes om dit te omzeilen.
- `codemagic.yaml` kan een TestFlight-IPA maken maar bevat `submit_to_app_store: false`. Nieuwe TestFlight-build is alleen nuttig wanneer de code inhoudelijk is gewijzigd en gecontroleerd.
- Zet geen privé Apple .p8 of Supabase service-role in GitHub of `www/`.
- Het bestand `docs/RELEASE-GOEDGEKEURD.json` mag pas aangemaakt worden met echte, gedateerde testbewijzen; een lege/dummy verklaring maakt de app niet veilig.

## Direct aanbevolen volgorde

Eerst Supabase-database/RLS inventariseren en Apple-IAP-verificatie implementeren; daarna APNs en scheduler; vervolgens volledige UAT en App Store-metadata. Dit pakket alleen maakt de app **niet klantklaar**.
