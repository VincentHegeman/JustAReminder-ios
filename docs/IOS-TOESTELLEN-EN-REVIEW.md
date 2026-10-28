# Apple iOS: benodigde stappen na het openen in Xcode

- iOS app Bundle ID moet exact `eu.justareminder.app` zijn.
- Apple Developer Team kiezen, Xcode automatic signing inschakelen.
- iOS minimum moet compatibel zijn met Capacitor 8; Xcode 26 of hoger volgens Capacitor-documentatie (controleer op Mac).
- Xcode iPhone Simulator testen en een echte iPhone met TestFlight gebruiken.
- Privacy/Camera/Photo library strings in Info.plist toevoegen als de agenda/OCR-scanner native camera/foto gebruikt.
- Associated Domains: Universal Links AASA publiceren op https://www.justareminder.eu/.well-known/apple-app-site-association voordat links worden geactiveerd; Family invite-link nog niet bekend.
- Push Notifications: APNs-tokenregistratie, Supabase backend, permissies en herinneringenplanning moeten nog worden geïmplementeerd. De oorspronkelijke webpush via service workers is hiervoor NIET genoeg.
- Sign In with Apple: capability alleen is geen werkende login; Supabase OAuth/redirects en accountkoppeling moeten worden getest.
- De StoreKit Swift-bestanden in ios-source zijn bronvoorbeelden en NIET gekoppeld aan de UI. Pas activeren na serververificatie.
- Bestaande Mollie-transacties: niet vanuit iOS starten; web blijft op www.justareminder.eu draaien.
- Apple review screenshots mogen pas gemaakt worden van de werkelijk draaiende iOS-app. Dit startpakket is niet geschikt voor publicatie.
- Test: login, logout, reset wachtwoord, agenda, OCR, Privé en Family, 8 IAP-producten sandbox, herstelaankopen, notificaties in achtergrond, tijdzones en app-privacy.
