import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DesktopState } from './domain';
import type { ThreadRepository } from './threadRepository';
import { readOptionalThreadSection } from './threadSections';

export function useThreadList(repository: ThreadRepository, connected: boolean, setState: Dispatch<SetStateAction<DesktopState>>, search = '') {
  const query = search.trim();
  const [matches, setMatches] = useState<{ query: string; ids: string[]; snippets?: Record<string, string> }>({ query: '', ids: [] });
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
      const result = await repository.query({ search: query, cursor: next });
      if (generation !== epoch.current) return;
      const nextCursor = result.nextCursor || undefined;
      if (nextCursor && (nextCursor === next || seen.current.has(nextCursor))) throw Error('会话分页游标重复，请重新连接后重试。');
      setMatches(previous => ({ query, snippets: { ...(next && previous.query === query ? previous.snippets : {}), ...Object.fromEntries((query ? result.data : []).map(item => [item.id, item.snippet || ''])) }, ids: [...new Set([...(next && previous.query === query ? previous.ids : []), ...result.data.map(item => item.id)])] }));
      setState(previous => {
        if (generation !== epoch.current) return previous;
        const threads = [...previous.threads];
        const ids = new Set(threads.map(thread => thread.remoteId));
        for (const item of result.data) {
          if (typeof item?.id !== 'string' || !item.id) continue;
          const section = readOptionalThreadSection(item.section);
          const hasProject = Object.prototype.hasOwnProperty.call(item, 'projectId');
          const projectId = typeof item.projectId === 'string' && item.projectId.trim() ? item.projectId : undefined;
          if (ids.has(item.id)) {
            const existing = threads.find(thread => thread.remoteId === item.id);
            if (existing && Object.prototype.hasOwnProperty.call(item, 'section')) {
              if (section) existing.sectionId = section.id; else delete existing.sectionId;
            }
            if (existing && hasProject) {
              if (projectId) existing.projectId = projectId; else delete existing.projectId;
            }
            if (existing && typeof item.daybreakEnabled === 'boolean') existing.daybreakEnabled = item.daybreakEnabled;
            continue;
          }
          ids.add(item.id);
          const timestamp = Number(item.updatedAt) * 1000;
          const updatedAt = new Date(Number.isFinite(timestamp) && Math.abs(timestamp) <= 8640000000000000 ? timestamp : 0).toISOString();
          const title = [item.name, item.preview].find(value => typeof value === 'string' && value.trim()) || 'Felix 对话';
          threads.push({ id: `remote-${item.id}`, remoteId: item.id, sectionId: section?.id, ...(projectId ? { projectId } : {}), ...(typeof item.daybreakEnabled === 'boolean' ? { daybreakEnabled: item.daybreakEnabled } : {}), title, cwd: item.cwd, status: item.status?.type === 'active' ? 'running' : 'completed', pinned: false, archived: false, messages: [], updatedAt });
        }
        return { ...previous, threads };
      });
      if (nextCursor) seen.current.add(nextCursor);
      setCursor(nextCursor);
    } catch (error) { if (generation === epoch.current) setError(error instanceof Error ? error.message : String(error)); }
    finally { if (generation === epoch.current) { lock.current = false; setLoading(false); } }
  }, [connected, setState, query, repository]);
  useEffect(() => {
    epoch.current++; lock.current = false; seen.current.clear(); setCursor(undefined); setError(''); setLoading(connected && !!query);
    setMatches({ query, ids: [] });
    if (connected && !query) void load();
    const timer = connected && query ? setTimeout(() => void load(), 300) : undefined;
    return () => { clearTimeout(timer); epoch.current++; };
  }, [connected, load]);
  return { matchingIds: matches.query === query ? matches.ids : [], snippets: matches.query === query ? matches.snippets || {} : {}, loading, error, hasMore: !!cursor, loadMore: () => load(cursor) };
}
