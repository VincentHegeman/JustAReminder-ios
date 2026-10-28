# JustAReminder: van Windows naar de eerste iOS-cloudcontrole

Status: geen IPA en geen werkende StoreKit-betalingen. Deze stap controleert alleen de iOS-code op een Mac in de cloud.

## 1. Op Windows

1. Pak deze ZIP volledig uit (niet vanuit Windows ZIP-preview uitvoeren).
2. Installeer Git voor Windows: https://git-scm.com/downloads/win
3. Dubbelklik op `00-VEILIGHEIDSCONTROLE.bat`.
4. Als je de melding **[OK]** krijgt, dubbelklik op `02-UPLOAD-NAAR-GITHUB.bat`.
5. Plak de HTTPS-URL van je **bestaande privé**-repository (bijvoorbeeld `https://github.com/ACCOUNT/JustAReminder-iOS.git`). De URL is *geen* API-token.
6. Controleer welke bestanden Git gaat uploaden; bevestig pas als er geen persoonlijke/geheime bestanden tussen staan.
7. Meld je aan via het GitHub-browservenster van Git Credential Manager als Windows daarom vraagt.
8. Controleer op GitHub of je `package.json`, `www/`, `scripts/` en `codemagic.yaml` ziet. **Upload niet de ZIP als één bestand in de repository**: Codemagic heeft de uitgepakte projectstructuur nodig.

Als `git commit` stopt wegens ontbrekende identiteit, open Git Bash en voer uit:

```
git config --global user.name "Jouw naam"
git config --global user.email "jouw-e-mailadres"
```

Gebruik een GitHub no-reply-adres als je je persoonlijke e-mailadres niet in commits wilt tonen.
Start dan opnieuw het uploadscript.

Als je geen Git wilt installeren, kun je via `github.com` > repository > `Add file` > `Upload files` bestanden handmatig uploaden. Zorg dat de volledige mapstructuur behouden blijft, met `package.json` en `codemagic.yaml` in de ROOT van je repository.

## 2. Codemagic cloudbuild (nog niet publiceren)

1. Open https://codemagic.io/ en meld je aan met GitHub.
2. Koppel je privérepository met de vereiste repositoryrechten.
3. Klik `Add application` en selecteer `JustAReminder-iOS`.
4. Codemagic vindt `codemagic.yaml`. Kies de workflow `ios-simulator-controle`.
5. Start de build op macOS. Dit genereert en compileert de eerste iOS-testapp zonder code-signing.
6. Controleer de buildlogs. Bij een fout stuur je alleen de foutregels of een screenshot (geen tokens).

**Let op:** een ongetekende simulatorbuild is nog NIET installeerbaar op je iPhone. Voor TestFlight zijn distributieondertekening, een Apple App Store Connect API-integratie, een echt werkende iOS-app en Apple/Supabase-aankoopverificatie nodig.

## 3. Geheimen

Bewaar Apple .p8, Supabase service_role, Mollie LIVE secrets, tokens en privégegevens nooit in GitHub, in `www/` of in Codemagic-logs. Configureer die later via beschermde variabelen en Codemagic-integraties. Bewaar de repository privé. De automatische veiligheidsscan is nuttig maar garandeert niet dat elk geheim is gedetecteerd.
