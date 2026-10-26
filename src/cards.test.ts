import { beforeEach, expect, test } from 'vitest';
import { db } from './db';
import { saveCard, bulkUpdate } from './cards';
beforeEach(async () => { await db.cards.clear(); });
test('handmatig toevoegen, duplicaten blokkeren en resultaten behouden bij bewerken', async () => {
  const card = await saveCard({ question: 'Wat is kennis?', answer: 'Wat je weet.' });
  await expect(saveCard({ question: '  WAT  IS KENNIS? ', answer: 'Dubbel' })).rejects.toThrow('bestaat al');
  await db.cards.update(card.id, { correct: 3 });
  await saveCard({ ...card, question: 'Wat is kennis?', answer: 'Wat je hebt geleerd.' });
  expect((await db.cards.get(card.id))?.correct).toBe(3);
  await bulkUpdate([card.id], { chapter: 'Hoofdstuk 2' });
  expect((await db.cards.get(card.id))?.chapter).toBe('Hoofdstuk 2');
});