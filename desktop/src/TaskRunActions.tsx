import { useRef, useState } from 'react';
import { Copy, Download } from 'lucide-react';
import { taskRunLabels, type TaskRun } from './scheduledTasks';

export function TaskRunActions({ name, run, onOpenConversation }: { name: string; run: TaskRun; onOpenConversation?: (threadId: string, title: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const act = async (download: boolean) => {
    if (lock.current || run.status === 'running') return;
    lock.current = true; setBusy(true); setNotice(''); setError('');
    const content = `${name}\n${run.startedAt}\n${taskRunLabels[run.status]}\n${run.error ? `\n${run.error}\n` : ''}\n${run.output || ''}`;
    try {
      if (!download) { await navigator.clipboard.writeText(content); setNotice('已复制运行结果'); }
      else {
        const filename = `task-${run.startedAt.replace(/[^0-9T]/g, '-')}.txt`;
        const save = window.desktop?.saveTaskOutput;
        if (!save) throw Error('任务结果导出需要桌面应用');
        const result = await save({ filename, content });
        if (!result.ok) throw Error(result.error || '导出失败');
        if (!result.canceled) setNotice('已导出运行结果');
      }
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div><div className="task-actions">
    {run.threadId && onOpenConversation && <button disabled={run.status === 'running'} onClick={() => onOpenConversation(run.threadId!, name)}>打开运行会话</button>}
    <button className="task-icon-button" title="复制运行结果" aria-label="复制运行结果" disabled={busy || run.status === 'running'} onClick={() => void act(false)}><Copy /></button>
    <button className="task-icon-button" title="导出运行结果" aria-label="导出运行结果" disabled={busy || run.status === 'running'} onClick={() => void act(true)}><Download /></button>
  </div>{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}</div>;
}
