import { useEffect, useRef, useState } from 'react';
import { listBackgroundTerminals, terminateBackgroundTerminal, type BackgroundTerminal } from './codexClient';
import { backgroundTerminalMetrics } from './backgroundTerminalMetrics';

export function BackgroundTerminals({ threadId, connected }: { threadId: string; connected: boolean }) {
  const [items, setItems] = useState<BackgroundTerminal[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const generation = useRef(0);
  const refreshNeeded = useRef(false);
  const lock = useRef(false);
  const seen = useRef(new Set<string>());
  const load = async (more = false) => {
    if (!connected || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setStatus('');
    const version = generation.current;
    try {
      const page = await listBackgroundTerminals(threadId, more ? cursor : undefined);
      if (version !== generation.current) return;
      if (more && page.nextCursor && seen.current.has(page.nextCursor)) throw Error('后台命令分页游标重复，请刷新');
      if (!more) seen.current.clear();
      if (page.nextCursor) seen.current.add(page.nextCursor);
      setItems(previous => [...new Map([...(more ? previous : []), ...page.data].map(item => [item.processId, item])).values()]);
      setCursor(page.nextCursor || undefined); setLoaded(true);
    } catch (error) { if (version === generation.current) setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  const terminate = async (item: BackgroundTerminal) => {
    if (!connected || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setStatus('');
    const version = generation.current;
    try {
      const terminated = await terminateBackgroundTerminal(threadId, item.processId);
      if (version !== generation.current) return;
      setItems(previous => previous.filter(value => value.processId !== item.processId));
      setStatus(terminated ? '后台命令已终止' : '后台命令已退出');
    } catch (error) { if (version === generation.current) setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    generation.current++;
    setStatus(''); setError('');
    return () => { generation.current++; };
  }, [connected]);
  useEffect(() => { if (open && connected) refreshNeeded.current = true; }, [open, connected]);
  useEffect(() => {
    if (open && connected && !busy && refreshNeeded.current) {
      refreshNeeded.current = false;
      void loadRef.current();
    }
  }, [open, connected, busy]);
  return <details className="settings-card" onToggle={event => setOpen(event.currentTarget.open)}><summary>后台命令</summary>
    <p>停止生成后，后台命令可能继续运行。刷新查看本会话命令及资源快照，可单独终止。资源数据以最近一次刷新为准。</p>
    <button disabled={!connected || busy} onClick={() => void load()}>刷新后台命令</button>
    {!connected && <p role="status">连接服务后可管理后台命令；显示的列表可能已过期。</p>}
    {error && <p role="alert">{error}</p>}{status && <p role="status">{status}</p>}
    {busy && <p role="status">正在处理后台命令…</p>}
    {loaded && !items.length && <p role="status">没有运行中的后台命令</p>}
    <ul>{items.map(item => <li key={item.processId}><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.command}</pre><small>{item.cwd}</small><p>{backgroundTerminalMetrics(item)}</p><button disabled={!connected || busy} aria-label={`终止后台命令 ${item.processId}`} onClick={() => void terminate(item)}>终止命令</button></li>)}</ul>
    {cursor && <button disabled={!connected || busy} onClick={() => void load(true)}>加载更多后台命令</button>}
  </details>;
}
