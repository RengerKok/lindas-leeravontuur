import { expect, test } from 'vitest';
import { badges, dayKey, longestStreak, statistics } from './stats';
import type { Review } from './types';
const review = (cardId: string, day: string): Review => ({ id: crypto.randomUUID(), updatedAt: new Date().toISOString(), cardId, sessionId: 's', grade: 'good', day, xp: 10, seconds: 10, comeback: false, chapter: 'Test', topic: 'Test' });
test('XP en missie worden niet dubbel toegekend na herhaald oefenen of samenvoegen', () => {
  const reviews = Array.from({ length: 10 }, (_, index) => review(String(index), dayKey()));
  const stats = statistics([], [...reviews, ...reviews.map(item => ({ ...item, id: crypto.randomUUID() }))], []);
  expect(stats.xp).toBe(120); expect(stats.mission).toBe(10); expect(stats.today).toBe(20);
});
test('verdiende reeksbadges blijven na een gemiste dag behouden', () => {
  const reviews = ['2026-09-29', '2026-09-30', '2026-10-01'].map(day => review('card', day));
  expect(longestStreak(reviews)).toBe(3); expect(badges(reviews, []).find(badge => badge.title === 'Doorzetter')?.earned).toBe(true);
});