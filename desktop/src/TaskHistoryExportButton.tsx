import { useRef, useState } from 'react';
import type { TaskRun } from './scheduledTasks';
import { taskHistoryExport } from './taskHistoryExport';

export function TaskHistoryExport({ name, runs, query, status }: { name: string; runs: TaskRun[]; query: string; status: string }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const count = runs.filter(run => run.status !== 'running').length;
  const save = async () => {
    if (lock.current || !count) return;
    lock.current = true; setBusy(true); setNotice(''); setError('');
    try {
      const snapshot = taskHistoryExport(name, runs, query, status);
      if (!window.desktop?.saveTaskOutput) throw Error('任务历史导出需要桌面应用');
      const result = await window.desktop.saveTaskOutput({ filename: `task-history-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`, content: snapshot.content });
      if (!result?.ok) throw Error(result?.error || '导出失败');
      if (!result.canceled) setNotice(`已导出 ${snapshot.count} 条运行记录`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <div><button disabled={busy || !count} onClick={() => void save()}>{busy ? '正在导出运行历史…' : `导出已结束记录（${count}）`}</button>{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}</div>;
}
