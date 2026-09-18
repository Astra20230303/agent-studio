import { useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { listArchivedThreads, searchThreads, unarchiveThread } from './codexClient';
import type { Thread } from './domain';
import { threadPage } from './threadPage';

export function ArchivedThreads({ threads, connected, onRestore, onClose }: { threads: Thread[]; connected: boolean; onRestore: (thread: Thread) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [remote, setRemote] = useState<(Thread & { snippet?: string })[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState('');
  const lock = useRef(false);
  const restoreLock = useRef(false);
  const generation = useRef(0);
  const cursors = useRef(new Set<string>());
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  const load = async (next?: string) => {
    if (!connected || lock.current || restoreLock.current) return;
    const token = generation.current;
    lock.current = true; setLoading(true); setError('');
    if (!next) cursors.current.clear();
    try {
      const response = search ? await searchThreads(search, next, true) : await listArchivedThreads(next);
      if (search && (!Array.isArray(response?.data) || response.data.some((item: any) => !item?.thread?.id || typeof item.snippet !== 'string'))) throw Error('归档搜索结果无效，请重试');
      const result = threadPage(search ? { ...response, data: response.data.map((item: any) => ({ ...item.thread, snippet: item.snippet })) } : response);
      if (token !== generation.current) return;
      if (result.nextCursor && (result.nextCursor === next || cursors.current.has(result.nextCursor))) throw Error('归档分页游标重复');
      const entries: (Thread & { snippet?: string })[] = result.data.map((item: any) => ({ snippet: item.snippet, id: `remote-${item.id}`, remoteId: item.id, title: item.name || item.preview || '归档会话', cwd: item.cwd, status: 'completed', pinned: false, archived: true, messages: [], updatedAt: new Date().toISOString() }));
      setRemote(previous => [...new Map([...(next ? previous : []), ...entries].map(thread => [thread.remoteId, thread])).values()]);
      setCursor(result.nextCursor || undefined);
      if (result.nextCursor) cursors.current.add(result.nextCursor);
    } catch (error) { if (token === generation.current) setError(String(error)); }
    finally { if (token === generation.current) { lock.current = false; setLoading(false); } }
  };
  useEffect(() => { generation.current++; lock.current = false; setLoading(false); setRemote([]); setCursor(undefined); void load(); return () => { generation.current++; }; }, [connected, search]);
  const restore = async (thread: Thread) => {
    if (lock.current || restoreLock.current || (thread.remoteId && !connected)) return;
    restoreLock.current = true; setRestoring(thread.id); setError('');
    try {
      if (thread.remoteId) await unarchiveThread(thread.remoteId);
      setRemote(current => current.filter(item => item.remoteId !== thread.remoteId));
      onRestore(thread);
    } catch (error) { setError(String(error)); }
    finally { restoreLock.current = false; setRestoring(''); }
  };
  const local = threads.filter(thread => thread.archived && (!search || thread.title.toLowerCase().includes(search.toLowerCase()) || thread.messages.some(message => message.content.toLowerCase().includes(search.toLowerCase())) || remote.some(item => item.remoteId === thread.remoteId)));
  const snippets = Object.fromEntries(remote.map(item => [item.remoteId, item.snippet]));
  const entries = [...local, ...remote.filter(thread => !local.some(item => item.remoteId === thread.remoteId)).map(thread => ({ ...thread, ...threads.find(item => item.remoteId === thread.remoteId), archived: true }))];
  return <dialog ref={dialog} className="task-modal" aria-label="归档会话" onCancel={event => { event.preventDefault(); if (!restoreLock.current) onClose(); }}><header><h2>归档会话</h2><button disabled={!!restoring} aria-label="关闭归档会话" title="关闭" onClick={onClose}><X size={16} /></button></header>
    <form onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }}><input aria-label="搜索归档内容" placeholder="标题或消息内容" value={query} disabled={!!restoring} onChange={event => setQuery(event.target.value)} /><button disabled={!!restoring}>搜索归档</button>{search && <button type="button" disabled={!!restoring} onClick={() => { setQuery(''); setSearch(''); }}>清除归档搜索</button>}</form><p>在线搜索已归档的历史消息；离线仅搜索本机已加载内容。</p>
    {error && <p role="alert">{error}</p>}{!connected && <p role="status">未连接，远端归档暂不可用。</p>}
    <button disabled={!connected || loading || !!restoring} onClick={() => void load()}>刷新归档</button>
    {entries.map(thread => <div key={thread.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}><span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{thread.title}{thread.remoteId && snippets[thread.remoteId] && <small style={{ display: 'block' }}>{snippets[thread.remoteId]?.slice(0, 300)}</small>}</span><button aria-label={`恢复 ${thread.title}`} title="恢复会话" disabled={loading || !!restoring || (!!thread.remoteId && !connected)} onClick={() => void restore(thread)}><RotateCcw size={16} /></button></div>)}
    {loading && <p role="status">正在加载…</p>}{!loading && !error && !entries.length && <p>{search ? '没有匹配的归档会话。' : '暂无归档会话。'}</p>}
    {cursor && <button disabled={loading || !!restoring || !connected} onClick={() => void load(cursor)}>加载更多归档</button>}
  </dialog>;
}
