import type { TaskRun } from './scheduledTasks';

export function taskRunDuration(run: Pick<TaskRun, 'status' | 'startedAt' | 'finishedAt'>, now = Date.now()): string {
  const start = Date.parse(run.startedAt);
  const end = run.status === 'running' ? now : run.finishedAt ? Date.parse(run.finishedAt) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '耗时未知';
  const seconds = Math.floor((end - start) / 1000);
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60), remaining = seconds % 60;
  const label = hours ? `${hours} 小时 ${minutes} 分 ${remaining} 秒` : minutes ? `${minutes} 分 ${remaining} 秒` : `${remaining} 秒`;
  return `${run.status === 'running' ? '已运行' : '耗时'} ${label}`;
}
