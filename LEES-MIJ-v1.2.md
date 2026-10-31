# JustAReminder iOS v1.2 — TestFlight-reparatie

**Gebaseerd op de eerder werkend geüploade v1.1-projectmap.** Deze code wijzigt alleen het iOS-webpakket en de Codemagic-testbuild. De bestaande live website en het Supabase-schema zijn niet gewijzigd.

## Aangepast

1. **Laatste account / ruimte**: bij het starten via het appicoon opent de iOS-app automatisch het laatste gebruikte Privé- of Family-dashboard, mits er nog een geldige lokale Supabase-sessie beschikbaar is. Zonder sessie verschijnt het keuzemenu of de inlogpagina.
2. **'Ingelogd blijven'** op zowel Privé- als Family-inlogscherm (standaard aan voor bestaande gebruikers). Je wachtwoord wordt niet apart opgeslagen. Aangevinkt gebruikt de sessie de bestaande WebView-localStorage; uitgevinkt gebruikt de sessie sessionStorage zolang die browsersessie bestaat. Dit is **geen garantie** dat iOS de sessie bij élke beëindiging behoudt, en is nog niet hetzelfde als Keychain-opslag.
3. **'Terug naar menu'** in de dashboardnavigatie en op de Meer-pagina. Daarmee wissel je tussen Privé en Family zonder uit te loggen. Uitloggen blijft een aparte actie.
4. **iPhone-weergave**: extra ruimte bovenaan voor de statusbalk/Dynamic Island, betere hoogte en scrollgedrag van de taakwizard bij het schermtoetsenbord.
5. **Nieuwe taak**: passende omschrijvingen en geen ongevraagde push-/herhaalnotificatie wanneer op iOS een nieuwe taak wordt gestart. Een klant moet zelf een melding kiezen, en datum+tijd zijn vereist voor terugkerende notificaties.
6. **Technische testteksten**: verwarrende Supabase/Mollie/webpush-details worden in de iOS-schermen vervangen door een duidelijke teststatus; de echte toegangsrechten worden hierdoor niet aangepast.
7. **Build 3**: Codemagic bereidt iOS versie 1.0 (3) voor, met interne TestFlight-upload. Build 1 en 2 blijven bij Apple staan.

## Niet op te lossen met alleen deze bestanden

- Werkende **Apple-in-app-betalingen** vereisen native StoreKit-koppeling, server-side transactiecontrole en rechtenverwerking in Supabase. Betalingen blijven bewust uitgeschakeld.
- Werkende **iPhone-pushmeldingen** vereisen APNs, device-tokenregistratie en server-side verzending. De app mag dit niet als werkend presenteren.
- Gebruik van **iOS Keychain** voor sessietokens is nog niet geïmplementeerd. De huidige oplossing gebruikt Supabase-websessies in de WebView.
- De native iOS tijdkiezer kan 12-uursnotatie tonen wanneer de iPhone daarvoor ingesteld staat; dat valt onder iOS-instellingen. Het dataveld blijft intern 24-uurs `HH:MM`.

## Installatie via GitHub-web (NIET eerst bestanden verwijderen)

1. Pak `JustAReminder-iOS-v1.2-alleen-wijzigingen.zip` uit met **Alles uitpakken**.
2. Open de uitgepakte map, selecteer **de volledige inhoud**, inclusief de mappen `www` en `scripts`.
3. Ga in je bestaande `JustAReminder-ios` repository naar de **hoofdmap** → **Add file → Upload files**.
4. Sleep de geselecteerde bestanden **met hun mappen**. Controleer dat er `www/ios/native-session.js`, `www/prive/inloggen.html`, `scripts/test-ios-session.mjs` én `codemagic.yaml` tussen staan. Dus géén losse `inloggen.html` bovenaan.
5. Klik op **Commit changes**. **Verwijder of vervang niet je bestaande mappen** `docs` en `ios-source`.
6. Voer één keer de Codemagic-workflow `JustAReminder - v1.2 TestFlight sessie en iPhone-verbeteringen` uit, nadat de GitHub-upload klopt. Codemagic voert vóór compilatie de controles uit.
7. Controleer bij Apple TestFlight build **1.0 (3)**, rond zo nodig de exportcompliance af en koppel hem aan `JustAReminder Intern`. Werk daarna bij via TestFlight.

## Handmatige test op iPhone

- Log in bij Privé met 'Ingelogd blijven' aan. Sluit de app en open opnieuw: moet naar Privé gaan.
- Via 'Meer → Terug naar menu': kies Family. Als jouw account toegang heeft, opent Family; bij herstart moet Family het laatst gebruikte dashboard zijn.
- Terug naar menu en naar Privé wisselen, zonder het wachtwoord opnieuw in te voeren zolang de sessie geldig is.
- Meld je bewust af: bij opnieuw starten mag je niet zonder sessie in het dashboard komen.
- Meld je aan met 'Ingelogd blijven' uit: test gedrag na beëindiging van de WebView/app.
- Maak een nieuwe taak zonder melding; controleer dat de keuze 'Geen melding' blijft staan. Controleer daarna handmatig gekozen notificatie met datum en tijd.
- Open en sluit de taakwizard met toetsenbord en controleer knoppen/tekst bij Dynamic Island; controleer op iPhone-formaten en donkere modus.
- Controleer dat Apple-betalingen en native push nergens ten onrechte als werkend worden voorgesteld.

**Belangrijk:** statische tests slagen, maar daadwerkelijke functionaliteit op iPhone en server moet nog via TestFlight worden gecontroleerd vóór publieke verkoop.
