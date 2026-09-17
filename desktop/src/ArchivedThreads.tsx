import { useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { listArchivedThreads, unarchiveThread } from './codexClient';
import type { Thread } from './domain';

export function ArchivedThreads({ threads, connected, onRestore, onClose }: { threads: Thread[]; connected: boolean; onRestore: (thread: Thread) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [remote, setRemote] = useState<Thread[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState('');
  const lock = useRef(false);
  const generation = useRef(0);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  const load = async (next?: string) => {
    if (!connected || lock.current) return;
    const token = generation.current;
    lock.current = true; setLoading(true); setError('');
    try {
      const result = await listArchivedThreads(next);
      if (token !== generation.current) return;
      if (result.nextCursor && result.nextCursor === next) throw Error('归档分页游标重复');
      const entries: Thread[] = result.data.map((item: any) => ({ id: `remote-${item.id}`, remoteId: item.id, title: item.name || item.preview || '归档会话', cwd: item.cwd, status: 'completed', pinned: false, archived: true, messages: [], updatedAt: new Date().toISOString() }));
      setRemote(previous => [...new Map([...(next ? previous : []), ...entries].map(thread => [thread.remoteId, thread])).values()]);
      setCursor(result.nextCursor || undefined);
    } catch (error) { if (token === generation.current) setError(String(error)); }
    finally { if (token === generation.current) { lock.current = false; setLoading(false); } }
  };
  useEffect(() => { generation.current++; lock.current = false; setLoading(false); setRemote([]); setCursor(undefined); void load(); return () => { generation.current++; }; }, [connected]);
  const restore = async (thread: Thread) => {
    if (lock.current) return;
    lock.current = true; setRestoring(thread.id); setError('');
    try {
      if (thread.remoteId) await unarchiveThread(thread.remoteId);
      setRemote(current => current.filter(item => item.remoteId !== thread.remoteId));
      onRestore(thread);
    } catch (error) { setError(String(error)); }
    finally { lock.current = false; setRestoring(''); }
  };
  const local = threads.filter(thread => thread.archived);
  const entries = [...local, ...remote.filter(thread => !threads.some(item => item.remoteId === thread.remoteId))];
  return <dialog ref={dialog} className="task-modal" aria-label="归档会话" onCancel={event => { event.preventDefault(); onClose(); }}><header><h2>归档会话</h2><button aria-label="关闭归档会话" title="关闭" onClick={onClose}><X size={16} /></button></header>
    {error && <p role="alert">{error}</p>}{!connected && <p role="status">未连接，远端归档暂不可用。</p>}
    <button disabled={!connected || loading || !!restoring} onClick={() => void load()}>刷新归档</button>
    {entries.map(thread => <div key={thread.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}><span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{thread.title}</span><button aria-label={`恢复 ${thread.title}`} title="恢复会话" disabled={loading || !!restoring || (!!thread.remoteId && !connected)} onClick={() => void restore(thread)}><RotateCcw size={16} /></button></div>)}
    {loading && <p role="status">正在加载…</p>}{!loading && !entries.length && <p>暂无归档会话。</p>}
    {cursor && <button disabled={loading || !!restoring || !connected} onClick={() => void load(cursor)}>加载更多归档</button>}
  </dialog>;
}
