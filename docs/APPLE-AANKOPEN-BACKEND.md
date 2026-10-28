# Verplichte veilige aankoopketen — JustAReminder

## Status: NOG NIET aangesloten (geen echte betalingen in dit project)

1. Gebruiker moet ingelogd zijn in JustAReminder (Supabase auth).
2. Controleer Apple-productprijs en beschikbaarheid via StoreKit 2, niet de hardcoded EUR-prijs.
3. Start StoreKit 2-transactie via een native plugin.
4. Neem `VerificationResult.jwsRepresentation` aan, maar beschouw die NIET als bewijs op de client.
5. Stuur de JWS met Supabase JWT naar een beveiligde Edge Function.
6. Edge Function moet handtekening/keten + Apple environment + Bundle ID `eu.justareminder.app` + product ID + transaction ID + expiratie/revocation controleren met officiële Apple App Store Server Library.
7. Gebruik een idempotente transactieadministratie met unieke `originalTransactionId` en `transactionId`, koppel elke aankoop aan de juiste Supabase-auth-gebruiker (geen productrechten puur op basis van clientproduct ID).
8. Alleen de server verleent/verlengt rechten; verwerkt App Store Server Notifications V2, intrekkingen, verlenging, grace-period, refunds, abonnementgroep upgrades en subscription expirations.
9. Pas na succesvolle serververwerking mag StoreKit transactie worden afgerond; herstel onafgemaakte transacties bij opstart.
10. Extra bundels zijn een APARTE abonnementsgroep, kunnen blijven doorlopen na opzegging basisabonnement. Leg dit uit en bouw veilige blokkering/melding in.
11. Productcatalogus: zie APPLE-PRODUCT-ID-REGISTER.csv. Basisgroep: Premium L1, Privé L2. Extra bundels: hoogste bundel op hoogste niveau (200 > 150 > 100 > 50). Controleer in App Store Connect dat dit werkelijk zo is opgeslagen.
12. Apple-inkoopstatus verandert nooit de rechten van de bestaande Mollie-webomgeving zonder correcte server-side reconciliatie.

**Geen secrets in www/, .js of ZIP.** Voor productie zijn Apple server-credentials, Supabase-Edge-Function, APNs-notificaties en echte toesteltests nog vereist.
