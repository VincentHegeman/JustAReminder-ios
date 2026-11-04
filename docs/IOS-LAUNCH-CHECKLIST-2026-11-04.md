# JustAReminder — iPhone en App Store afrondechecklist (4 november 2026)

Dit document is een veiligheids- en acceptatielijst. Een GitHub-commit of geslaagde IPA-build bewijst niet dat de app klaar is voor betalende klanten.

**Voorkom dubbel testen:** raadpleeg eerst [GETEST-VOOR-LANCERING-2026-11-04.md](GETEST-VOOR-LANCERING-2026-11-04.md) voor de reeds door de eigenaar uitgevoerde Mollie-TEST-, APNs- en dashboardtests. Apple StoreKit-Sandbox blijft een afzonderlijke openstaande betaaltest.

## Gereed in de broncode (nog op echt toestel verifiëren)
- [x] Native-only mobiele visuele laag voor Privé en Family in `www/ios/launch-design.css`.
- [x] CSS wordt ná de omvangrijke bestaande inline dashboardstijlen geladen.
- [x] Native APNs-bediening staat onder **Meer**; oude web-pushpanelen verborgen in de iPhone-app.
- [x] IPhone-werkbalk van het toetsenbord hersteld; het formulier heeft een eigen scrolgebied.
- [x] Broncodecommit en buildnummer kunnen worden getoond onder Meer; Codemagic schrijft `build-info.json`.
- [x] StoreKit sandbox-testknoppen uitsluitend voor TestFlight voorbereid. Productiebetalingen blijven uit.
- [x] JS-syntaxis en nieuwe broncontroles nagekeken.

## Bewezen op fysieke iPhone (gebruikerswaarneming)
- [x] Native APNs-testmelding ontvangen.
- [x] Automatische herinneringsmeldingen reeds getest volgens eigenaar.
- [ ] Visuele herwerking met toetsenbord open in Privé én Family.
- [ ] Invoer in beide modi, wijzigen, afvinken, datum/tijd, navigatie en donkere thema's na één nieuwe IPA.
- [ ] Laatste account, uitloggen en accountwissel na geforceerd sluiten.

## Apple betalingen — harde publicatieblokkade
- [x] Supabase-functies `jar-apple-verify`, `jar-apple-notifications`, `jar-apple-reconcile` aanwezig.
- [x] Database: `sandbox_test_enabled=true`, `production_purchases_enabled=false`, `production_rights_enabled=false`.
- [x] Acht Apple-product-ID's in de database en productcatalogus.
- [x] Production purchase gate blijft uit; productiebuild kan niet via de sandbox-installer starten.
- [ ] Producten, prijzen, belasting/landinstellingen en subscription groups in App Store Connect verifiëren.
- [ ] Echte **Sandbox** maand/jaar aankoop, annulering, herstel, verlenging, afloop, restitutie en server-toekenning op fysieke iPhone valideren; geen bestaande Mollie-rechten overschrijven.
- [ ] Bij sandbox-rechten verifiëren dat geen productierechten worden toegekend.
- [ ] Pas na gecontroleerde serverrechten en expliciet akkoord een aparte productieconfiguratie bouwen. Nooit de testconfiguratie aan de App Store aanbieden.

## Privacy, veiligheid en App Review — voor publicatie
- [ ] Supabase Security Advisor: 53 voor `authenticated` uitvoerbare `SECURITY DEFINER` functies individueel auditen op machtigingen en eigenaarstoetsen; niet blind intrekken.
- [ ] Eén functie `public.next_family_routine_date` heeft een wijzigbaar `search_path`; veilig corrigeren na codecontrole.
- [ ] Auth-instelling voor gelekte wachtwoorden inschakelen en accountsessies/accountherstel nalopen.
- [ ] In-app accountverwijdering van begin tot eind testen, inclusief eventuele actieve abonnementen.
- [ ] Privacyverklaring en algemene voorwaarden: **openbare werkende URL's** en correcte inhoud controleren. De opgegeven URL's waren niet extern verifieerbaar.
- [ ] App Store Connect: appnaam, beschrijving, categorie, leeftijdsclassificatie, privacylabel, ondersteuning, screenshots en reviewnotities invullen.
- [ ] App Review demo-account testen en veilige reviewinstructies invoeren in App Store Connect (nooit wachtwoorden in GitHub).
- [ ] App Store-betaalscherm: productnaam, duur, prijs, verlenging, herstelfunctie, privacy en gebruiksvoorwaarden tonen.
- [ ] Werkelijke iOS-minimumversie, ondersteunde toestellen, Dynamic Island, toegankelijkheid en offline/foutschermen checken.

## Releaseprocedure
1. De designbranch reviewen en één gecontroleerde interne TestFlight IPA bouwen van de exacte commit.
2. Gebruik het zichtbare commit/buildlabel onder **Meer** om installatie te bevestigen.
3. Doe de bovenstaande regressie- en Sandbox-testen; documenteer bewijs zonder privégegevens.
4. Geen nieuwe visuele wijzigingen tijdens de finale acceptatie, behalve blokkerende fouten.
5. Productiebetalingen pas vrijgeven na verificatie, en vóór de App Store-release een nieuwe productie-IPA bouwen met correcte productiemodus.
6. Publicatie uitsluitend na expliciete eigenaarstoestemming; Codemagic publiceert momenteel niet automatisch.

Referenties:
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/subscriptions/
- https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
