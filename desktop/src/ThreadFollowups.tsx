import { useEffect, useRef, useState } from 'react';
import { createAutomationRepository } from './automationRepository';
import { taskRequest, taskStatusLabels, taskRunLabels, type ScheduledTask } from './scheduledTasks';
const repository = createAutomationRepository(taskRequest);

export function ThreadFollowups({ threadId, title, cwd, model, providerId, busy: threadBusy }: { threadId?: string; title: string; cwd?: string; model: string; providerId?: string; busy: boolean }) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [prompt, setPrompt] = useState(''); const [minutes, setMinutes] = useState('30');
  const [write, setWrite] = useState(false); const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); const [history, setHistory] = useState<ScheduledTask>();
  const epoch = useRef(0); const lock = useRef(false);
  const reload = async () => {
    const version = ++epoch.current;
    try { const result = await repository.list(); if (epoch.current === version) { setTasks(result.filter(task => task.followupThreadId === threadId)); setError(''); } }
    catch (error) { if (epoch.current === version) setError(String(error instanceof Error ? error.message : error)); }
  };
  useEffect(() => { if (threadId) void reload(); const off = window.desktop?.onTasksChanged?.(() => void reload()); return () => { epoch.current++; off?.(); }; }, [threadId]);
  const act = async (operation: () => Promise<void>) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { await operation(); await reload(); }
    catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  if (!threadId) return <p>发送首条消息后可为当前会话安排跟进。</p>;
  return <section aria-label="会话持续跟进">
    <p>在本会话继续上下文。应用运行时执行；会话忙碌时本次失败并保留下一次安排，无变化时不通知，确认完成后停止后续安排。</p>
    <label>跟进指令<textarea aria-label="跟进指令" value={prompt} onChange={event => setPrompt(event.target.value)} /></label>
    <label>间隔（分钟）<input aria-label="跟进间隔" type="number" min="1" max="10080" value={minutes} onChange={event => setMinutes(event.target.value)} /></label>
    <label><input type="checkbox" checked={write} onChange={event => setWrite(event.target.checked)} />允许跟进修改工作区文件</label>
    <button disabled={busy || threadBusy || !cwd || !model || !prompt.trim() || !Number.isInteger(Number(minutes)) || Number(minutes) < 1 || Number(minutes) > 10080} onClick={() => void act(async () => {
      await repository.save({ followupThreadId: threadId, name: `跟进 · ${title}`.slice(0, 120), prompt, model, providerId, cwd, kind: 'agent', permission: write ? 'workspace-write' : 'read-only', notify: true, timeoutMinutes: 10, schedule: { kind: 'interval', minutes: Number(minutes) } }); setPrompt(''); setWrite(false);
    })}>创建持续跟进</button><button disabled={busy} onClick={() => void reload()}>刷新跟进</button>
    {error && <p role="alert">{error}</p>}
    {tasks.map(task => <article key={task.id}><p>{task.name} · {taskStatusLabels[task.status]}</p>
      <button disabled={busy || task.runs.some(run => run.status === 'running')} onClick={() => void act(() => repository.setStatus(task.id, task.status === 'active' ? 'paused' : 'active'))}>{task.status === 'active' ? '暂停跟进' : '恢复跟进'}</button>
      <button disabled={busy || threadBusy || task.runs.some(run => run.status === 'running')} onClick={() => void act(() => repository.run(task.id))}>立即跟进</button>
      {task.runs.some(run => run.status === 'running') && <button disabled={busy} onClick={() => void act(() => repository.cancel(task.id))}>停止本次跟进</button>}
      <button disabled={busy} onClick={() => void act(async () => { setHistory(await repository.detail(task.id)); })}>查看跟进记录</button>
      <button disabled={busy || task.runs.some(run => run.status === 'running')} onClick={() => { if (window.confirm('删除此跟进任务及其运行记录？会话消息会保留。')) void act(() => repository.remove(task.id)); }}>删除跟进</button>
    </article>)}
    {history && <section aria-label="跟进运行记录"><button onClick={() => setHistory(undefined)}>关闭跟进记录</button>{history.runs.map(run => <div key={run.id}><p>{taskRunLabels[run.status]} · {run.startedAt}</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{run.error || run.output || '尚无输出'}</pre></div>)}</section>}
  </section>;
}
