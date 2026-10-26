import { db, newCard, nowISO } from './db';
import type { Flashcard } from './types';

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
export const demoQuestions = [
  ['Wat is actief ophalen?', 'Kennis uit je geheugen terughalen zonder naar de tekst te kijken.', 'Leren leren'],
  ['Wat betekent gespreid leren?', 'Oefenmomenten over meerdere dagen verdelen.', 'Leren leren'],
  ['Waarom helpt voldoende slaap bij leren?', 'Tijdens de slaap wordt nieuwe informatie verwerkt en verankerd.', 'Leren leren'],
  ['Wat is een leerdoel?', 'Een concrete beschrijving van wat je na het leren wilt kunnen.', 'Leren leren'],
  ['Wat is een mindmap?', 'Een visueel overzicht met een centraal begrip en samenhangende vertakkingen.', 'Leren leren'],
  ['Wat betekent reflecteren?', 'Bewust terugkijken op je aanpak en bedenken wat je kunt verbeteren.', 'Leren leren'],
  ['Wat is een samenvatting?', 'Een korte weergave van de belangrijkste informatie.', 'Leren leren'],
  ['Wat is voorkennis?', 'Kennis die je al hebt voordat je iets nieuws leert.', 'Leren leren'],
  ['Waarom zijn pauzes nuttig?', 'Ze helpen je aandacht te herstellen.', 'Leren leren'],
  ['Wat is een voorbeeld van een meetbaar leerdoel?', 'Aan het einde van de week kan ik vijf kernbegrippen uitleggen.', 'Leren leren'],
  ['Hoeveel minuten zitten er in een uur?', '60 minuten.', 'Alledaagse kennis'],
  ['Hoeveel zijden heeft een driehoek?', 'Drie zijden.', 'Alledaagse kennis'],
  ['Wat is de helft van 80?', '40.', 'Alledaagse kennis'],
  ['Hoe heet water in vaste vorm?', 'IJs.', 'Alledaagse kennis'],
  ['Welke planeet is onze thuisplaneet?', 'De aarde.', 'Alledaagse kennis'],
  ['Wat meet een thermometer?', 'Temperatuur.', 'Alledaagse kennis'],
  ['Wat is een synoniem?', 'Een woord met ongeveer dezelfde betekenis als een ander woord.', 'Alledaagse kennis'],
  ['Wat is een antoniem?', 'Een woord met een tegengestelde betekenis.', 'Alledaagse kennis'],
  ['Wat betekent chronologisch?', 'In volgorde van tijd.', 'Alledaagse kennis'],
  ['Hoeveel centimeter is een meter?', '100 centimeter.', 'Alledaagse kennis']
];
export async function addDemoCards() {
  let count = 0;
  await db.transaction('rw', db.cards, async () => {
    const existing = new Set((await db.cards.toArray()).filter(card => !card.deleted).map(duplicateKey));
    for (const [question, answer, chapter] of demoQuestions) {
      const card = newCard({ question, answer, chapter, study: 'Voorbeeldstudie', subject: 'Fictief oefenmateriaal', topic: chapter, tags: ['voorbeeld'] });
      if (!existing.has(duplicateKey(card))) { await db.cards.add(card); count++; }
    }
  });
  return count;
}