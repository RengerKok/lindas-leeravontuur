import { db, newCard } from './db';
import { duplicateKey, normalize } from './cards';
import type { Flashcard } from './types';
export const fields = { question: 'Vraag', answer: 'Antwoord', explanation: 'Toelichting', study: 'Studie', subject: 'Vak', chapter: 'Hoofdstuk', topic: 'Onderwerp', difficulty: 'Moeilijkheid', tags: 'Tags' };
export type ImportField = keyof typeof fields;
export type Mapping = Partial<Record<ImportField, number>>;
export interface ImportRow { row: number; card: Flashcard; issue?: string }
const aliases: Record<ImportField, string[]> = { question: ['vraag', 'question', 'front'], answer: ['antwoord', 'answer', 'back'], explanation: ['toelichting', 'uitleg', 'explanation'], study: ['studie', 'study'], subject: ['vak', 'subject'], chapter: ['hoofdstuk', 'chapter'], topic: ['onderwerp', 'topic'], difficulty: ['moeilijkheid', 'moeilijkheidsgraad', 'difficulty'], tags: ['tags', 'labels'] };
export function detectMapping(headers: string[]): Mapping {
  const mapping: Mapping = {};
  for (const field of Object.keys(fields) as ImportField[]) { const index = headers.findIndex(header => aliases[field].includes(normalize(header))); if (index !== -1) mapping[field] = index; }
  return mapping;
}
export function prepareRows(rows: string[][], mapping: Mapping, existing: Flashcard[]): ImportRow[] {
  const keys = new Set(existing.filter(card => !card.deleted).map(duplicateKey));
  return rows.map((row, index) => {
    const read = (field: ImportField) => mapping[field] === undefined ? '' : String(row[mapping[field]!] ?? '').trim();
    const difficulty = read('difficulty');
    const card = newCard({ question: read('question'), answer: read('answer'), explanation: read('explanation'), study: read('study') || 'Mijn studie', subject: read('subject') || 'Algemeen', chapter: read('chapter') || 'Hoofdstuk 1', topic: read('topic'), difficulty: (['Makkelijk', 'Gemiddeld', 'Moeilijk'].find(value => normalize(value) === normalize(difficulty)) || 'Gemiddeld') as Flashcard['difficulty'], tags: read('tags').split(/[,;]/).map(tag => tag.trim()).filter(Boolean) });
    let issue: string | undefined;
    if (!card.question || !card.answer) issue = 'Vraag of antwoord ontbreekt';
    else if (card.question.length > 10000 || card.answer.length > 50000) issue = 'Vraag of antwoord is te lang';
    else if (difficulty && !['makkelijk', 'gemiddeld', 'moeilijk'].includes(normalize(difficulty))) issue = 'Onbekende moeilijkheid';
    else if (keys.has(duplicateKey(card))) issue = 'Dubbele vraag';
    else keys.add(duplicateKey(card));
    return { row: index + 2, card, issue };
  });
}
export async function importCards(rows: ImportRow[]) {
  return db.transaction('rw', db.cards, async () => {
    const keys = new Set((await db.cards.toArray()).filter(card => !card.deleted).map(duplicateKey)); let added = 0; let skipped = 0;
    for (const row of rows) {
      if (row.issue || keys.has(duplicateKey(row.card))) { skipped++; continue; }
      const card = newCard({ ...row.card, id: crypto.randomUUID() }); await db.cards.add(card); keys.add(duplicateKey(card)); added++;
    }
    return { added, skipped };
  });
}
export function readSpreadsheet(file: File): Promise<{ sheets: { name: string; rows: string[][] }[] }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./spreadsheet.worker.ts', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('Het bestand duurt te lang om te verwerken. Splits het op in kleinere bestanden.')); }, 90000);
    worker.onmessage = event => { clearTimeout(timer); worker.terminate(); if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data); };
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); reject(new Error('Dit bestand kon niet worden gelezen. Controleer het bestandsformaat.')); };
    worker.postMessage(file);
  });
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function exportExcel(cards: Flashcard[]) {
  const { default: ExcelJS } = await import('exceljs'); const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet('Flashcards');
  sheet.columns = Object.entries(fields).map(([key, header]) => ({ key, header, width: key === 'question' || key === 'answer' ? 55 : 24 }));
  cards.filter(card => !card.deleted).forEach(card => sheet.addRow({ ...card, tags: card.tags.join(', ') }));
  const buffer = await workbook.xlsx.writeBuffer(); downloadBlob(new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'linda-flashcards.xlsx');
}