import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ key: 'first', sync: vi.fn() }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: (_query: unknown, _dependencies: unknown, initial: unknown) => initial === '' ? mocks.key : [] }));
vi.mock('./sync', () => ({ localOwner: () => null, syncNow: mocks.sync, supabase: { auth: {
  getSession: async () => ({ data: { session: { user: { id: 'test-user' } } }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } })
} } }));
vi.mock('./db', () => ({ db: { conflicts: { count: async () => 0 } } }));
import { useCloud } from './useCloud';
afterEach(() => { vi.useRealTimers(); });
test('automatische synchronisatie blijft werken na een wijziging tijdens synchronisatie', async () => {
  vi.useFakeTimers(); let finish!: () => void;
  mocks.sync.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; })).mockResolvedValue(undefined);
  const { result, rerender } = renderHook(() => useCloud());
  await act(async () => {});
  await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
  expect(result.current.busy).toBe(true); expect(mocks.sync).toHaveBeenCalledTimes(1);
  mocks.key = 'changed-during-sync'; rerender();
  await act(async () => { finish(); }); expect(result.current.busy).toBe(false);
  await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
  expect(mocks.sync).toHaveBeenCalledTimes(2);
});