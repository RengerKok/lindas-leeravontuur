import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { User } from '@supabase/supabase-js';
import { db } from './db';
import { syncTables } from './backup';
import { localOwner, supabase, syncNow } from './sync';
export function useCloud() {
  const syncing = useRef(false);
  const [user, setUser] = useState<User | null>(null); const [status, setStatus] = useState(supabase ? 'Niet ingelogd' : 'Alleen op dit apparaat');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [lastSync, setLastSync] = useState(localStorage.getItem('linda-last-sync'));
  const conflicts = useLiveQuery(() => db.conflicts.toArray(), [], []);
  const changeKey = useLiveQuery(async () => { const parts = []; for (const table of syncTables) parts.push((await db.table(table).toArray()).map(item => `${item.id}:${item.updatedAt}`).join('|')); return parts.join(';'); }, [], '');
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data, error }) => { setUser(data.session?.user || null); if (error) setError('Je account kon niet worden geopend. Log opnieuw in.'); });
    const { data } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user || null));
    return () => data.subscription.unsubscribe();
  }, []);
  async function refresh() {
    if (!user || !supabase || syncing.current) return;
    if (!navigator.onLine) { setStatus('Offline, lokaal bewaard'); return; }
    if (localOwner() && localOwner() !== user.id) { setStatus('Ander account'); setError('Deze browsercollectie hoort bij een ander account. Log uit en gebruik het bijbehorende account of een apart browserprofiel.'); return; }
    syncing.current = true; setBusy(true); setError(''); setStatus('Bezig met synchroniseren');
    try { await syncNow(); const count = await db.conflicts.count(); setStatus(count ? `${count} conflict(en)` : 'Gesynchroniseerd'); setLastSync(localStorage.getItem('linda-last-sync')); }
    catch (error) { setError((error as Error).message); setStatus('Lokaal bewaard, sync mislukt'); } finally { syncing.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (!user) { setStatus(supabase ? 'Niet ingelogd' : 'Alleen op dit apparaat'); return; }
    const timeout = setTimeout(() => { void refresh(); }, 1200); const interval = setInterval(() => { void refresh(); }, 30000);
    const reconnect = () => { void refresh(); }; const offline = () => setStatus('Offline, lokaal bewaard');
    window.addEventListener('online', reconnect); window.addEventListener('offline', offline);
    return () => { clearTimeout(timeout); clearInterval(interval); window.removeEventListener('online', reconnect); window.removeEventListener('offline', offline); };
  }, [user?.id, changeKey]);
  return { user, status, error, busy, lastSync, conflicts, refresh };
}
export type CloudState = ReturnType<typeof useCloud>;