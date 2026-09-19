import { isExplicitReasoningEffort } from './reasoningEffort.ts';
import type { TaskDraft, TaskSchedule } from './scheduledTasks';

const validText = (value: unknown) => typeof value === 'string' && value.length <= 20000 && !/[\0]/.test(value);
// Drafts may contain unfinished values; executable limits are checked when saving a task.
const validSchedule = (value: any): value is TaskSchedule => {
  if (!value || typeof value !== 'object') return false;
  if (value.kind === 'interval') return typeof value.minutes === 'number' && Number.isFinite(value.minutes);
  if (value.kind === 'once') return typeof value.at === 'string';
  return ['daily', 'weekdays', 'weekly', 'customWeek', 'monthly'].includes(value.kind) && typeof value.time === 'string' && typeof value.timezone === 'string' && (value.kind !== 'monthly' || typeof value.monthDay === 'number' && Number.isFinite(value.monthDay)) && (value.kind !== 'customWeek' || Array.isArray(value.days) && value.days.length <= 7 && value.days.every((day: unknown) => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6) && new Set(value.days).size === value.days.length) && (value.day == null || Number.isInteger(value.day) && value.day >= 0 && value.day <= 6);
};

export function isTaskDraft(value: unknown): value is TaskDraft {
  const draft = value as any;
  return !!draft && typeof draft === 'object' && (draft.id == null || typeof draft.id === 'string') && validText(draft.name) && validText(draft.prompt)
    && (draft.followupThreadId == null || typeof draft.followupThreadId === 'string' && !!draft.followupThreadId.trim() && !/[\s\0]/.test(draft.followupThreadId))
    && ['agent', 'reminder'].includes(draft.kind) && (draft.providerId == null || typeof draft.providerId === 'string') && typeof draft.model === 'string'
    && ['read-only', 'workspace-write'].includes(draft.permission) && typeof draft.notify === 'boolean' && (draft.notificationPolicy == null || draft.notificationPolicy === 'failed_runs_only')
    && (draft.cwd == null || typeof draft.cwd === 'string')
    && (draft.timeoutMinutes == null || typeof draft.timeoutMinutes === 'number' && Number.isFinite(draft.timeoutMinutes))
    && (draft.reasoningEffort == null || isExplicitReasoningEffort(draft.reasoningEffort))
    && validSchedule(draft.schedule);
}
