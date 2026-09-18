import type { ScheduledTask, TaskDraft } from './scheduledTasks';

export interface AutomationRepository {
  list(): Promise<ScheduledTask[]>;
  detail(id: string): Promise<ScheduledTask>;
  save(draft: TaskDraft): Promise<void>;
  run(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  setStatus(id: string, status: 'active' | 'paused'): Promise<void>;
}
type Request = (operation: 'listTasks' | 'taskDetail' | 'saveTask' | 'runTask' | 'cancelTask' | 'deleteTask' | 'setTaskStatus', ...args: unknown[]) => Promise<unknown>;
const record = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
const date = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
function task(value: any): value is ScheduledTask {
  if (!record(value) || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string' || typeof value.prompt !== 'string'
    || !['agent','reminder'].includes(value.kind) || !['active','paused','completed'].includes(value.status)
    || value.timeoutMinutes != null && (!Number.isInteger(value.timeoutMinutes) || value.timeoutMinutes < 1 || value.timeoutMinutes > 120)
    || value.reasoningEffort != null && !['low','medium','high'].includes(value.reasoningEffort)
    || value.notificationPolicy != null && value.notificationPolicy !== 'failed_runs_only'
    || typeof value.model !== 'string' || typeof value.notify !== 'boolean' || !['read-only','workspace-write'].includes(value.permission)
    || [value.cwd, value.providerId].some(field => field != null && typeof field !== 'string')
    || value.nextRunAt != null && !date(value.nextRunAt) || !record(value.schedule) || !Array.isArray(value.runs)) return false;
  const schedule = value.schedule;
  if (schedule.kind === 'interval') { if (!Number.isInteger(schedule.minutes) || schedule.minutes < 1 || schedule.minutes > 10080) return false; }
  else if (schedule.kind === 'once') { if (!date(schedule.at)) return false; }
  else {
    if (!['daily','weekdays','weekly'].includes(schedule.kind) || typeof schedule.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time) || typeof schedule.timezone !== 'string') return false;
    try { new Intl.DateTimeFormat('en', { timeZone: schedule.timezone }); } catch { return false; }
    if (schedule.kind === 'weekly' && (!Number.isInteger(schedule.day) || schedule.day < 0 || schedule.day > 6)) return false;
  }
  return value.runs.every((run: any) => record(run) && typeof run.id === 'string' && !!run.id
    && (run.outputTruncated == null || typeof run.outputTruncated === 'boolean')
    && (run.environment == null || record(run.environment) && typeof run.environment.cwd === 'string' && !!run.environment.cwd
      && (run.environment.providerId == null || typeof run.environment.providerId === 'string'))
    && (run.configuration == null || record(run.configuration) && ['name','prompt','model'].every(key => typeof run.configuration[key] === 'string')
      && (run.configuration.timeoutMinutes == null || Number.isInteger(run.configuration.timeoutMinutes) && run.configuration.timeoutMinutes >= 1 && run.configuration.timeoutMinutes <= 120)
      && ['agent','reminder'].includes(run.configuration.kind) && ['read-only','workspace-write'].includes(run.configuration.permission)
      && [run.configuration.cwd, run.configuration.providerId].every(value => value == null || typeof value === 'string')
      && (run.configuration.reasoningEffort == null || ['low','medium','high'].includes(run.configuration.reasoningEffort)))
    && (run.threadId == null || typeof run.threadId === 'string' && !!run.threadId.trim())
    && ['running','completed','failed','interrupted'].includes(run.status) && date(run.startedAt)
    && (run.finishedAt == null || date(run.finishedAt)) && (run.output == null || typeof run.output === 'string') && (run.error == null || typeof run.error === 'string'));
}
export function createAutomationRepository(request: Request): AutomationRepository {
  return {
    async save(draft) { await request('saveTask', structuredClone(draft)); },
    async run(id) { await request('runTask', id); },
    async cancel(id) { await request('cancelTask', id); },
    async remove(id) { await request('deleteTask', id); },
    async setStatus(id, status) { await request('setTaskStatus', id, status); },
    async list() {
      const result = await request('listTasks') as any;
      if (!Array.isArray(result?.tasks) || !result.tasks.every(task) || new Set(result.tasks.map((item: ScheduledTask) => item.id)).size !== result.tasks.length) throw Error('任务列表格式无效，请重试。');
      return result.tasks;
    },
    async detail(id) {
      const result = await request('taskDetail', id) as any;
      if (!task(result?.task) || result.task.id !== id) throw Error('任务详情格式无效，请重试。');
      return result.task;
    },
  };
}
