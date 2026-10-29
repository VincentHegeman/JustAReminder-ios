# JustAReminder v1.1 — reparatie op iOS-bronproject

Dit pakket is gebaseerd op het door jou aangeleverde `JustAReminder-iOS-GitHub-startpakket` (bronbestanden van 28 oktober 2026). `codemagic.yaml` is gebaseerd op je werkende upload-workflow. Er is **geen toegang geweest tot latere wijzigingen in je privérepository**; controleer of die na 28 oktober buiten YAML zijn gewijzigd.

## Direct aangepast

- `www/ios/native-fixes.css` + `.js`: veilige iPhone-bovenmarge (Dynamic Island), invoervelden (16px), betere modals en toetsenbordscroll, native-appherkenning, verwijderen van onjuiste installatieknoppen. Behoud pinch-zoom voor toegankelijkheid.
- Privé: bij het aanmaken van een **taak** verschijnen passende veldnamen, schermtitels, knoppen en opslaanmelding; de gekozen soort blijft `task` in de bestaande gegevensstroom.
- Family: standaloneherkenning werkt ook binnen Capacitor.
- Minder technische betalingstekst voor eindgebruikers.
- `@capacitor/keyboard` toegevoegd. De iPhone-toetsenbordwerkbalk kan waar ondersteund verborgen worden.
- Echte JustAReminder-icoonafbeelding uit je eigen Privé-assets, automatisch toegepast op de gegenereerde iOS AppIcon in Codemagic.
- Buildnummer 2 (aanpasbaar met `JAR_IOS_BUILD_NUMBER`), zodat TestFlight build 1 niet wordt overschreven.
- Betaling via Mollie blijft in de iOS-app afgevangen. `iosPurchasesReady` blijft bewust **false**.

## Nog niet daadwerkelijk opgelost (server/Apple-inrichting nodig)

- **Apple in-app abonnementen:** je `ios-source/JARStoreKitPlugin.swift` is nog niet geregistreerd in Xcode. Voor echte aankopen ontbreekt bovendien Supabase serververificatie van Apple-transacties, refund/renewal-notificaties en veilige entitlement-koppeling. Een UI-script mag betaalrechten niet zelf activeren.
- **Native iPhone-push:** voor betrouwbare push is APNs, iOS capability, tokenregistratie met toestemming, een veilige Supabase/Edge scheduler en een server met APNs-verzending vereist. Deze update maakt geen misleidende belofte dat meldingen al werken.
- **Datum-/tijdkiezer:** native iOS pickers gebruiken soms de **toesteltaal** voor AM/PM en kalender. Dit kan niet voor alle landen worden geforceerd met alleen de HTML-lang; 24-uurs UI vraagt een eigen picker of OS-instelling.
- **Overige taalvelden:** niet elke vertaling van de uitgebreide dashboards is opnieuw gecontroleerd.
- **Dashboardgedrag:** mobiel CSS-fix is statisch gecontroleerd; iPhone-interacties (scroll, pinch, save/edit) vereisen nog een echte toesteltest.

## Installeren (niet de bestaande website aanpassen)

1. **Eenvoudigste op Windows (met Git geïnstalleerd):** pak `JustAReminder-iOS-v1.1-alleen-wijzigingen.zip` uit en dubbelklik `PAS-REPARATIE-TOE.bat`. Dat haalt je privé-repo op, controleert lokale wijzigingen, plaatst uitsluitend de veranderde bestanden en vraagt expliciet vóór het uploaden. Zonder Git kun je de mapstructuur handmatig op GitHub uploaden.
2. Het volledige `JustAReminder-iOS-v1.1-reparatie.zip` bevat eveneens het hele project; gebruik liever het ZIP met alleen wijzigingen als je repo al bestaat.
3. Controleer de GitHub-commit. Let op: als je automatische builds in Codemagic hebt aangezet, kan een push toch direct een build starten.
4. Het testscript draait in Codemagic tijdens een volgende build, of lokaal met `npm run check:iosfix`. Het verwijdert geen gebruikersdata.
5. **Start pas één nieuwe Codemagic-build wanneer de aanpassingen zijn beoordeeld en de overige openstaande onderdelen duidelijk zijn.** De YAML uploadt bij een geslaagde build naar App Store Connect/TestFlight, maar publiceert niet openbaar.

## Veiligheid

Geen SQL-migraties, geen wijzigingen aan Mollie-live, geen Apple-betalingsactivatie, geen Supabase-service-role in de client, geen productie-data gewist. Voor app-store-publicatie moeten native push en Apple-IAP (of het weglaten van betaalde aanbiedingen) afzonderlijk worden afgerond.
