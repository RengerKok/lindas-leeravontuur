import { expect, test, vi } from 'vitest';
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ GlobalWorkerOptions: {}, getDocument: vi.fn() }));
import { pageText, selectedFragment, generateDrafts } from './pdf';
test('PDF-fragmenten behouden tekst en regeleinden', () => {
  expect(pageText({ items: [{ str: 'Eerste regel', hasEOL: true }, { str: 'Tweede regel', hasEOL: false }], styles: {} } as Parameters<typeof pageText>[0])).toBe('Eerste regel\nTweede regel'); expect(selectedFragment('Een stukje tekst', 4, 10)).toBe('stukje');
});
test('optionele generator levert alleen concepten en slaat niets op', async () => {
  expect(await generateDrafts({ available: async () => true, generate: async () => [{ question: 'Vraag', answer: 'Antwoord' }, { question: '', answer: 'Ongeldig' }] }, 'Bron')).toEqual([{ question: 'Vraag', answer: 'Antwoord' }]);
  await expect(generateDrafts({ available: async () => false, generate: async () => [] }, '')).rejects.toThrow('niet beschikbaar');
});