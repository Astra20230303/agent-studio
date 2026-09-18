import type { ScheduledTask } from './scheduledTasks';
export type TaskOrder = 'original' | 'next' | 'recent' | 'name';
export function orderTasks(tasks: ScheduledTask[], order: TaskOrder): ScheduledTask[] {
  const result = [...tasks];
  const date = (value?: string | null) => value ? Date.parse(value) : NaN;
  const compareTime = (a: number, b: number, direction: number) => {
    if (!Number.isFinite(a)) return Number.isFinite(b) ? 1 : 0;
    if (!Number.isFinite(b)) return -1;
    return (a - b) * direction;
  };
  if (order === 'next') result.sort((a, b) => compareTime(a.status === 'active' ? date(a.nextRunAt) : NaN, b.status === 'active' ? date(b.nextRunAt) : NaN, 1));
  if (order === 'recent') result.sort((a, b) => compareTime(date(a.runs[0]?.startedAt), date(b.runs[0]?.startedAt), -1));
  if (order === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' }));
  return result;
}
