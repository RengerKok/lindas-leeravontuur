# Afhankelijkheden

Gecontroleerd aan de hand van `license` in de daadwerkelijk geïnstalleerde package-manifesten. `package-lock.json` legt de volledige dependencyboom vast. Onderstaande inventaris is geen juridisch advies; behoud upstream licentie- en NOTICE-bestanden bij verdere distributie. Transitieven kunnen andere licenties hebben en moeten bij een formele redistributiecontrole afzonderlijk worden meegenomen.

| Onderdeel | Gecontroleerde versie | Licentie | Doel |
| --- | --- | --- | --- |
| React / React DOM | 19.3.1 | MIT | Interface |
| Vite | 7.3.7 | MIT | Bouw en ontwikkelserver |
| TypeScript | 5.9.3 | Apache-2.0 | Typecontrole |
| Tailwind / Vite-plugin | 4.3.3 | MIT | Styling |
| Dexie | 4.4.7 | Apache-2.0 | IndexedDB |
| dexie-react-hooks | 4.4.0 | Apache-2.0 | Reactieve lokale queries |
| ExcelJS | 4.4.0 | MIT | XLSX in- en uitvoer |
| Papa Parse | 5.7.0 | MIT | CSV |
| PDF.js (pdfjs-dist) | 6.4.299 | Apache-2.0 | PDF-tekstextractie |
| ts-fsrs | 5.4.2 | MIT | Herhaalplanning |
| Lucide React | 0.468.0 | ISC | Pictogrammen |
| Supabase JS | 2.118.0 | MIT | Optionele authenticatie/sync |
| vite-plugin-pwa | 1.3.0 | MIT | Manifest/serviceworker |
| Vitest | 4.1.12 | MIT | Unit-/componenttests |
| Testing Library React / jest-dom | 16.3.3 / 6.9.1 | MIT | Componenttests |
| fake-indexeddb | 6.2.6 | Apache-2.0 | Opslagtests |
| jsdom | 27.4.0 | MIT | Test-DOM |
| Playwright | 1.64.1 | Apache-2.0 | Browseracceptatie |
| Browserify | 17.0.1 | MIT | ExcelJS-browserbundel |
| esbuild | 0.25.12 | MIT | UUID-syntaxtransformatie |
| Sharp | 0.35.5 | Apache-2.0 | Eigen PNG-iconen genereren |

React-Vite-plugin en de gebruikte `@types/*`-pakketten vermelden MIT. Er is geen extern font, stockbeeld of betaald AI-model nodig. De mascotte-iconen worden lokaal gegenereerd; het Excel-voorbeeld bevat fictieve eigen oefentekst.

De laatste audit na toevoeging van Browserify meldt vier lage kwetsbaarheden in de keten `elliptic` / `create-ecdh` / `browserify-sign` / `crypto-browserify`, en geen middelhoge, hoge of kritieke meldingen. Herhaal `npm audit` bij iedere dependencyupdate; zo'n audit is een momentopname, geen volledige beveiligingsbeoordeling.