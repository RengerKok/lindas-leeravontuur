import { beforeEach, expect, test } from 'vitest';
import { db, newCard } from './db';
import { fingerprint, createBackup, restoreBackup, parseBackup } from './backup';
import { syncDecision, resolveConflict, bindOwner } from './sync';
beforeEach(async () => { await Promise.all([db.cards.clear(), db.reviews.clear(), db.sessions.clear(), db.settings.clear(), db.collections.clear(), db.syncMeta.clear(), db.conflicts.clear()]); localStorage.clear(); });
test('back-up rondreis en samenvoegen overschrijven niet ongemerkt', async () => {
  const card = newCard({ question: 'Vraag', answer: 'Antwoord', correct: 4 }); await db.cards.add(card);
  const raw = JSON.parse(JSON.stringify(await createBackup())); await db.cards.clear();
  expect((await restoreBackup(raw)).restored).toBe(1); expect((await db.cards.get(card.id))?.correct).toBe(4);
  await db.cards.update(card.id, { answer: 'Nieuwe versie' }); expect((await restoreBackup(raw)).skipped).toBe(1);
  expect((await db.cards.get(card.id))?.answer).toBe('Nieuwe versie');
  raw.tables.cards[0].scheduler.stability = 'onveilig'; expect(() => parseBackup(raw)).toThrow('planning');
});
test('gelijktijdige wijzigingen geven een conflict, geen last-write-wins', () => {
  const original = newCard({ question: 'Vraag', answer: 'Oud' }); const local = { ...original, answer: 'Lokaal' };
  const remote = { kind: 'cards' as const, entity_id: original.id, revision: 2, payload: { ...original, answer: 'Cloud' } };
  const meta = { key: 'key', owner: 'owner', revision: 1, fingerprint: fingerprint(original) };
  expect(syncDecision(local, remote, meta)).toBe('conflict'); expect(syncDecision(original, remote, meta)).toBe('pull');
  expect(syncDecision(local, { ...remote, revision: 1, payload: original }, meta)).toBe('push');
});
test('beide versies bewaren behoudt twee kaarten en accounts kunnen niet mengen', async () => {
  bindOwner('linda'); expect(() => bindOwner('anders')).toThrow('ander account');
  const local = newCard({ question: 'Vraag', answer: 'Lokaal' }); await db.cards.add(local);
  const conflict = { key: 'linda:cards:test', owner: 'linda', table: 'cards' as const, entityId: local.id, revision: 2, remote: { ...local, answer: 'Cloud' } };
  await db.conflicts.put(conflict); await resolveConflict(conflict, 'both');
  expect((await db.cards.toArray()).map(card => card.answer).sort()).toEqual(['Cloud', 'Lokaal']); expect(await db.conflicts.count()).toBe(0);
});