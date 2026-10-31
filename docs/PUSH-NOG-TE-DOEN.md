# Native push en betrouwbare herinneringen — nog niet aangesloten

`www/prive/sw.js` en `www/family/sw.js` regelen webpush in de browser. De Capacitor iOS-app kan dit **niet** gebruiken als vervanging voor APNs.

1. Voeg `@capacitor/push-notifications` toe, voer `npx cap sync ios` uit, activeer de Push Notifications capability en controleer in de gegenereerde `AppDelegate.swift` de twee callback-methoden (zie Capacitor-documentatie).
2. Vraag alleen toestemming als de gebruiker expliciet meldingen inschakelt. Toon begrijpelijk waarom en wat er gebeurt bij weigering.
3. Registreer APNs device tokens bij Supabase uitsluitend achter JWT-authenticatie; gebruik voor databasewrites RLS. Behandel tokenrotatie en logout; tokens zijn geen identificatie- of authenticatiebewijs.
4. Maak een server-scheduler die herinneringen en taakmeldingstijden selecteert met de **oorspronkelijke tijdzone**; gebruik idempotente verzend-ID's, voorkom dubbele notificaties.
5. Stuur via APNs vanuit een beveiligde server met beschermd Apple secret; niet vanuit JavaScript of iPhone.
6. Test op een echte iPhone: achtergrond, vergrendeld scherm, toestemming geweigerd, zomer-/wintertijd, opnieuw aanmelden, reminder verwijderd, herhaling en offline gedrag.
7. Verleen geen reminder- of betaalrechten op basis van clientstatus.

Documentatie: https://capacitorjs.com/docs/apis/push-notifications
