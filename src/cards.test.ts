import { beforeEach, expect, test } from 'vitest';
import { db } from './db';
import { saveCard, bulkUpdate, addDemoCards, demoQuestions, demoSubject } from './cards';
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
test('Swiftie-set bevat twintig unieke captionvragen en kan zonder duplicaten worden toegevoegd', async () => {
  expect(demoQuestions).toHaveLength(20);
  expect(new Set(demoQuestions.map(([question]) => question)).size).toBe(20);
  expect(await addDemoCards()).toBe(20);
  const demo = (await db.cards.toArray()).find(card => card.subject === demoSubject)!;
  await db.cards.update(demo.id, { correct: 4 });
  expect(await addDemoCards()).toBe(0);
  expect(await db.cards.count()).toBe(20);
  expect((await db.cards.get(demo.id))?.correct).toBe(4);
  expect(demo.question).toContain('Bijschrift:');
  expect(demoQuestions.filter(([, , chapter]) => chapter === 'Albums & verhalen')).toHaveLength(10);
});