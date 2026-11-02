# JustAReminder — Apple Sandbox webhook geïntegreerde test

**Testdatum:** 2 november 2026, 15:17 UTC (16:17 Nederlandse tijd)  
**Uitkomst:** **GESLAAGD**

## Reëel geteste integratie
- App Store Server API: `POST https://api.storekit-sandbox.apple.com/inApps/v1/notifications/test` → **HTTP 200**.
- App Store Server API: `GET /inApps/v1/notifications/test/{testNotificationToken}` → `sendAttempts[].sendAttemptResult = SUCCESS`.
- Ontvangende Supabase Edge Function: `jar-apple-notifications` → **HTTP 200**.
- `public.jar_apple_iap_notifications`: `environment=Sandbox`, `notification_type=TEST`, `processing_status=processed`, `error_message=NULL`.
- Ondertekende Apple TEST-JWS door de ontvangende server gevalideerd. De database heeft een verwerking zonder fout opgeslagen.

## Detectie en herstel
De eerste poging kwam niet bij Apple vanwege de opslagnotatie van `APPLE_IAP_PRIVATE_KEY` (PKCS#8 import). De testaanroep ondersteunt nu ook ge-escapete of base64-gecodeerde p8-data zonder de privésleutel te loggen. Dezelfde verwerking is toegevoegd aan `jar-apple-reconcile` (v2).

De test wordt uitsluitend via een **eenmalige, tijdelijk geldige en na gebruik ongeldig gemaakte SQL-aanroep** gestart. De endpoint vereist een nonce, gecontroleerd door een server-only RPC.

## Betaalveilige toestand tijdens de test
- Apple-producten ingeschakeld: **0 van 8**.
- Apple-productieaankopen: **uit**.
- Apple-productierechten: **uit**.
- Apple-transacties: **0**.
- Bestaande Mollie-abonnementen en de Privé-/Family-rechten zijn niet gewijzigd.
- Geen openbare App Store-publicatie of nieuwe TestFlight-build uitgevoerd.

## Nog NIET bewezen
- Een daadwerkelijke StoreKit Sandbox-aankoop op een fysieke iPhone met accountkoppeling.
- Verlenging, opzegging, restitutie, grace period en billing retry via echte Apple-transactiegegevens.
- Apple's review/goedkeuring van de eerste abonnementen.
- Productiebetalingen en alle releasecontroles.

**Conclusie:** de Apple Sandbox Server Notifications V2 webhook is end-to-end getest en werkt. De betaalfunctie als geheel is nog niet gecertificeerd.