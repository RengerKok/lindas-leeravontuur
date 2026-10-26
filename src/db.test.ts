import { expect, test } from 'vitest';
import { LearningDB, newCard } from './db';
test('een handmatige kaart blijft lokaal bewaard na heropenen', async () => {
  const database = new LearningDB('basis-test');
  const card = newCard({ question: 'Wat is leren?', answer: 'Nieuwe kennis opdoen.' });
  await database.cards.add(card);
  database.close();
  await database.open();
  expect((await database.cards.get(card.id))?.question).toBe('Wat is leren?');
  await database.delete();
});