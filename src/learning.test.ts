import { beforeEach, expect, test } from 'vitest';
import { db, newCard } from './db';
import { answerCard, buildQueue, repeatInQueue, startSession, recordExamAnswer } from './learning';
beforeEach(async () => { await Promise.all([db.cards.clear(), db.reviews.clear(), db.sessions.clear(), db.settings.clear()]); });
test('quiz bewaart antwoorden zonder beoordeling en vereist een passend hoofdstuk', async () => {
  await db.cards.add(newCard({ question: 'Quizvraag', answer: 'Quizantwoord' }));
  await expect(startSession('boss')).rejects.toThrow('Kies een hoofdstuk');
  const session = await startSession('exam', '', 0, ['Hoofdstuk 1']);
  await Promise.all([recordExamAnswer(session.id, 0, 'Mijn antwoord', 20), recordExamAnswer(session.id, 0, 'Dubbel', 30)]);
  expect((await db.sessions.get(session.id))?.examAnswers).toHaveLength(1); expect(await db.reviews.count()).toBe(0);
});
test('fout antwoord komt na drie andere kaarten terug, ook aan het einde', () => {
  expect(repeatInQueue(['a', 'b', 'c', 'd', 'e'], 0, 'again')).toEqual(['a', 'b', 'c', 'd', 'a', 'e']);
  expect(repeatInQueue(['a', 'b'], 1, 'again')).toEqual(['a', 'b', 'a', 'b']);
  expect(repeatInQueue(['a'], 0, 'again')).toEqual(['a', 'a']);
});
test('nieuwe kaarten en herhalingen wisselen elkaar af', () => {
  const due = newCard({ id: 'due' }); due.scheduler.reps = 2; const fresh = newCard({ id: 'new' });
  expect(buildQueue([fresh, due], 'normal', 10)).toEqual(['due', 'new']);
});
test('beoordeling is atomair, hervatbaar en kent XP niet dubbel toe', async () => {
  const card = newCard({ question: 'Een vraag', answer: 'Een antwoord' }); await db.cards.add(card); const session = await startSession('normal');
  await Promise.all([answerCard(session.id, 0, 'again'), answerCard(session.id, 0, 'again')]); expect(await db.reviews.count()).toBe(1);
  db.close(); await db.open(); const resumed = await db.sessions.get(session.id); expect(resumed?.cursor).toBe(1); expect(resumed?.queue).toHaveLength(2);
  await answerCard(session.id, 1, 'good'); expect((await db.sessions.get(session.id))?.completed).toBe(true);
  expect((await db.reviews.toArray()).reduce((total, review) => total + review.xp, 0)).toBe(10);
  expect(new Date((await db.cards.get(card.id))!.scheduler.due).getTime()).toBeGreaterThan(Date.now());
});
test('goed krijgt een later herhaalmoment dan fout', async () => {
  const cards = [newCard({ id: 'good' }), newCard({ id: 'again' })]; await db.cards.bulkAdd(cards); const now = new Date('2026-10-26T12:00:00Z');
  for (const card of cards) { const session = await startSession('quick'); await db.sessions.update(session.id, { queue: [card.id] }); await answerCard(session.id, 0, card.id === 'good' ? 'good' : 'again', 10, now); }
  expect(+new Date((await db.cards.get('good'))!.scheduler.due)).toBeGreaterThan(+new Date((await db.cards.get('again'))!.scheduler.due));
});