import { useLayoutEffect, useState, type SetStateAction } from 'react';
import { persistentStorage } from './persistentStorage';

export type DraftSchema<T> = { key: string; empty: () => T; valid: (value: unknown) => value is T; removeEmpty?: (value: T) => boolean };
export function useDraftStorage<T>(schema: DraftSchema<T>, threadId?: string) {
  const read = (): Record<string, T> => {
    const data = JSON.parse(persistentStorage.getItem(schema.key) ?? '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.values(data).every(schema.valid)) throw Error('草稿格式无效');
    return data;
  };
  const compact = (data: Record<string, T>) => Object.fromEntries(Object.entries(data).filter(([, value]) => !schema.removeEmpty?.(value))) as Record<string, T>;
  const [loaded] = useState(() => {
    try { return { drafts: read(), failed: false }; }
    catch { return { drafts: {} as Record<string, T>, failed: true }; }
  });
  const [drafts, setDrafts] = useState(loaded.drafts);
  const [readFailed, setReadFailed] = useState(loaded.failed);
  const [saveFailed, setSaveFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useLayoutEffect(() => {
    if (readFailed) return;
    let disposed = false;
    void persistentStorage.setItem(schema.key, JSON.stringify(drafts)).then(() => { if (!disposed) setSaveFailed(false); }, () => { if (!disposed) setSaveFailed(true); });
    return () => { disposed = true; };
  }, [drafts, readFailed, attempt, schema.key]);
  const id = threadId || 'new';
  const set = (value: SetStateAction<T>, target = id) => setDrafts(previous => {
    const current = Object.hasOwn(previous, target) ? previous[target] : schema.empty();
    const next = { ...previous, [target]: typeof value === 'function' ? (value as (current: T) => T)(current) : value };
    // Keep explicit removals while unread data may still contain that thread.
    return readFailed ? next : compact(next);
  });
  const retry = () => {
    if (!readFailed) { setAttempt(value => value + 1); return; }
    try {
      const restored = read();
      setDrafts(previous => compact({ ...restored, ...previous }));
      setReadFailed(false);
    } catch { /* No writes until a complete valid record can be read. */ }
  };
  return [Object.hasOwn(drafts, id) ? drafts[id] : schema.empty(), set, { readFailed, saveFailed, retry }] as const;
}
