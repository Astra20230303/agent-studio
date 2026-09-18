const id = (v: unknown): v is string => typeof v === 'string' && v.trim() === v && !!v && !/[\0\r\n]/.test(v);
const statuses = new Set(['active', 'paused', 'blocked', 'usageLimited', 'budgetLimited', 'complete']);
export type ThreadGoalStatus = 'active' | 'paused' | 'blocked' | 'usageLimited' | 'budgetLimited' | 'complete';
export type ThreadGoalValue = NonNullable<import('./domain').Thread['goal']>;
export function validateThreadGoalInput(threadId: string, input: { objective?: string; status?: string; tokenBudget?: number | null }) {
  if (!id(threadId) || input.objective !== undefined && (typeof input.objective !== 'string' || !input.objective.trim()) || input.status !== undefined && !statuses.has(input.status) || input.tokenBudget !== undefined && input.tokenBudget !== null && (!Number.isSafeInteger(input.tokenBudget) || input.tokenBudget < 0)) throw new Error('目标参数无效');
  return { threadId, ...(input.objective !== undefined ? { objective: input.objective.trim() } : {}), ...(input.status !== undefined ? { status: input.status as ThreadGoalStatus } : {}), ...(input.tokenBudget !== undefined ? { tokenBudget: input.tokenBudget } : {}) };
}
export function readThreadGoalResponse(value: any, threadId: string): ThreadGoalValue | undefined {
  if (!id(threadId)) throw new Error('目标会话身份无效');
  if (value?.goal == null) return undefined;
  const parsed = readThreadGoal({ threadId, goal: value.goal });
  if (!parsed) throw new Error('服务端返回了无效目标');
  return parsed.goal;
}
export function readThreadGoalClearResponse(value: any) {
  if (value?.cleared !== true) throw new Error('服务端未确认目标已清除');
  return true;
}
export function readThreadGoal(value: any): { threadId: string; goal: NonNullable<import('./domain').Thread['goal']> } | undefined {
  const goal = value?.goal;
  if (!id(value?.threadId) || !goal || typeof goal !== 'object' || !id(goal.threadId) || goal.threadId !== value.threadId || typeof goal.objective !== 'string' || !goal.objective.trim() || !statuses.has(goal.status) || !Number.isSafeInteger(goal.tokensUsed) || goal.tokensUsed < 0 || !Number.isSafeInteger(goal.timeUsedSeconds) || goal.timeUsedSeconds < 0 || goal.tokenBudget != null && (!Number.isSafeInteger(goal.tokenBudget) || goal.tokenBudget < 0)) return;
  return { threadId: value.threadId, goal: { objective: goal.objective, status: goal.status, tokensUsed: goal.tokensUsed, timeUsedSeconds: goal.timeUsedSeconds, ...(goal.tokenBudget != null ? { tokenBudget: goal.tokenBudget } : {}) } };
}
