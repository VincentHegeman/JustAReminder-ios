# JustAReminder marketingwebsite + support (concept voor lancering)

Dit is de **aparte publieke marketingwebsite**, niet het Privé/Family-dashboard en niet de native iOS-app. De bestanden staan bewust in de map `website/` en zijn geïsoleerd van de iOS-build.

## Inhoud
- `index.html` — Nederlandstalige landingspagina volgens de actuele JustAReminder-positionering: taken, herinneringen, maandagenda, Family, twee invoermethoden, advertentievrij; geen AI-beloftes
- `support/index.html` — tweetalige (Nederlands en Engels) FAQ met informatie over meldingen, account, abonnementen, Apple-aankopen en opzegging
- `assets/site.css` — gedeelde responsive vormgeving, passend bij de nieuwe rustige iPhone-look

## Vóór publicatie verplicht
1. **Bepaal welk Vercel-project `www.justareminder.eu` host.** Verander de bestaande deployment niet voordat die toewijzing is bevestigd. Gebruik `website/` als Vercel **Root Directory** bij een afzonderlijk nieuw project of bij een gecontroleerde migratie.
2. **Supportmailbox:** vraag de eigenaar welk écht ontvangen en getest supportadres klanten mogen gebruiken. Het supportscherm bevat voorlopig zichtbaar de tekst “Wordt vóór publicatie bevestigd”. Vervang dit door een werkend e-mailadres en `mailto:`-link. `noreply@justareminder.nl` mag niet zonder verificatie als supportmail worden gebruikt.
3. **Privacy en voorwaarden:** controleer of `/privacy` en `/algemenen-voorwaarden` bestaan en juiste tekst tonen. Ze zijn niet in deze stagingmap opgenomen. Een vervangende site moet bestaande correcte juridische pagina's overnemen of opnieuw laten goedkeuren. Publiceer geen 404-links.
4. **App Store Support URL:** gebruik pas `https://www.justareminder.eu/support/` nadat daadwerkelijk `HTTP 200`, een werkende contactmogelijkheid en privacylinks zijn bevestigd.
5. **Prijzen:** 4,99/9,99 zijn *geplande* Nederlandse maandprijzen; definitieve Apple-producten en landenprijzen nog controleren. Geen live aankopen of checkout op de marketingwebsite activeren.
6. **iOS release:** deze wijziging staat los van StoreKit, Apple-abonnementsrechten en App Store-releasetoestemming.

## Visueel en functioneel controleren
- Mobile: 375px en 430px, small desktop en tablet; navigatie, contrast, lange teksten, focus met toetsenbord en reduce-motion
- Aanbod: geen AI-functies geadverteerd; Family wordt als functionaliteit gekoppeld aan betaalde rechten weergegeven
- Support: NL/EN wissel via `/support/?lang=en` en accordeons, correcte paden naar privacy en voorwaarden
- Links: footer, navigatie, interne ankers, Apple-beheerpagina
- SEO: eigen title/description, canonicals, geen `noindex` op marketingpagina

## Geen stille publicatie
Een GitHub-branch of PR creëert geen live Vercel-publicatie. De site mag pas als openbare marketingwebsite dienen na controle van domein, juridische pagina's en contactadres. De bestaande Privé/Family-app blijft ongemoeid.
