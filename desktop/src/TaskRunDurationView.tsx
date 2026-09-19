import { useEffect, useState } from 'react';
import type { TaskRun } from './scheduledTasks';
import { taskRunDuration } from './taskRunDuration';

export function TaskRunDuration({ run }: { run: TaskRun }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (run.status !== 'running') return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [run.id, run.status, run.startedAt]);
  return <span>{taskRunDuration(run, now)}</span>;
}
