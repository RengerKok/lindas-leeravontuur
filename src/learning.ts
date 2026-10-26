import { fsrs, Rating } from 'ts-fsrs';
import { db, defaults, hydrateCard, nowISO } from './db';
import { dayKey } from './stats';
import type { Flashcard, Grade, Mode, StudySession } from './types';
export const isDifficult = (card: Flashcard) => card.extra || card.difficulty === 'Moeilijk' || card.incorrect > card.correct || card.scheduler.difficulty >= 7;
export const chapterKey = (card: Flashcard) => JSON.stringify([card.study, card.subject, card.chapter]);
export function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) { const target = Math.floor(Math.random() * (index + 1)); [result[index], result[target]] = [result[target], result[index]]; }
  return result;
}
export function buildQueue(cards: Flashcard[], mode: Mode, limit: number, now = new Date()): string[] {
  let available = cards.filter(card => !card.deleted);
  if (mode === 'difficult') available = available.filter(isDifficult);
  if (mode === 'normal' || mode === 'focus') {
    const due = available.filter(card => card.scheduler.reps > 0 && new Date(card.scheduler.due) <= now).sort((left, right) => +new Date(left.scheduler.due) - +new Date(right.scheduler.due));
    const fresh = shuffled(available.filter(card => card.scheduler.reps === 0)); available = [];
    while (due.length || fresh.length) { if (due.length) available.push(due.shift()!); if (fresh.length) available.push(fresh.shift()!); }
  } else if (mode === 'mix') {
    const subjects = shuffled([...new Set(available.map(card => `${card.study}\u001f${card.subject}`))]);
    const groups = subjects.map(subject => shuffled(available.filter(card => `${card.study}\u001f${card.subject}` === subject)));
    available = [];
    while (groups.some(group => group.length)) for (const group of groups) if (group.length) available.push(group.shift()!);
  } else available = shuffled(available);
  return available.slice(0, limit).map(card => card.id);
}
export async function startSession(mode: Mode, chapter = '', timerMinutes = 0, chapters: string[] = []) {
  if (mode === 'boss' && !chapter) throw new Error('Kies een hoofdstuk voor je Boss Battle.');
  if (mode === 'exam' && !chapters.length && !chapter) throw new Error('Kies minimaal een hoofdstuk voor de examentraining.');
  const settings = await db.settings.get('preferences') || defaults;
  const matches = (card: Flashcard, choice: string) => chapterKey(card) === choice || card.chapter === choice;
  const cards = (await db.cards.toArray()).filter(card => (!chapter || matches(card, chapter)) && (!chapters.length || chapters.some(choice => matches(card, choice))));
  const goal = mode === 'quick' || mode === 'boss' ? 10 : settings.goal;
  const queue = buildQueue(cards, mode, goal);
  if (!queue.length) throw new Error(mode === 'normal' || mode === 'focus' ? 'Alles is bijgewerkt, Linda! Kies een snelle ronde om alvast verder te oefenen.' : 'Er zijn geen passende vragen. Voeg eerst flashcards toe.');
  if (mode === 'boss' && queue.length < 10) throw new Error('Een Boss Battle heeft minimaal 10 vragen in hetzelfde hoofdstuk nodig.');
  const session: StudySession = { id: crypto.randomUUID(), mode, queue, cursor: 0, answers: 0, goal: queue.length, completed: false, startedAt: nowISO(), updatedAt: nowISO(), bonus: 0, chapter, timerMinutes };
  await db.sessions.add(session); return session;
}
export function repeatInQueue(queue: string[], cursor: number, grade: Grade): string[] {
  if (grade === 'good') return [...queue];
  const failedId = queue[cursor]; const gap = grade === 'again' ? 3 : 5;
  const remaining = queue.slice(cursor + 1).filter(id => id !== failedId);
  if (remaining.length < gap) {
    const fillers = [...new Set(queue.slice(0, cursor))].filter(id => id !== failedId && !remaining.includes(id));
    remaining.push(...fillers.slice(0, gap - remaining.length));
  }
  remaining.splice(Math.min(gap, remaining.length), 0, failedId);
  return [...queue.slice(0, cursor + 1), ...remaining];
}
export async function answerCard(sessionId: string, expectedCursor: number, grade: Grade, seconds = 0, now = new Date()) {
  if (!['good', 'hard', 'again'].includes(grade)) throw new Error('Ongeldige beoordeling.');
  return db.transaction('rw', db.cards, db.sessions, db.reviews, db.settings, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session || session.completed || session.cursor !== expectedCursor) return null;
    const id = `${sessionId}:${expectedCursor}`; if (await db.reviews.get(id)) return null;
    const card = await db.cards.get(session.queue[expectedCursor]);
    if (!card || card.deleted) {
      const queue = session.queue.filter((_, index) => index !== expectedCursor);
      await db.sessions.update(session.id, { queue, completed: expectedCursor >= queue.length, updatedAt: now.toISOString() }); return null;
    }
    const settings = await db.settings.get('preferences') || defaults;
    const scheduler = fsrs({ request_retention: settings.retention, enable_fuzz: false });
    const rating = grade === 'good' ? Rating.Good : grade === 'hard' ? Rating.Hard : Rating.Again;
    const scheduled = scheduler.next(hydrateCard(card).scheduler, now, rating);
    const today = dayKey(now); const previousToday = (await db.reviews.where('day').equals(today).toArray()).filter(review => review.cardId === card.id);
    const xp = (previousToday.length ? 0 : 5) + (grade === 'good' && !previousToday.some(review => review.grade === 'good') ? 5 : 0);
    const previousReviews = await db.reviews.where('cardId').equals(card.id).toArray();
    await db.reviews.add({ id, updatedAt: now.toISOString(), cardId: card.id, sessionId, grade, day: today, xp, seconds: Math.max(0, Math.min(120, Math.round(seconds))), comeback: grade === 'good' && card.incorrect > 0 && !previousReviews.some(review => review.comeback), chapter: card.chapter, topic: card.topic || card.chapter });
    await db.cards.update(card.id, { scheduler: scheduled.card, correct: card.correct + Number(grade === 'good'), incorrect: card.incorrect + Number(grade === 'again'), lastReview: now.toISOString(), updatedAt: now.toISOString() });
    const queue = repeatInQueue(session.queue, expectedCursor, grade);
    const cursor = expectedCursor + 1; const completed = cursor >= queue.length;
    const earned = (await db.reviews.where('sessionId').equals(sessionId).toArray()).reduce((total, review) => total + review.xp, 0);
    const updated: StudySession = { ...session, queue, cursor, answers: session.answers + 1, completed, bonus: completed && earned > 0 ? 10 : 0, updatedAt: now.toISOString(), ...(completed ? { finishedAt: now.toISOString() } : {}) };
    await db.sessions.put(updated); return updated;
  });
}
export async function finishSession(id: string) { await db.sessions.update(id, { completed: true, finishedAt: nowISO(), updatedAt: nowISO() }); }
export async function recordExamAnswer(id: string, expectedIndex: number, text: string, seconds: number) {
  if (!text.trim()) throw new Error('Schrijf je antwoord op, of vul in dat je het nog niet weet.');
  return db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(id);
    if (!session || session.completed || (session.examAnswers?.length || 0) !== expectedIndex || expectedIndex >= session.goal) return false;
    const examAnswers = [...(session.examAnswers || []), { cardId: session.queue[expectedIndex], text: text.slice(0, 50000), seconds: Math.max(0, Math.min(120, seconds)) }];
    await db.sessions.update(id, { examAnswers, updatedAt: nowISO() }); return true;
  });
}