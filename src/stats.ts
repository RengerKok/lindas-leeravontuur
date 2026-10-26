import type { Flashcard, Review, StudySession } from './types';
export function dayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export const dueCards = (cards: Flashcard[], now = new Date()) => cards.filter(card => !card.deleted && new Date(card.scheduler.due) <= now);
export const mastery = (card: Flashcard) => Math.min(100, Math.round(card.scheduler.stability / 30 * 100));
export function streak(reviews: Review[], today = new Date()) {
  const days = new Set(reviews.map(review => review.day)); const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(dayKey(cursor))) { count++; cursor.setDate(cursor.getDate() - 1); }
  return count;
}
export function statistics(cards: Flashcard[], reviews: Review[], sessions: StudySession[]) {
  const daily = new Map<string, Set<string>>(); const rewarded = new Map<string, boolean>();
  for (const review of reviews) {
    if (!daily.has(review.day)) daily.set(review.day, new Set());
    daily.get(review.day)!.add(review.cardId);
    const key = `${review.day}:${review.cardId}`;
    rewarded.set(key, rewarded.get(key) || review.grade === 'good');
  }
  const missionDays = [...daily.values()].filter(items => items.size >= 10).length;
  const xp = [...rewarded.values()].reduce((total, correct) => total + (correct ? 10 : 5), 0) + sessions.reduce((total, session) => total + session.bonus, 0) + missionDays * 20;
  return { xp, level: Math.floor(xp / 200) + 1, today: reviews.filter(review => review.day === dayKey()).length, mission: daily.get(dayKey())?.size || 0, due: dueCards(cards).length, streak: streak(reviews), correct: reviews.length ? Math.round(reviews.filter(review => review.grade === 'good').length / reviews.length * 100) : 0 };
}
export function longestStreak(reviews: Review[]) {
  const days = [...new Set(reviews.map(review => review.day))].sort(); let best = 0; let current = 0; let previous = '';
  for (const day of days) {
    const date = new Date(`${day}T12:00:00`); date.setDate(date.getDate() - 1);
    current = dayKey(date) === previous ? current + 1 : 1; previous = day; best = Math.max(best, current);
  }
  return best;
}
export function badges(reviews: Review[], sessions: StudySession[]) {
  const longest = longestStreak(reviews);
  return [
    { title: 'Eerste stap', description: '10 vragen geoefend', earned: reviews.length >= 10 },
    { title: 'Doorzetter', description: '3 dagen achter elkaar', earned: longest >= 3 },
    { title: 'Studieheld', description: '100 vragen geoefend', earned: reviews.length >= 100 },
    { title: 'Comeback-kampioen', description: '10 lastige kaarten overwonnen', earned: new Set(reviews.filter(review => review.comeback).map(review => review.cardId)).size >= 10 },
    { title: 'Hoofdstukheld', description: '80% goed in een Boss Battle', earned: sessions.some(session => session.mode === 'boss' && session.completed && session.answers >= 10 && reviews.filter(review => review.sessionId === session.id && review.grade === 'good' && Number(review.id.split(':').pop()) < 10).length >= 8) },
    { title: 'Superstudent', description: '7 dagen achter elkaar', earned: longest >= 7 }
  ];
}
export const motivations = ['Iedere vraag maakt je sterker.', 'Een kleine stap vandaag is vooruitgang voor morgen.', 'Je hoeft niet alles meteen te weten.', 'Geef jezelf de ruimte om te groeien.', 'Een foutje is gewoon een kans om te leren.', 'Jouw inzet telt, Linda.', 'Nieuwe kennis begint met nieuwsgierigheid.'];
export function dailyMotivation() { return motivations[Math.floor(Date.now() / 86400000) % motivations.length]; }