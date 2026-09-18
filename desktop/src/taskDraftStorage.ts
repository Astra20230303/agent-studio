import type { TaskDraft, TaskSchedule } from './scheduledTasks';

const validText = (value: unknown) => typeof value === 'string' && value.length <= 20000 && !/[\0]/.test(value);
const validSchedule = (value: any): value is TaskSchedule => {
  if (!value || typeof value !== 'object') return false;
  if (value.kind === 'interval') return Number.isSafeInteger(value.minutes) && value.minutes >= 1 && value.minutes <= 10080;
  if (value.kind === 'once') return typeof value.at === 'string' && !!value.at;
  return ['daily', 'weekdays', 'weekly'].includes(value.kind) && typeof value.time === 'string' && typeof value.timezone === 'string' && (value.day == null || Number.isInteger(value.day) && value.day >= 0 && value.day <= 6);
};

export function isTaskDraft(value: unknown): value is TaskDraft {
  const draft = value as any;
  return !!draft && typeof draft === 'object' && (draft.id == null || typeof draft.id === 'string') && validText(draft.name) && validText(draft.prompt)
    && ['agent', 'reminder'].includes(draft.kind) && (draft.providerId == null || typeof draft.providerId === 'string') && typeof draft.model === 'string'
    && ['read-only', 'workspace-write'].includes(draft.permission) && typeof draft.notify === 'boolean' && (draft.notificationPolicy == null || draft.notificationPolicy === 'failed_runs_only')
    && validSchedule(draft.schedule);
}
