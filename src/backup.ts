import { db, hydrateCard } from './db';
import type { Entity, Flashcard, SyncTable } from './types';
export const syncTables: SyncTable[] = ['cards', 'reviews', 'sessions', 'settings', 'collections'];
export function fingerprint(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${fingerprint(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ongeldig gegevensobject.'); return value as Record<string, unknown>; }
export function validateEntity(table: SyncTable, value: unknown): Entity {
  const item = object(value);
  const text = (key: string, max = 50000) => { if (typeof item[key] !== 'string' || (item[key] as string).length > max) throw new Error(`Ongeldig tekstveld: ${key}.`); };
  const number = (key: string, min = 0, max = Number.MAX_SAFE_INTEGER) => { if (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || (item[key] as number) < min || (item[key] as number) > max) throw new Error(`Ongeldig getal: ${key}.`); };
  const date = (value: unknown) => { if (!(typeof value === 'string' || value instanceof Date) || !Number.isFinite(+new Date(value))) throw new Error('Ongeldige datum.'); };
  const strings = (value: unknown) => { if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error('Ongeldige lijst.'); };
  text('id', 200); if (!item.id) throw new Error('Een ID ontbreekt.'); date(item.updatedAt);
  if (item.deleted !== undefined && typeof item.deleted !== 'boolean') throw new Error('Ongeldige verwijderstatus.');
  if (table === 'cards') {
    ['question', 'answer', 'explanation', 'study', 'subject', 'chapter', 'topic'].forEach(key => text(key));
    if (!item.question || !item.answer) throw new Error('Vraag of antwoord ontbreekt.');
    if (!['Makkelijk', 'Gemiddeld', 'Moeilijk'].includes(String(item.difficulty))) throw new Error('Ongeldige moeilijkheid.');
    strings(item.tags); number('correct'); number('incorrect'); date(item.createdAt); if (item.lastReview) date(item.lastReview);
    if (typeof item.extra !== 'boolean') throw new Error('Ongeldige extra-oefenstatus.');
    const scheduler = object(item.scheduler); date(scheduler.due); if (scheduler.last_review) date(scheduler.last_review);
    for (const key of ['stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'reps', 'lapses', 'state', 'learning_steps']) if (typeof scheduler[key] !== 'number' || !Number.isFinite(scheduler[key]) || (scheduler[key] as number) < 0) throw new Error(`Ongeldige planning: ${key}.`);
    if (!Number.isInteger(scheduler.state) || Number(scheduler.state) > 3 || Number(scheduler.difficulty) > 10) throw new Error('Ongeldige herhaalstatus.');
    if (item.source) { const source = object(item.source); if (typeof source.name !== 'string' || !Number.isInteger(source.page) || Number(source.page) < 1) throw new Error('Ongeldige PDF-bron.'); }
    return hydrateCard(item as unknown as Flashcard);
  }
  if (table === 'reviews') {
    ['cardId', 'sessionId', 'day', 'chapter', 'topic'].forEach(key => text(key)); number('xp', 0, 10); number('seconds', 0, 120);
    if (!['good', 'hard', 'again'].includes(String(item.grade)) || typeof item.comeback !== 'boolean' || !/^\d{4}-\d{2}-\d{2}$/.test(String(item.day))) throw new Error('Ongeldige beoordeling.');
  }
  if (table === 'sessions') {
    strings(item.queue); number('cursor', 0, (item.queue as unknown[]).length); number('answers'); number('goal', 1, 1000); number('bonus', 0, 10); number('timerMinutes', 0, 25); text('chapter'); date(item.startedAt); if (item.finishedAt) date(item.finishedAt);
    if (!Number.isInteger(item.cursor) || typeof item.completed !== 'boolean' || !['normal', 'quick', 'difficult', 'exam', 'focus', 'mix', 'boss'].includes(String(item.mode))) throw new Error('Ongeldige sessie.');
    if (item.examAnswers !== undefined) { if (!Array.isArray(item.examAnswers)) throw new Error('Ongeldige quiz.'); for (const answer of item.examAnswers) { const entry = object(answer); if (typeof entry.cardId !== 'string' || typeof entry.text !== 'string' || typeof entry.seconds !== 'number' || !Number.isFinite(entry.seconds) || entry.seconds < 0 || entry.seconds > 120) throw new Error('Ongeldig quizantwoord.'); } }
  }
  if (table === 'settings') {
    if (item.id !== 'preferences' || !['light', 'dark', 'system'].includes(String(item.theme)) || typeof item.animations !== 'boolean' || typeof item.largeText !== 'boolean') throw new Error('Ongeldige voorkeuren.');
    number('goal', 5, 50); number('retention', 0.8, 0.95);
  }
  if (table === 'collections') ['study', 'subject', 'chapter', 'topic'].forEach(key => text(key, 200));
  return item as unknown as Entity;
}
export interface Backup { format: 'linda-leeravontuur'; version: 1; createdAt: string; tables: Record<SyncTable, Entity[]> }
export async function createBackup(): Promise<Backup> {
  return db.transaction('r', syncTables.map(table => db.table(table)), async () => {
    const tables = {} as Backup['tables']; for (const table of syncTables) tables[table] = await db.table(table).toArray();
    return { format: 'linda-leeravontuur', version: 1, createdAt: new Date().toISOString(), tables };
  });
}
export function parseBackup(raw: unknown): Backup {
  const backup = object(raw); if (backup.format !== 'linda-leeravontuur' || backup.version !== 1) throw new Error('Dit is geen ondersteunde back-up van Linda\'s Leeravontuur.');
  const input = object(backup.tables); const tables = {} as Backup['tables'];
  for (const table of syncTables) { if (!Array.isArray(input[table]) || input[table].length > 500000) throw new Error(`Ongeldige tabel: ${table}.`); tables[table] = input[table].map(item => validateEntity(table, item)); if (new Set(tables[table].map(item => item.id)).size !== tables[table].length) throw new Error('Dubbele IDs in de back-up.'); }
  return { format: 'linda-leeravontuur', version: 1, createdAt: String(backup.createdAt), tables };
}
export async function restoreBackup(raw: unknown, overwrite = false) {
  const backup = parseBackup(raw);
  return db.transaction('rw', syncTables.map(table => db.table(table)), async () => {
    let restored = 0; let skipped = 0;
    for (const table of syncTables) for (const entity of backup.tables[table]) {
      const existing = await db.table(table).get(entity.id);
      if (existing && fingerprint(existing) === fingerprint(entity)) continue;
      if (existing && !overwrite) { skipped++; continue; }
      await db.table(table).put({ ...entity, updatedAt: new Date().toISOString() }); restored++;
    }
    return { restored, skipped };
  });
}