import sharp from 'sharp';
import ExcelJS from 'exceljs';
import { mkdir } from 'node:fs/promises';
await mkdir('public/icons', { recursive: true });
const artwork = Buffer.from(`<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="100" fill="#e5efe7"/><path d="M112 150Q180 120 256 154Q330 120 400 150V368Q324 344 256 379Q180 344 112 368Z" fill="#fffdf5" stroke="#356859" stroke-width="12" stroke-linejoin="round"/><path d="M256 154Q330 120 400 150V368Q324 344 256 379Z" fill="#b8d5c1"/><path d="M256 154V379" stroke="#356859" stroke-width="10"/><circle cx="208" cy="239" r="12" fill="#29463e"/><circle cx="307" cy="239" r="12" fill="#29463e"/><path d="M232 284Q257 307 282 282" fill="none" stroke="#29463e" stroke-width="9" stroke-linecap="round"/><ellipse cx="171" cy="270" rx="22" ry="10" fill="#efb2a8"/><ellipse cx="345" cy="270" rx="22" ry="10" fill="#efb2a8"/><path d="M255 127Q222 72 275 59Q308 100 255 127" fill="#82ab97"/></svg>`);
for (const [name, size] of [['icon-192', 192], ['icon-512', 512], ['maskable-512', 512], ['apple-touch-icon', 180]]) await sharp(artwork).resize(size, size).png().toFile(`public/icons/${name}.png`);
const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Fictieve oefenvragen');
sheet.columns = [{ header: 'Vraag', key: 'question', width: 55 }, { header: 'Antwoord', key: 'answer', width: 70 }, { header: 'Toelichting', key: 'explanation', width: 35 }, { header: 'Studie', key: 'study', width: 22 }, { header: 'Vak', key: 'subject', width: 22 }, { header: 'Hoofdstuk', key: 'chapter', width: 25 }, { header: 'Onderwerp', key: 'topic', width: 22 }, { header: 'Moeilijkheid', key: 'difficulty', width: 18 }, { header: 'Tags', key: 'tags', width: 20 }];
const questions = [
  ['Wat is actief ophalen?', 'Kennis uit je geheugen terughalen zonder de tekst te bekijken.'], ['Wat is gespreid leren?', 'Je oefenmomenten over meerdere dagen verdelen.'],
  ['Waarom helpen pauzes?', 'Ze helpen je aandacht te herstellen.'], ['Wat is een leerdoel?', 'Een concrete beschrijving van wat je wilt kunnen.'],
  ['Wat betekent reflecteren?', 'Terugkijken op je aanpak en verbeterpunten kiezen.'], ['Wat is voorkennis?', 'Kennis die je al bezit voordat je iets nieuws leert.'],
  ['Wat is een samenvatting?', 'Een korte weergave van de belangrijkste informatie.'], ['Wat is een mindmap?', 'Een visueel overzicht van samenhangende begrippen.'],
  ['Waarom helpt slapen?', 'Het ondersteunt het verwerken van nieuwe informatie.'], ['Wat is een meetbaar doel?', 'Vijf begrippen uit mijn hoofd uitleggen.'],
  ['Hoeveel minuten zitten er in een uur?', '60 minuten.'], ['Hoeveel zijden heeft een driehoek?', 'Drie.'], ['Wat is de helft van 80?', '40.'], ['Hoe heet water in vaste vorm?', 'IJs.'],
  ['Op welke planeet wonen wij?', 'De aarde.'], ['Wat meet een thermometer?', 'Temperatuur.'], ['Wat is een synoniem?', 'Een woord met ongeveer dezelfde betekenis.'],
  ['Wat is een antoniem?', 'Een woord met een tegengestelde betekenis.'], ['Wat betekent chronologisch?', 'In volgorde van tijd.'], ['Hoeveel centimeter is een meter?', '100 centimeter.']
];
questions.forEach(([question, answer], index) => sheet.addRow({ question, answer, explanation: 'Fictief demonstratiemateriaal, geen officiële lesstof.', study: 'Voorbeeldstudie', subject: 'Oefenmateriaal', chapter: index < 10 ? 'Leren leren' : 'Alledaagse kennis', topic: 'Voorbeelden', difficulty: 'Gemiddeld', tags: 'voorbeeld' }));
sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF356859' } };
sheet.views = [{ state: 'frozen', ySplit: 1 }];
await workbook.xlsx.writeFile('public/voorbeeld-flashcards.xlsx');
console.log('4 appiconen en Excelvoorbeeld met 20 vragen aangemaakt.');