import { useEffect, useRef, useState } from 'react';

export function AgentControls({ threadId }: { threadId: string }) {
  const [state, setState] = useState<{ turnId?: string; status: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const generation = useRef(0);
  const lock = useRef(false);
  useEffect(() => {
    generation.current++; setState(undefined); setError(''); setNotice('');
    const off = window.codex?.onNotification((message: import('./codexClient').RpcMessage) => {
      if (message.params?.threadId !== threadId) return;
      if (message.method === 'turn/started' || message.method === 'turn/completed') {
        generation.current++;
        const turn = message.params.turn;
        setState(current => {
          if (message.method === 'turn/completed' && current?.turnId && current.turnId !== turn.id) return current;
          return { status: turn.status, turnId: turn.status === 'inProgress' ? turn.id : undefined };
        });
        setNotice('');
      }
    });
    const closed = window.codex?.onClosed?.(() => {
      generation.current++; setState(undefined); setNotice(''); setError('连接已断开，请重连后刷新子任务状态');
    });
    return () => { generation.current++; off?.(); closed?.(); };
  }, [threadId]);
  const run = async (interrupt = false) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    const version = generation.current;
    try {
      const result = await window.codex?.request('thread/read', { threadId, includeTurns: true });
      if (version !== generation.current) return;
      if (!result?.ok) throw Error(result?.error?.message || result?.error || '无法读取子任务');
      const thread = result.result?.thread;
      if (thread?.id !== threadId || !Array.isArray(thread.turns)) throw Error('子任务状态格式无效');
      const turn = thread.turns.find((item: any) => item.status === 'inProgress');
      setState({ turnId: turn?.id, status: turn ? 'inProgress' : thread.turns.at(-1)?.status || 'idle' });
      if (interrupt && turn?.id) {
        const reply = await window.codex!.request('turn/interrupt', { threadId, turnId: turn.id });
        if (version !== generation.current) return;
        if (!reply?.ok) throw Error(reply?.error?.message || reply?.error || '中断失败');
        setNotice('已请求中断，请刷新核对状态');
      }
    } catch (error) { if (version === generation.current) setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  const labels: Record<string, string> = { inProgress: '运行中', completed: '已完成', interrupted: '已中断', failed: '失败', idle: '空闲' };
  return <div aria-label={`子任务控制 ${threadId}`}>
    <button disabled={busy || !threadId || !window.codex} onClick={() => void run()}>刷新子任务状态</button>
    <button disabled={busy || !state?.turnId} onClick={() => void run(true)}>中断子任务</button>
    {state && <p>查询状态：{labels[state.status] || state.status}</p>}
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
  </div>;
}
