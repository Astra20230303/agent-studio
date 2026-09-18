const id = (v: unknown): v is string => typeof v === 'string' && v.trim() === v && !!v && !/[\0\r\n]/.test(v);
const statuses = new Set(['active', 'paused', 'blocked', 'usageLimited', 'budgetLimited', 'complete']);
export function readThreadGoal(value: any): { threadId: string; goal: NonNullable<import('./domain').Thread['goal']> } | undefined {
  const goal = value?.goal;
  if (!id(value?.threadId) || !goal || typeof goal !== 'object' || !id(goal.threadId) || goal.threadId !== value.threadId || typeof goal.objective !== 'string' || !goal.objective.trim() || !statuses.has(goal.status) || !Number.isSafeInteger(goal.tokensUsed) || goal.tokensUsed < 0 || !Number.isSafeInteger(goal.timeUsedSeconds) || goal.timeUsedSeconds < 0 || goal.tokenBudget != null && (!Number.isSafeInteger(goal.tokenBudget) || goal.tokenBudget < 0)) return;
  return { threadId: value.threadId, goal: { objective: goal.objective, status: goal.status, tokensUsed: goal.tokensUsed, timeUsedSeconds: goal.timeUsedSeconds, ...(goal.tokenBudget != null ? { tokenBudget: goal.tokenBudget } : {}) } };
}
