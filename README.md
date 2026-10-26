# Linda's Leeravontuur

Nederlandstalige, lokaal werkende studie-PWA voor computer, iPad en iPhone. Zonder account blijven kaarten en voortgang in IndexedDB op het apparaat. Supabase is optioneel voor synchronisatie; er is geen betaalde AI nodig.

## Starten

Gebruik Node.js 22.12+ of 24 LTS en een actuele browser. Op Windows PowerShell kan `npm.cmd` nodig zijn in plaats van `npm`.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

Open de URL die Vite toont. Voor de productie-PWA en offline testen:

```sh
npm test
npm run build
npm run preview -- --host 0.0.0.0
```

`npm ci` maakt via `postinstall` een lokale ExcelJS-browserbundel. Installeer daarom ook de ontwikkelafhankelijkheden tijdens het bouwen; gebruik geen `--ignore-scripts`. De gegenereerde bundel staat onder `node_modules/.cache/linda/`. `npm run assets` genereert de meegeleverde PNG-iconen en het fictieve Excel-voorbeeld opnieuw.

## Wat Zit Erin?

- Dashboard, handmatige kaarten, opleidingen/vakken/hoofdstukken/onderwerpen, zoeken, filters en bulkacties.
- Excel/CSV-import met werkbladkeuze, kolomkoppeling, voorbeeld, validatie en dubbele-vragencontrole. [Voorbeeld met 20 fictieve vragen](public/voorbeeld-flashcards.xlsx).
- Lokale PDF-tekstextractie, selectie naar conceptkaart, bronbestand en paginanummer.
- FSRS via `ts-fsrs`, Goed/Twijfel/Fout, vertraagde herhaling en hervatbare sessies.
- Normaal, moeilijk, snel, focus, mix, examentraining en Boss Battle. Examenvragen worden eerst beantwoord en pas daarna zelf beoordeeld.
- XP, levels, dagelijkse missie, badges, voortgang, thema, grotere tekst en uitschakelbare animaties.
- Offline PWA, JSON-back-up, Excel-export en optionele Supabase-authenticatie/synchronisatie met expliciete conflicten.

## Handleidingen

- [Handleiding voor Linda, inclusief iPhone en iPad](public/handleiding.html)
- [Gratis hosting, Supabase, gegevensbeheer en acceptatiecontrole](docs/BEHEER.md)
- [Afhankelijkheden en licenties](docs/AFHANKELIJKHEDEN.md)

## Testen

```sh
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

Vitest gebruikt een enkele thread en fake IndexedDB. Playwright gebruikt afzonderlijke tijdelijke browserprofielen en een productie-preview op poort 4178. De browsertests wijzigen geen gegevens op de gewone ontwikkel-URL. Bouw opnieuw voor elke browsercontrole na een bronwijziging. De WebKit-test benadert Safari op een mobiel scherm, maar vervangt geen test op een echte iPhone/iPad.

## Grenzen

Geen OCR, geen meegeleverd lokaal taalmodel en geen automatische beoordeling van vrije antwoorden. De uitbreidbare lokale generator-interface slaat voorstellen nooit automatisch op. PDF-bestanden worden niet opgeslagen of gesynchroniseerd; alleen gekozen tekst en bronverwijzingen. De beheersingsscore is een eenvoudige FSRS-stabiliteitsindicator, geen voorspelling van een examencijfer.

Back-ups zijn gewone JSON-bestanden met persoonlijke leergegevens, geen versleutelde archieven. Browseropslag kan worden gewist; download regelmatig een back-up. Synchronisatie vereist internet en een geopende app. Een lokaal werkende app is nog geen extern bereikbare website: publiceren en een optioneel Supabase-project configureren moet de beheerder uitvoeren.

Er is geen live Supabase-project of fysiek iOS-apparaat voor deze oplevering gebruikt. De acceptatiestappen daarvoor staan in de beheerhandleiding. Gebruik uitsluitend studiemateriaal dat je mag verwerken; zet geen vertrouwelijke bedrijfs- of persoonsgegevens in een privécloud zonder toestemming.

## Structuur

`src/db.ts` en `src/types.ts`: opslag en gegevensmodel. `src/learning.ts` en `src/stats.ts`: planning en resultaten. `src/importing.ts`, de spreadsheet-worker en `src/pdf.ts`: import. `src/backup.ts`, `src/sync.ts` en `src/useCloud.ts`: back-up en synchronisatie. `src/components/`: schermen. `supabase/schema.sql`: tabel, RLS en revisionele schrijf-RPC. `e2e/`: browseracceptatie.