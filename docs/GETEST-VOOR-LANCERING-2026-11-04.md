# JustAReminder — register eerder uitgevoerde tests
Datum documentatie: 4 november 2026

Dit document voorkomt dat eerder uitgevoerde teststappen telkens opnieuw aan de eigenaar worden gevraagd. Het maakt onderscheid tussen **gezien in oudere projectgesprekken**, **historisch bevestigd door databasegegevens**, **door eigenaar bevestigd op echte iPhone** en **nog niet bewezen**. Het is géén vrijgave voor productiebetalingen of App Store-publicatie.

## A. Mollie TEST — historisch uitgevoerd
Bronnen: projectgesprekken “Mollie SEPA-goedkeuring”, “Stap 12 proefbetaling” (stappen 9 t/m 14.49) en een door eigenaar aangeleverd bestand “Stap 12 proefbetaling.txt”.

- **Mollie-testcheckout voor Privé Premium € 9,99:** stap 14.38 toont een TEST-checkout-URL, `test: true`, `planCode: private_premium` en `productie_rechten_gewijzigd: false`. Dit bewijst dat checkout-creatie werkt, niet dat specifiek die checkout is betaald.
- **Opzegging oud testabonnement € 7,99:** stap 14.48c is gerapporteerd als GESLAAGD met `mollie_status: canceled`, `supabase_status: canceled` en synchrone testdatabase.
- **Opnieuw abonneren na de betaalperiode:** stap 9 gaf `opnieuw_abonneren_na_betaalperiode=JA`, bij `prive_betalingen_aan=false` en `rechten_aan=false`. Een servercontrole, niet noodzakelijk een echte hernieuwde afschrijving.
- **Testschakelaars:** eerdere antwoorden melden dat Mollie live-rechten en Privé/Family betaal-/limietschakelaars uit stonden op het testmoment.

### Databankcontrole op 4 november 2026 (alleen geaggregeerde aantallen)
- `jar_mollie_test_subscriptions`: **7** records: **2 canceled met betaalde eerste termijn**, **2 active met betaalde eerste termijn**, **2 first_failed/failed** en **1 first_failed/open**.
- `jar_mollie_test_subscription_payments`: **4** eerste termijnbetalingen met `status=paid`.
- `jar_mollie_test_payments`: **3** losse testbetalingen: **1 paid**, **2 expired**.
- Deze records zijn TEST-records. Twee actieve testabonnementen hoeven niet te betekenen dat een productieabonnement actief is. Testrecords niet wissen of automatisch opnieuw starten.

### Niet opnieuw testen zonder concrete aanleiding
- Basisopbouw Mollie TEST-checkout.
- Standaard Mollie TEST-betaling en terugschrijven naar Supabase.
- Bewezen testabonnement-opzegging (dezelfde scenario-uitkomst).
- Basale veilige betaal-/rechten-schakelaars uit.

### Nog niet bewezen door deze bronnen
- **€ 9,99 checkout uit stap 14.38 zelf ook betaald**.
- **Privé Premium → Family-overstap zonder dubbel abonnement**. Dit stond in stap 14.49 als geplande volgende test.
- Volledige productie-Mollie-levenscyclus; productiebetalingen blijven uit.

## B. Native iPhone APNs en geplande herinneringen
- **APNs-registratie:** geslaagd op iPhone; bevestiging in eerdere schermopname en projectgesprek.
- **Handmatige APNs-testmelding:** eigenaar bevestigde daadwerkelijk ontvangen push.
- **Geplande automatische herinnering:** eigenaar bevestigde uitdrukkelijk dat deze reeds uitvoerig waren getest en werkten.
- Deze scenario's **niet opnieuw als basisvoorwaarde aanvragen**, behalve bij een gerichte regressiefout.

## C. iPhone UX, login en navigatie
- Eigenaar heeft dashboard, agenda, lijst, instellingen, inlogschermen en beide taak-invoermethoden doorlopen en schermafbeeldingen/-opnamen gedeeld.
- Het **nieuwe iPhone-design** is door eigenaar op 4 november als prettig beoordeeld.
- De oversized knop `← Vorige` werd daarna door broncodewijziging vervangen door **alleen `←`**; wijziging staat op `main`, maar is niet in dat eerdere toestelbeeld bewezen.
- Laatste e-mailadres onthouden werd in eerdere opname waargenomen; dit is **geen volledige accountwissel- of sessieverlooptest**.
- Scrollen met open toetsenbord was eerder een bewezen bug; correcties aangebracht, maar **geen definitieve, volledige, fysieke Privé/Family-regressie over alle velden vastgelegd**.

## D. Andere uitgevoerde technische activiteiten
- Android/Chrome-PWA-installatie in browser werd eerder geprobeerd en werkte wanneer vanuit Chrome geïnstalleerd; website-downloadroute gaf eerder een foutmelding. Geen claim dat alle Android-stromen definitief geslaagd zijn.
- Family- en Privé-dashboard, limieten, agendapresentatie, eenmalige en terugkerende herinneringen zijn herhaaldelijk besproken en handmatig getest; geen volledig gedateerd end-to-end bewijsregister beschikbaar.
- Smart Engine is door eigenaar uitgebreid handmatig getest, met kanttekeningen over het herkennen van taken/herinneringen en wijzigbaarheid. **AI-uitbreiding is bewust uitgesteld tot na de eerste lancering.**

## E. Apple StoreKit — onderscheid met Mollie
- Supabase: `sandbox_test_enabled=true`, `production_purchases_enabled=false`, `production_rights_enabled=false`.
- Apple-verificatiefuncties zijn beschikbaar, maar op 4 november 2026 telde `jar_apple_iap_transactions` **0** records. Er is **geen bewezen Apple Sandbox-aankoop** of herstel in deze testgeschiedenis.
- Apple StoreKit is daarom een **echte openstaande betaaltest**, anders dan Mollie TEST.
- Apple Sandbox-producten en abonnementsgroepen in App Store Connect moeten nog worden bevestigd.

## F. Publicatievoorwaarden (niet verwarren met herhalen van bestaande tests)
- Accountverwijdering met bestaande betalingen, Apple-abonnementen en gegevensretentie end-to-end veilig controleren.
- Supabase Security Advisor en privacy-/voorwaardenlinks controleren.
- App Store Connect-metadata, screenshots, leeftijdsclassificatie en reviewaccount controleren.
- Alleen nog de ongeteste/veranderde UI-stromen nalopen; geen herhaling van bewezen APNs of Mollie TEST-basics.
- Productiebetalingen, rechten en publicatie **nooit** zonder expliciete eigenaarstoestemming inschakelen.

## Wijzigbeleid
Markeer historische tests als `reeds getest`, `gedeeltelijk bewezen` of `nog niet getest` en vraag uitsluitend bewijs voor het ontbrekende deel. Een historische test geldt niet automatisch als bewijs dat een later gewijzigde iPhone-build identiek werkt. 
