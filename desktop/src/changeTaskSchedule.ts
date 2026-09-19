import type { TaskSchedule } from './scheduledTasks';

export function changeTaskSchedule(current: TaskSchedule, kind: TaskSchedule['kind'], timezone: string, now = Date.now()): TaskSchedule {
  if (kind === current.kind) return structuredClone(current);
  if (kind === 'interval') return { kind, minutes: 60 };
  if (kind === 'once') return { kind, at: new Date(now + 3600000).toISOString() };
  const clock = current.kind === 'once' || current.kind === 'interval' ? { time: '09:00', timezone } : { time: current.time, timezone: current.timezone };
  if (kind === 'weekly') return { kind, ...clock, day: current.kind === 'customWeek' ? [...(current.days || [])].sort((a, b) => a - b)[0] ?? 1 : 1 };
  if (kind === 'customWeek') return { kind, ...clock, days: current.kind === 'weekly' ? [current.day ?? 1] : current.kind === 'weekdays' ? [1, 2, 3, 4, 5] : current.kind === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [1, 3, 5] };
  if (kind === 'monthly') return { kind, ...clock, monthDay: 1 };
  return { kind, ...clock };
}
