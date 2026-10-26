import Dexie, { type EntityTable } from 'dexie';
import { createEmptyCard } from 'ts-fsrs';
import type { Collection, Conflict, Flashcard, Review, Settings, StudySession, SyncMeta } from './types';

export class LearningDB extends Dexie {
  cards!: EntityTable<Flashcard, 'id'>;
  reviews!: EntityTable<Review, 'id'>;
  sessions!: EntityTable<StudySession, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  collections!: EntityTable<Collection, 'id'>;
  syncMeta!: EntityTable<SyncMeta, 'key'>;
  conflicts!: EntityTable<Conflict, 'key'>;
  constructor(name = 'lindas-leeravontuur') {
    super(name);
    this.version(1).stores({
      cards: 'id, subject, chapter, updatedAt', reviews: 'id, cardId, sessionId, day',
      sessions: 'id, updatedAt', settings: 'id', collections: 'id',
      syncMeta: 'key, owner', conflicts: 'key, owner'
    });
  }
}
export const db = new LearningDB();
export const nowISO = () => new Date().toISOString();
export const defaults: Settings = { id: 'preferences', updatedAt: '1970-01-01T00:00:00.000Z', theme: 'system', largeText: false, animations: true, goal: 15, retention: 0.9 };
export function newCard(input: Partial<Flashcard> = {}): Flashcard {
  return {
    id: crypto.randomUUID(), question: '', answer: '', explanation: '', study: 'Mijn studie',
    subject: 'Algemeen', chapter: 'Hoofdstuk 1', topic: '', difficulty: 'Gemiddeld', tags: [],
    createdAt: nowISO(), updatedAt: nowISO(), correct: 0, incorrect: 0, extra: false,
    scheduler: createEmptyCard(), ...input
  };
}
export function hydrateCard(card: Flashcard): Flashcard {
  return { ...card, scheduler: { ...card.scheduler, due: new Date(card.scheduler.due), last_review: card.scheduler.last_review ? new Date(card.scheduler.last_review) : undefined } };
}