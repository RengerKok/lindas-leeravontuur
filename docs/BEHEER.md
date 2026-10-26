# Beheer en Publicatie

## Gratis Statische Hosting

De app heeft geen applicatieserver nodig. De map `dist` is het publicatieproduct. HTTPS is noodzakelijk voor PWA-functies en veilige browser-API's; localhost is alleen een ontwikkeluitzondering. Een telefoon kan niet de localhost van een andere computer openen.

### GitHub Pages

1. Plaats de broncode in een eigen GitHub-repository. Publiceer nooit `.env`, back-ups of echte studiematerialen. Voor gratis Pages kan een openbare repository nodig zijn; controleer je plan en toestemming voordat je bedrijfsbroncode openbaar maakt.
2. Kies bij Settings / Pages de bron **GitHub Actions**.
3. Gebruik de meegeleverde workflow `pages.yml`. Start hem handmatig onder Actions. Deze voert tests en een productiebuild uit en publiceert alleen na succes.
4. Voor een normale projectrepository berekent de workflow `BASE_PATH=/repositorynaam/`. Voor `eigenaar.github.io` gebruikt hij `/`. Voor een eigen domein zet je de repositoryvariabele `BASE_PATH` op `/`.
5. Open de HTTPS-URL uit de deploy-uitvoer, installeer de app en controleer offline werking. Een gewijzigde domeinnaam of submap is een andere opslagplek; exporteer/importeer eerst een back-up.

Alternatief: gebruik de gratis statische sitefunctie van Cloudflare Pages of Netlify met bouwopdracht `npm ci && npm run build`, uitvoermap `dist`, Node 22.12+ en `BASE_PATH=/`. Controleer actuele gratis limieten; er is geen garantie dat een leverancier zijn gratis aanbod behoudt. De app is niet automatisch extern gepubliceerd tijdens ontwikkeling.

## Optioneel: Supabase

Zonder configuratie is alle lokale functionaliteit bruikbaar. Een gratis Supabase-project kan voldoende zijn voor persoonlijk gebruik, maar kent quota, e-maillimieten en mogelijk pauzeren bij inactiviteit. Controleer de actuele voorwaarden en regio/privacyvereisten. Geen service-role-sleutel hoort ooit in deze frontend.

1. Maak een Supabase-project in een passende regio.
2. Voer `supabase/schema.sql` uit in de SQL-editor. Dit maakt een RLS-beveiligde tabel met een accountgebonden sleutel en een revisionele schrijf-RPC. Voer de SQL eerst in een testproject uit.
3. Zet in een lokale, niet-gecommitte `.env`:

```dotenv
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-publieke-anon-of-publishable-key
```

4. Bij GitHub Pages maak je repositoryvariabelen met dezelfde namen. De publieke sleutel komt noodzakelijkerwijs in de browserbundel; toegangsbeveiliging berust op RLS en `auth.uid()`, niet op geheimhouding hiervan. Gebruik nooit een secret/service-role-key.
5. Schakel e-mail/wachtwoord-authenticatie in. Stel Auth / URL Configuration / Site URL en Redirect URLs in op de exacte gepubliceerde app-URL, inclusief subpad en afsluitende slash. Voeg localhost alleen toe voor ontwikkeling.
6. Controleer e-mailbevestiging en herstelmail. De ingebouwde testmailer kan alleen bepaalde ontvangers toestaan en heeft strenge limieten. Configureer indien nodig eigen SMTP; dit kan buiten het gratis aanbod vallen. Lokale werking blijft zonder maildienst bruikbaar.
7. Bouw en publiceer opnieuw. Maak een testaccount, bevestig de e-mail en log in. Gebruik hetzelfde account op een tweede browserprofiel of apparaat.

De app synchroniseert bij lokale wijzigingen na ongeveer 1,2 seconde, iedere 30 seconden en bij terugkerende verbinding zolang de app openstaat. Er is geen achtergrondservice die een gesloten app synchroniseert. Logische verwijderingen blijven als tombstones bestaan zodat andere apparaten ze kunnen ontvangen.

De eerste gebruiker bindt de lokale browsercollectie aan zijn account. Wisselen van account over dezelfde lokale collectie wordt geblokkeerd. Uitloggen verwijdert geen lokale kaartgegevens. Gebruik op gedeelde computers afzonderlijke OS-/browserprofielen. De app bevat geen zelfservice-accountverwijdering; verwijder een account en eventuele servergegevens via het beheer volgens het gekozen privacybeleid.

## Synchronisatie en Conflicten

Elke serverrij bevat een revisienummer. De client bewaart lokaal het laatst gesynchroniseerde inhoudsfingerprint en revisienummer. Wijzigt alleen lokaal iets, dan wordt met een verwachte revisie geschreven. Wijzigt alleen de server, dan wordt binnen een lokale transactie overgenomen. Twee inhoudelijk verschillende wijzigingen leiden tot een zichtbaar conflict. Een ouder apparaat kan de nieuwere serverversie niet stil overschrijven.

Bij kaarten kan de gebruiker beide bewaren: de lokale kaart krijgt een nieuwe ID, de oorspronkelijke ID krijgt de cloudversie. Bij andere onderdelen kiest de gebruiker één versie. De synchronisatie-eenheid is een record, geen veld; twee beoordelingen van dezelfde kaart op offline apparaten kunnen dus een kaartconflict opleveren, ook al blijven de losse review-events bestaan. De gebruiker kiest dan expliciet de planningsversie. Dag-XP wordt op kaart/dag gededupliceerd.

