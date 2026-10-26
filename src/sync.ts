import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { db } from './db';
import { fingerprint, syncTables, validateEntity } from './backup';
import type { Conflict, Entity, SyncMeta, SyncTable } from './types';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export interface RemoteRecord { kind: SyncTable; entity_id: string; revision: number; payload: Entity }
export function syncDecision(local: Entity | undefined, remote: RemoteRecord | undefined, meta: SyncMeta | undefined): 'push' | 'pull' | 'same' | 'conflict' {
  if (!local) return remote ? 'pull' : 'same';
  if (!remote) return 'push';
  const localPrint = fingerprint(local); const remotePrint = fingerprint(remote.payload);
  if (localPrint === remotePrint) return 'same';
  const localDirty = !meta || localPrint !== meta.fingerprint;
  const remoteDirty = !meta || remote.revision !== meta.revision;
  return localDirty && remoteDirty ? 'conflict' : localDirty ? 'push' : 'pull';
}
let running = false;
const ownerKey = 'linda-sync-owner';
export function localOwner() { return localStorage.getItem(ownerKey); }
export function bindOwner(owner: string) { const previous = localOwner(); if (previous && previous !== owner) throw new Error('Deze lokale collectie hoort bij een ander account. Gebruik een apart browserprofiel voor een ander account.'); localStorage.setItem(ownerKey, owner); }
async function conflictFor(owner: string, table: SyncTable, remote: RemoteRecord) {
  await db.conflicts.put({ key: `${owner}:${table}:${remote.entity_id}`, owner, table, entityId: remote.entity_id, revision: remote.revision, remote: remote.payload });
}
export async function syncNow(client: SupabaseClient | null = supabase) {
  if (!client || running) return;
  if (!navigator.onLine) throw new Error('Je bent offline. Je wijzigingen blijven lokaal bewaard.');
  running = true;
  try {
    const { data: { session } } = await client.auth.getSession(); if (!session) return;
    const owner = session.user.id; bindOwner(owner);
    for (const table of syncTables) {
      const remote = new Map<string, RemoteRecord>(); let offset = 0;
      for (;;) {
        const { data, error } = await client.from('learning_records').select('kind,entity_id,revision,payload').eq('user_id', owner).eq('kind', table).order('entity_id').range(offset, offset + 499);
        if (error) throw new Error('Synchroniseren lukt niet. Controleer je internetverbinding en de Supabase-configuratie.');
        for (const record of data || []) { const payload = validateEntity(table, record.payload); if (payload.id !== record.entity_id) throw new Error('Ongeldige cloudgegevens.'); remote.set(record.entity_id, { ...record, payload } as RemoteRecord); }
        if (!data || data.length < 500) break; offset += 500;
      }
      const ids = new Set([...remote.keys(), ...(await db.table(table).toArray()).map((entity: Entity) => entity.id)]);
      for (const id of ids) {
        const metaKey = `${owner}:${table}:${id}`; if (await db.conflicts.get(metaKey)) continue;
        const cloud = remote.get(id);
        let push: { local: Entity; expected: number } | undefined;
        await db.transaction('rw', db.table(table), db.syncMeta, db.conflicts, async () => {
          const local = await db.table(table).get(id) as Entity | undefined; const meta = await db.syncMeta.get(metaKey); const decision = syncDecision(local, cloud, meta);
          if (decision === 'conflict' && cloud) await conflictFor(owner, table, cloud);
          else if ((decision === 'pull' || decision === 'same') && cloud) {
            if (decision === 'pull') await db.table(table).put(cloud.payload);
            await db.syncMeta.put({ key: metaKey, owner, revision: cloud.revision, fingerprint: fingerprint(cloud.payload) });
          } else if (decision === 'push' && local) push = { local, expected: meta?.revision || 0 };
        });
        if (push) {
          const snapshot: { local: Entity; expected: number } = push;
          const { data, error } = await client.rpc('put_learning_record', { p_owner: owner, p_kind: table, p_entity_id: id, p_expected_revision: snapshot.expected, p_payload: JSON.parse(JSON.stringify(snapshot.local)) });
          if (error || !data) throw new Error('Cloudwijziging kon niet worden opgeslagen. Je lokale gegevens zijn behouden.');
          if (data.accepted) await db.syncMeta.put({ key: metaKey, owner, revision: data.record.revision, fingerprint: fingerprint(snapshot.local) });
          else if (data.record) { const payload = validateEntity(table, data.record.payload); await conflictFor(owner, table, { ...data.record, payload }); }
          else throw new Error('De cloudversie is niet meer beschikbaar. Exporteer een back-up en controleer de backend.');
        }
      }
    }
    localStorage.setItem('linda-last-sync', new Date().toISOString());
  } finally { running = false; }
}
export async function resolveConflict(conflict: Conflict, choice: 'local' | 'remote' | 'both') {
  if (localOwner() !== conflict.owner) throw new Error('Log in met het bijbehorende account.');
  await db.transaction('rw', db.table(conflict.table), db.syncMeta, db.conflicts, async () => {
    const local = await db.table(conflict.table).get(conflict.entityId) as Entity | undefined;
    if (choice === 'both' && local && conflict.table === 'cards') {
      const copy = { ...local, id: crypto.randomUUID(), updatedAt: new Date().toISOString() }; await db.cards.put(validateEntity('cards', copy) as import('./types').Flashcard);
    }
    if (choice !== 'local') await db.table(conflict.table).put(validateEntity(conflict.table, conflict.remote));
    await db.syncMeta.put({ key: conflict.key, owner: conflict.owner, revision: conflict.revision, fingerprint: fingerprint(conflict.remote) });
    await db.conflicts.delete(conflict.key);
  });
}