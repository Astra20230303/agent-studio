import type { Thread } from './domain';
export function ThreadGoalPanel({ goal }: { goal?: Thread['goal'] }) {
  if (!goal) return null;
  const labels = { active: '进行中', paused: '已暂停', blocked: '已阻塞', usageLimited: '用量受限', budgetLimited: '预算受限', complete: '已完成' };
  return <details className="plan-panel" open><summary>会话目标 · {labels[goal.status]}</summary><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{goal.objective}</p><small>已用 Token：{goal.tokensUsed.toLocaleString()}{goal.tokenBudget != null ? ` / ${goal.tokenBudget.toLocaleString()}` : ''} · 用时 {goal.timeUsedSeconds.toLocaleString()} 秒</small></details>;
}
