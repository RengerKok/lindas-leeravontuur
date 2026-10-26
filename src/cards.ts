import { db, newCard, nowISO } from './db';
import type { Flashcard } from './types';
import swiftieCaptions from './data/swiftie-captions.json';

export const normalize = (text: string) => text.normalize('NFKC').trim().toLocaleLowerCase('nl').replace(/\s+/g, ' ');
export const duplicateKey = (card: Pick<Flashcard, 'question' | 'study' | 'subject'>) => [card.study, card.subject, card.question].map(normalize).join('\u001f');
export async function saveCard(input: Partial<Flashcard>, allowDuplicate = false) {
  if (!input.question?.trim() || !input.answer?.trim()) throw new Error('Vul een vraag en een antwoord in.');
  if (input.question.length > 10000 || input.answer.length > 50000) throw new Error('Deze vraag of dit antwoord is te lang.');
  return db.transaction('rw', db.cards, async () => {
    const previous = input.id ? await db.cards.get(input.id) : undefined;
    if (previous?.deleted) throw new Error('Deze kaart is inmiddels verwijderd. Sluit het formulier en maak eventueel een nieuwe kaart.');
    const card = newCard({ ...previous, ...input, question: input.question!.trim(), answer: input.answer!.trim(), updatedAt: nowISO() });
    if (previous) Object.assign(card, { scheduler: previous.scheduler, correct: previous.correct, incorrect: previous.incorrect, lastReview: previous.lastReview, createdAt: previous.createdAt });
    const duplicate = (await db.cards.toArray()).find(existing => !existing.deleted && existing.id !== card.id && duplicateKey(existing) === duplicateKey(card));
    if (duplicate && !allowDuplicate) throw new Error('Deze vraag bestaat al binnen dit vak. Pas de vraag aan of bewerk de bestaande kaart.');
    await db.cards.put(card);
    return card;
  });
}
export async function bulkUpdate(ids: string[], changes: Partial<Pick<Flashcard, 'chapter' | 'extra' | 'deleted'>>) {
  await db.transaction('rw', db.cards, async () => {
    for (const id of ids) await db.cards.update(id, { ...changes, updatedAt: nowISO() });
  });
}
export const demoSubject = 'Taylor Swift · Captions & albums';
export const demoQuestions = swiftieCaptions.map(({ caption, question, answer, chapter }) => [`${question}\n\nBijschrift: "${caption}"`, answer, chapter]);
export async function addDemoCards() {
  let count = 0;
  await db.transaction('rw', db.cards, async () => {
    const existing = new Set((await db.cards.toArray()).filter(card => !card.deleted).map(duplicateKey));
    for (const [question, answer, chapter] of demoQuestions) {
      const card = newCard({ question, answer, chapter, study: 'Voorbeeldstudie', subject: demoSubject, topic: chapter, explanation: 'Origineel bijschrift voor Linda, geen songtekst of citaat van Taylor Swift. Kleuren zijn creatieve associaties.', tags: ['voorbeeld', 'swiftie'] });
      if (!existing.has(duplicateKey(card))) { await db.cards.add(card); count++; }
    }
  });
  return count;
}