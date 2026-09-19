import { useEffect, useRef, useState } from 'react';
import type { TaskSchedule } from './scheduledTasks';
import { formatTaskDate, localZone } from './scheduledTasks';

export function TaskSchedulePreview({ schedule }: { schedule: TaskSchedule }) {
  const [times, setTimes] = useState<string[]>();
  const [taskTimes, setTaskTimes] = useState<string[]>([]);
  const taskZone = schedule.kind === 'once' || schedule.kind === 'interval' ? localZone : schedule.timezone;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(true), lock = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const preview = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setTimes(undefined);
    try {
      if (!window.desktop?.previewTaskSchedule) throw new Error('当前环境不支持运行时间预览，请使用桌面应用。');
      const requested = schedule.kind === 'once' ? { ...schedule, at: new Date(schedule.at).toISOString() } : schedule;
      const result = await window.desktop.previewTaskSchedule(requested);
      if (!result.ok) throw new Error(result.error || '预览失败，请重试。');
      if (!Array.isArray(result.times) || result.times.length < 1 || result.times.length > 3 || result.times.some((time, index, values) => typeof time !== 'string' || !Number.isFinite(Date.parse(time)) || index > 0 && Date.parse(time) <= Date.parse(values[index - 1]))) throw new Error('运行时间预览响应无效。');
      const formatter = new Intl.DateTimeFormat('zh-CN', { timeZone: taskZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'shortOffset' });
      const labels = result.times.map(time => formatter.format(new Date(time)));
      if (active.current) { setTimes(result.times); setTaskTimes(labels); }
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { lock.current = false; if (active.current) setBusy(false); }
  };
  return <section aria-label="运行时间预览">
    <button type="button" disabled={busy} onClick={() => void preview()}>{busy ? '正在计算…' : '预览运行时间'}</button>
    {error && <p role="alert">{error}</p>}
    {times && <><p>计划时间（任务时区：{taskZone}）</p><ol>{times.map((time, index) => <li key={time}><time dateTime={time}>{taskTimes[index]}</time>{taskZone !== localZone && <div>本地时间（{localZone}）：{formatTaskDate(time)}</div>}</li>)}</ol><p>预览不创建任务。实际执行取决于应用运行状态和其他任务；固定间隔从保存或恢复时重新计时。</p></>}
  </section>;
}
