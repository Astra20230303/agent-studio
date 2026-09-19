import { useEffect, useRef, useState } from 'react';
import { addRemoteQueuedSubmission, deleteRemoteQueuedSubmission, listRemoteQueuedSubmissions, startRemoteQueuedSubmission } from './codexClient';
import type { RemoteQueuedSubmission } from './threadQueueRemote';

type Props = { threadId?: string; connected: boolean; busy?: boolean };
export function RemoteThreadQueuePanel(props: Props) {
  // A different thread owns a different request lifetime and draft.
  return props.threadId ? <ThreadQueue key={props.threadId} {...props} threadId={props.threadId} /> : null;
}
function ThreadQueue({ threadId, connected, busy }: Props & { threadId: string }) {
  const [items, setItems] = useState<RemoteQueuedSubmission[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const epoch = useRef(0);
  const lock = useRef(false);
  const blocked = !connected || busy || loading;

  const refresh = async (generation: number) => {
    const result = await listRemoteQueuedSubmissions(threadId);
    if (epoch.current === generation) setItems(result);
  };
  const load = async () => {
    if (!connected || lock.current) return;
    const generation = epoch.current;
    lock.current = true; setLoading(true); setNotice('');
    try { await refresh(generation); }
    catch (error) { if (epoch.current === generation) { setItems([]); setNotice(`读取服务端队列失败：${error instanceof Error ? error.message : String(error)}`); } }
    finally { if (epoch.current === generation) { lock.current = false; setLoading(false); } }
  };
  useEffect(() => {
    epoch.current++; lock.current = false; setLoading(false); setItems([]); setNotice('');
    if (connected) void load();
    return () => { epoch.current++; };
  }, [connected]);

  const mutate = async (action: () => Promise<void>, success: string, submittedText?: string) => {
    if (!connected || busy || lock.current) return;
    const generation = epoch.current;
    lock.current = true; setLoading(true); setNotice('');
    try {
      await action();
      if (epoch.current !== generation) return;
      if (submittedText !== undefined) setText(current => current === submittedText ? '' : current);
      setNotice(success);
      // A confirmed mutation must not be reported as failed if the subsequent read fails.
      try { await refresh(generation); }
      catch (error) { if (epoch.current === generation) { setItems([]); setNotice(`${success}；刷新失败，请刷新队列：${error instanceof Error ? error.message : String(error)}`); } }
    } catch (error) {
      if (epoch.current === generation) setNotice(`服务端队列操作失败：${error instanceof Error ? error.message : String(error)}`);
    } finally { if (epoch.current === generation) { lock.current = false; setLoading(false); } }
  };
  return <section className="remote-thread-queue" aria-label="服务端排队消息">
    <header><b>服务端排队消息 · {items.length}</b><button disabled={!connected || loading} onClick={() => void load()}>刷新</button></header>
    <form onSubmit={event => { event.preventDefault(); if (!text.trim()) return; const draft = text; void mutate(() => addRemoteQueuedSubmission(threadId, draft.trim()), '消息已加入服务端队列', draft); }}>
      <input aria-label="服务端排队消息" value={text} onChange={event => setText(event.target.value)} placeholder="发送到 app-server 队列" />
      <button disabled={blocked || !text.trim()}>加入队列</button>
    </form>
    {items.map(item => <div key={item.id}>
      <span>{item.input.map((entry: any) => typeof entry?.text === 'string' ? entry.text : '').filter(Boolean).join(' ') || item.id}</span>
      <button disabled={blocked} onClick={() => void mutate(() => deleteRemoteQueuedSubmission(threadId, item.id), '已删除服务端排队消息')}>删除</button>
      <button disabled={blocked} onClick={() => void mutate(() => startRemoteQueuedSubmission(threadId, item.id), '已启动服务端排队消息')}>启动</button>
    </div>)}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
