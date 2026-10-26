import type { Card as FsrsCard } from 'ts-fsrs';

export interface Entity { id: string; updatedAt: string; deleted?: boolean }
export interface Flashcard extends Entity {
  question: string; answer: string; explanation: string;
  study: string; subject: string; chapter: string; topic: string;
  difficulty: 'Makkelijk' | 'Gemiddeld' | 'Moeilijk'; tags: string[];
  createdAt: string; lastReview?: string; correct: number; incorrect: number;
  extra: boolean; source?: { name: string; page: number };
  scheduler: FsrsCard;
}
export type Grade = 'good' | 'hard' | 'again';
export type Mode = 'normal' | 'quick' | 'difficult' | 'exam' | 'focus' | 'mix' | 'boss';
export interface Review extends Entity {
  cardId: string; sessionId: string; grade: Grade; day: string; xp: number;
  seconds: number; comeback: boolean; chapter: string; topic: string;
}
export interface StudySession extends Entity {
  mode: Mode; queue: string[]; cursor: number; answers: number; goal: number;
  completed: boolean; startedAt: string; finishedAt?: string; bonus: number;
  chapter: string; timerMinutes: number;
  examAnswers?: { cardId: string; text: string; seconds: number }[];
}
export interface Settings extends Entity {
  theme: 'light' | 'dark' | 'system'; largeText: boolean; animations: boolean;
  goal: number; retention: number;
}
export interface Collection extends Entity { study: string; subject: string; chapter: string; topic: string }
export type SyncTable = 'cards' | 'reviews' | 'sessions' | 'settings' | 'collections';
export interface SyncMeta { key: string; owner: string; revision: number; fingerprint: string }
export interface Conflict { key: string; table: SyncTable; entityId: string; remote: Entity; revision: number; owner: string }