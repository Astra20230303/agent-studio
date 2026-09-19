import { useEffect, useRef, useState } from 'react';
import { addRemoteQueuedSubmission, deleteRemoteQueuedSubmission, listRemoteQueuedSubmissions, reorderRemoteQueuedSubmissions, startRemoteQueuedSubmission, updateRemoteQueuedSubmission, subscribeCodex } from './codexClient';
import { moveRemoteQueue, queueTextBlocks, replaceQueueText, type RemoteQueuedSubmission } from './threadQueueRemote';

type Props = { threadId?: string; connected: boolean; busy?: boolean; running?: boolean };
export function RemoteThreadQueuePanel(props: Props) {
  // A different thread owns a different request lifetime and draft.
  return props.threadId ? <ThreadQueue key={props.threadId} {...props} threadId={props.threadId} /> : null;
}
function ThreadQueue({ threadId, connected, busy, running }: Props & { threadId: string }) {
  const [items, setItems] = useState<RemoteQueuedSubmission[]>([]);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<{ original: RemoteQueuedSubmission; texts: string[] }>();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const epoch = useRef(0);
  const lock = useRef(false);
  const dirty = useRef(false);
  const blocked = !connected || busy || loading;

  const refresh = async (generation: number) => {
    do {
      dirty.current = false;
      const result = await listRemoteQueuedSubmissions(threadId);
      if (epoch.current !== generation) return;
      // A notification during a paginated read invalidates that snapshot.
      if (!dirty.current) setItems(result);
    } while (dirty.current);
  };
  const load = async () => {
    if (!connected) return;
    if (lock.current) { dirty.current = true; return; }
    const generation = epoch.current;
    lock.current = true; setLoading(true); setNotice('');
    try { await refresh(generation); }
    catch (error) { if (epoch.current === generation) { setItems([]); setNotice(`读取服务端队列失败：${error instanceof Error ? error.message : String(error)}`); } }
    finally { if (epoch.current === generation) { lock.current = false; setLoading(false); if (dirty.current) void load(); } }
  };
  useEffect(() => {
    epoch.current++; lock.current = false; dirty.current = false; setLoading(false); setItems([]); setNotice('');
    const unsubscribe = connected ? subscribeCodex({ notification: message => {
      if (message.method === 'thread/queue/changed' && message.params?.threadId === threadId) void load();
    } }) : undefined;
    if (connected) void load();
    return () => { epoch.current++; dirty.current = false; unsubscribe?.(); };
  }, [connected]);

  const mutate = async (action: () => Promise<void>, success: string, submittedText?: string, onSaved?: () => void) => {
    if (!connected || busy || lock.current) return;
    const generation = epoch.current;
    lock.current = true; setLoading(true); setNotice('');
    try {
      await action();
      if (epoch.current !== generation) return;
      if (submittedText !== undefined) setText(current => current === submittedText ? '' : current);
      onSaved?.();
      setNotice(success);
      // A confirmed mutation must not be reported as failed if the subsequent read fails.
      try { await refresh(generation); }
      catch (error) { if (epoch.current === generation) { setItems([]); setNotice(`${success}；刷新失败，请刷新队列：${error instanceof Error ? error.message : String(error)}`); } }
    } catch (error) {
      if (epoch.current === generation) setNotice(`服务端队列操作失败：${error instanceof Error ? error.message : String(error)}`);
    } finally { if (epoch.current === generation) { lock.current = false; setLoading(false); if (dirty.current) void load(); } }
  };
  return <section className="remote-thread-queue" aria-label="服务端排队消息">
    <header><b>服务端排队消息 · {items.length}</b><button disabled={!connected || loading} onClick={() => void load()}>刷新</button></header>
    <p>消息将在当前回合结束后自动执行；停止生成会暂停队列，可点击启动继续。</p>
    <form onSubmit={event => { event.preventDefault(); if (!text.trim()) return; const draft = text; void mutate(() => addRemoteQueuedSubmission(threadId, draft.trim()), '消息已加入服务端队列', draft); }}>
      <input aria-label="服务端排队消息" value={text} onChange={event => setText(event.target.value)} placeholder="发送到 app-server 队列" />
      <button disabled={blocked || !text.trim()}>加入队列</button>
    </form>
    {items.map((item, index) => <div key={item.id}>
      <span>{item.input.map((entry: any) => typeof entry?.text === 'string' ? entry.text : '').filter(Boolean).join(' ') || item.id}</span>
      {([-1, 1] as const).map(direction => <button key={direction} aria-label={`${direction === -1 ? '上移' : '下移'}服务端消息 ${item.id}`} disabled={blocked || index + direction < 0 || index + direction >= items.length} onClick={() => void mutate(() => reorderRemoteQueuedSubmissions(threadId, moveRemoteQueue(items, item.id, direction)), '队列顺序已保存')}>{direction === -1 ? '上移' : '下移'}</button>)}
      <button aria-label={`编辑服务端消息 ${item.id}`} disabled={blocked || !!editing || !queueTextBlocks(item.input).length} onClick={() => setEditing({ original: structuredClone(item), texts: queueTextBlocks(item.input).map(block => block.text) })}>编辑</button>
      <button disabled={blocked} onClick={() => void mutate(() => deleteRemoteQueuedSubmission(threadId, item.id), '已删除服务端排队消息')}>删除</button>
      <button disabled={blocked || running} onClick={() => { if (running) return; void mutate(() => startRemoteQueuedSubmission(threadId, item.id), '已启动服务端排队消息'); }}>启动</button>
    </div>)}
    {editing && <form aria-label="编辑服务端排队消息" onSubmit={event => {
      event.preventDefault(); const draft = editing;
      void mutate(() => updateRemoteQueuedSubmission(threadId, draft.original, replaceQueueText(draft.original.input, draft.texts)), '排队消息已保存', undefined, () => setEditing(undefined));
    }}>
      {editing.texts.map((value, index) => <label key={index}>文本 {index + 1}<textarea aria-label={`排队文本 ${index + 1}`} disabled={loading} value={value} onChange={event => { const value = event.target.value; setEditing(current => current && ({ ...current, texts: current.texts.map((text, i) => i === index ? value : text) })); }} /></label>)}
      <p>非文本附件和引用会保留。编辑期间消息仍可能被服务端执行。</p>
      <button disabled={blocked || editing.texts.some(text => !text.trim())}>保存编辑</button>
      <button type="button" disabled={loading} onClick={() => setEditing(undefined)}>取消编辑</button>
    </form>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
