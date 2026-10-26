import { beforeEach, expect, test } from 'vitest';
import { db, newCard } from './db';
import { detectMapping, prepareRows, importCards } from './importing';
beforeEach(async () => { await db.cards.clear(); });
test('herkent kolommen, ongeldige rijen en duplicaten', () => {
  const mapping = detectMapping([' Antwoord ', 'VRAAG', 'Moeilijkheid']); expect(mapping.question).toBe(1);
  const rows = prepareRows([['A', 'V', 'Gemiddeld'], ['', 'Leeg', ''], ['A', ' v ', ''], ['A', 'Nieuw', 'Onbekend']], mapping, []);
  expect(rows.map(row => row.issue)).toEqual([undefined, 'Vraag of antwoord ontbreekt', 'Dubbele vraag', 'Onbekende moeilijkheid']);
});
test('importeren behoudt bestaande resultaten en is opnieuw veilig uit te voeren', async () => {
  const previous = newCard({ question: 'Bestaand', answer: 'Antwoord', correct: 9 }); await db.cards.add(previous);
  const rows = prepareRows([['Nieuw', 'Antwoord'], ['Bestaand', 'Anders']], { question: 0, answer: 1 }, [previous]);
  expect(await importCards(rows)).toEqual({ added: 1, skipped: 1 }); expect(await importCards(rows)).toEqual({ added: 0, skipped: 2 }); expect((await db.cards.get(previous.id))?.correct).toBe(9);
});