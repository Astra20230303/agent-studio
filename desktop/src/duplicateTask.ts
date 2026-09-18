import type { ScheduledTask, TaskDraft } from './scheduledTasks';

export function duplicateTask(task: ScheduledTask, now = Date.now()): TaskDraft {
  const { timeoutMinutes, name, prompt, kind, model, providerId, cwd, reasoningEffort, permission, notify, notificationPolicy } = task;
  const schedule = task.schedule.kind === 'once' && Date.parse(task.schedule.at) <= now
    ? { kind: 'once' as const, at: new Date(now + 3600000).toISOString() }
    : structuredClone(task.schedule);
  return { timeoutMinutes, name: `${name.slice(0, 115)}（副本）`, prompt, kind, model, providerId, cwd, reasoningEffort, permission, notify, notificationPolicy, schedule };
}
