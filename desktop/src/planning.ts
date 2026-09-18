export type PlanningMode = 'default' | 'plan';
export type PlanProgress = { turnId: string; explanation?: string; steps: { step: string; status: 'pending' | 'inProgress' | 'completed' }[] };
export function collaborationMode(mode: PlanningMode, model: string, effort = 'medium') {
  return { mode, settings: { model, reasoning_effort: effort === 'default' ? null : effort, developer_instructions: null } };
}
const identity = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
export function readPlan(params: any): PlanProgress | undefined {
  if (!identity(params?.turnId) || !Array.isArray(params.plan) || params.plan.some((item: any) => !item || typeof item.step !== 'string' || !item.step.trim() || !['pending', 'inProgress', 'completed'].includes(item.status))) return;
  return { turnId: params.turnId, explanation: typeof params.explanation === 'string' ? params.explanation : undefined,
    steps: params.plan.map((item: any) => ({ step: item.step, status: item.status })) };
}

export function readPlanMessage(params: any): { id: string; turnId: string; content: string } | undefined {
  if (!identity(params?.threadId) || !identity(params.turnId) || params.item?.type !== 'plan' || !identity(params.item.id) || typeof params.item.text !== 'string') return;
  return { id: `plan-${params.item.id}`, turnId: params.turnId, content: params.item.text };
}
