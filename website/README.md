# JustAReminder marketingwebsite + support (concept voor lancering)

Dit is de **aparte publieke marketingwebsite**, niet het Privé/Family-dashboard en niet de native iOS-app. De bestanden staan bewust in de map `website/` en zijn geïsoleerd van de iOS-build.

## Inhoud
- `index.html` — Nederlandstalige landingspagina volgens de actuele JustAReminder-positionering: taken, herinneringen, maandagenda, Family, twee invoermethoden, advertentievrij; geen AI-beloftes
- `support/index.html` — tweetalige (Nederlands en Engels) FAQ met informatie over meldingen, account, abonnementen, Apple-aankopen en opzegging
- `assets/site.css` — gedeelde responsive vormgeving, passend bij de nieuwe rustige iPhone-look

## Vóór publicatie verplicht
1. **Huidige hosting vastgesteld op 5 november 2026:** DNS van `www.justareminder.eu` heeft CNAME `website-rendering.jouwweb.nl` en domeinnameservers bij Openprovider. De publieke marketingwebsite draait dus via **JouwWeb**, niet via de verbonden Vercel-projecten. Pas eerst de pagina's in JouwWeb aan, of maak een aparte Vercel-preview en plan pas daarna een gecontroleerde verhuizing. **Wijzig geen DNS of bestaand live domein zonder toestemming**, en behoud bestaande privacy-/voorwaarden- en eventuele loginlinks.
2. **Supportmailbox:** eigenaar heeft `info@justareminder.eu` aangewezen. Supportpagina toont dit adres in NL/EN met `mailto:`-links. **Nog te controleren:** mailbox kan berichten ontvangen en wordt door support gelezen. Pas daarna als definitieve App Store Support URL gebruiken. Geen wachtwoorden of betaalgegevens via e-mail laten delen.
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