Accounttokens staan in de browseropslag van Supabase en zijn niet in JSON-back-ups opgenomen. Ook synchronisatiemetadata en de extra remote payload van openstaande conflicten worden niet geëxporteerd. Los conflicten op voordat je een volledige collectie wilt archiveren. Verplaats back-ups veilig: ze bevatten niet-versleutelde vragen en leerhistorie.

## Acceptatie Voor Ingebruikname

Unit-/componenttests en lokale browsertests zijn geen vervanging voor deze checks. SQL, e-mailbezorging en RLS zijn niet tegen een live project gevalideerd tijdens ontwikkeling.

1. **RLS:** maak accounts A en B. A maakt een kaart; B mag die via een normale SELECT niet zien. Probeer met B dezelfde entity-ID met `p_owner=A` te schrijven: de RPC moet weigeren. Probeer directe INSERT/UPDATE/DELETE als authenticated en anon: deze moeten worden geweigerd. Voer dit uit met gebruikerssessies, niet met de admin/service-role-key die RLS kan omzeilen.
2. **Revisies:** open account A in twee afzonderlijke browserprofielen. Synchroniseer, ga in beide offline, wijzig dezelfde kaart verschillend, ga om beurten online. Er moet een conflict verschijnen; controleer lokaal/cloud/beide en herlaad beide apparaten.
3. **Voortgang:** beoordeel offline, sluit en heropen de app, hervat en synchroniseer. Controleer dat dubbeltikken niet tweemaal XP geeft en dag-XP niet verdubbelt na samenvoegen.
4. **Verwijderen:** verwijder een kaart op A; na sync moet hij op het tweede apparaat verdwenen zijn. Test ook verwijderen tegenover een offline wijziging.
5. **Back-up:** exporteer, importeer in een leeg profiel en vergelijk kaarten, reviews, sessies en instellingen. Herhaal de import: identieke records moeten worden overgeslagen. Controleer bewust overschrijven met een oude back-up apart.
6. **E-mail:** test registratie, bevestiging, uitloggen, inloggen en wachtwoordherstel vanaf de gepubliceerde URL.
7. **Echte iPhone/iPad:** installeer via Safari, sluit/heropen, activeer vliegtuigstand en oefen. Controleer selecteren van PDF-tekst, bestanden uit Bestanden, downloads, grotere tekst, donkere modus en beide schermoriëntaties. Een mobiele WebKit-emulatie valideert geen beginscherminstallatie of iOS-opslagbeleid.
8. **Update:** publiceer een nieuwe build, laat de app de update aanbieden en werk bij met een gepauzeerde sessie. Controleer hervatten. Maak vooraf een back-up.

## Onderhoud en Grenzen

- `npm ci` reproduceert de lockfile. Voer na dependencywijzigingen unit-/componenttests, build, browsertests en `npm audit` uit. `npm run test:e2e` start zelf een tijdelijke previewserver op 4178.
- De ExcelJS-browserbundel wordt uit bron gegenereerd om de bijgewerkte UUID-afhankelijkheid werkelijk mee te bundelen. Een override alleen zou de upstream voorgebouwde bundel niet wijzigen.
- De bundler waarschuwt voor omvangrijke Excel/PDF-assets en een `eval` in een browserpolyfill. Test eventuele strikte Content Security Policy apart; een strikte CSP is niet gecertificeerd.
- Er zijn vier lage auditmeldingen rond `elliptic` en de crypto-browserify-keten. De app gebruikt die polyfills niet als eigen cryptografisch beveiligingsmechanisme. Dit blijft een onderhoudspunt, geen verklaring dat de dependency onkwetsbaar is.
- PDF.js leest lokale tekst, maar bewaart geen PDF-bestand. Geen OCR en geen geïntegreerd AI-model. Voor zeer grote tabellen/documenten gelden geheugenlimieten van het apparaat, ook onder de bestandslimiet.
- Vragen vooraf beoordelen ontbreekt bewust in examenvorm; de gebruiker vergelijkt achteraf zelf. Dit is een leermiddel, geen fraudebestendige examinering.
- Mastery is afgeleid van FSRS-stabiliteit. Tijdmetingen begrenzen een antwoord op 120 seconden; ze zijn geen exacte tijdregistratie.
- JSON-formaatversie 1 wordt gecontroleerd vóór import. Onbekende toekomstige versies worden geweigerd. IndexedDB versie 1 is de huidige database; toekomstige schemawijzigingen vragen expliciete Dexie-migraties.
- Geen formele toegankelijkheidsaudit of penetratietest uitgevoerd. Vertrouwelijke organisatiegegevens vereisen een aparte privacy- en beveiligingsbeoordeling.

## Herstel

Wis bij fouten geen browseropslag voordat je een JSON-back-up hebt. Controleer de lokale foutmelding en Supabase logs zonder tokens of kaartinhoud openbaar te delen. Bij een mislukte publicatie kan de vorige statische build opnieuw worden gepubliceerd; gegevens staan los daarvan in IndexedDB en optioneel Supabase. Een oude frontend is niet automatisch compatibel met een toekomstige schemamigratie.