# Apple-betalingen: functioneel ontwerp, nog niet aangesloten

## Uitgangspunt
- Bestaande product-ID's staan in `www/ios/product-catalog.js` en `docs/APPLE-PRODUCT-ID-REGISTER.csv`; controleer ze met App Store Connect.
- De Swift-file `ios-source/JARStoreKitPlugin.swift` is **alleen een los voorbeeld** en wordt niet automatisch geladen. Zet hem niet live zonder een beveiligde backend. De methode `finishAfterServerVerification` accepteert op zichzelf geen serverbewijs.
- App Store-producten zitten in twee abonnementsgroepen (basis Privé/Premium, extras +50/100/150/200). Een klant kan naast een basisabonnement een extra-abonnement hebben. Verlopen/annuleren moet elke groep apart afhandelen.

## Vereiste technische stappen
1. Registreer de StoreKit 2-bridge echt als Capacitor-plugin voor de gebruikte Capacitor 8 / SPM iOS-build, of kies een gecontroleerde bestaande StoreKit-plugin.
2. Haal werkelijke Apple-producten en lokale prijzen uit StoreKit. Laat correcte duur, automatische verlenging, voorwaarden en privacy zien.
3. Leg een `appAccountToken` (UUID) veilig vast voor de ingelogde Supabase-gebruiker om aankoop naar account te koppelen. Maak geen account-toewijzing op basis van een willekeurige onbewezen client-string.
4. Controleer `signedTransactionInfo` aan de serverzijde met de **Apple App Store Server Library**, tegen Apple's root-certificaten en het juiste Bundle ID, product, omgeving, transactie-ID, expiry/revocation en app-account-token. Wees idempotent bij herhaling.
5. Verwerk App Store Server Notifications **V2** (renewal, renewal failure, refunds, revocations, grace period) in een beveiligde Edge Function. Verleen en trek rechten uitsluitend aan de serverkant in, nooit alleen vanuit JavaScript.
6. Maak `Herstel aankopen` en `Beheer abonnement` bereikbaar en laat bestaande abonnementrechten correct zien. Voorkom dubbel kopen in dezelfde groep.
7. Test Sandbox maand, jaar, bundels, upgrades/downgrades, refund, opnieuw installeren, ander toestel, opzegging en verlopen. Verifieer gevolgen in Supabase.
8. Vraag Apple-review aan voor alle relevante abonnementen samen met de eerste appversie. Controleer fiscale, geografische en juridische gegevens.

De live Mollie-webflow blijft apart. Schakel niet zomaar Mollie-abonnementen om naar Apple of andersom.

Documentatie: https://developer.apple.com/documentation/storekit/ en https://developer.apple.com/documentation/appstoreservernotifications/
