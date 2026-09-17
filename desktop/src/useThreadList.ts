import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DesktopState } from './domain';
import { listThreads } from './codexClient';

export function useThreadList(connected: boolean, setState: Dispatch<SetStateAction<DesktopState>>) {
  const [cursor, setCursor] = useState<string>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const epoch = useRef(0);
  const lock = useRef(false);
  const seen = useRef(new Set<string>());
  const load = useCallback(async (next?: string) => {
    if (!connected || lock.current) return;
    const generation = epoch.current;
    lock.current = true; setLoading(true); setError('');
    try {
      const result = await listThreads(next);
      if (generation !== epoch.current) return;
      const nextCursor = result.nextCursor || undefined;
      if (nextCursor && (nextCursor === next || seen.current.has(nextCursor))) throw Error('会话分页游标重复，请重新连接后重试。');
      setState(previous => {
        const threads = [...previous.threads];
        const ids = new Set(threads.map(thread => thread.remoteId));
        for (const item of result.data || result.threads || []) {
          if (!item.id || ids.has(item.id)) continue;
          ids.add(item.id);
          threads.push({ id: `remote-${item.id}`, remoteId: item.id, title: item.name || item.preview || 'Felix 对话', cwd: item.cwd, status: item.status?.type === 'active' ? 'running' : 'completed', pinned: false, archived: false, messages: [], updatedAt: new Date((item.updatedAt || 0) * 1000).toISOString() });
        }
        return { ...previous, threads };
      });
      if (nextCursor) seen.current.add(nextCursor);
      setCursor(nextCursor);
    } catch (error) { if (generation === epoch.current) setError(error instanceof Error ? error.message : String(error)); }
    finally { if (generation === epoch.current) { lock.current = false; setLoading(false); } }
  }, [connected, setState]);
  useEffect(() => {
    epoch.current++; lock.current = false; seen.current.clear(); setCursor(undefined); setError(''); setLoading(false);
    if (connected) void load();
    return () => { epoch.current++; };
  }, [connected, load]);
  return { loading, error, hasMore: !!cursor, loadMore: () => load(cursor) };
}
