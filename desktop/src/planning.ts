export type PlanningMode = 'default' | 'plan';
export type PlanProgress = { turnId: string; explanation?: string; steps: { step: string; status: 'pending' | 'inProgress' | 'completed' }[] };
export function collaborationMode(mode: PlanningMode, model: string, effort = 'medium') {
  return { mode, settings: { model, reasoning_effort: effort === 'default' ? null : effort, developer_instructions: null } };
}
export function readPlan(params: any): PlanProgress | undefined {
  if (!params?.turnId || !Array.isArray(params.plan)) return;
  return { turnId: params.turnId, explanation: typeof params.explanation === 'string' ? params.explanation : undefined,
    steps: params.plan.filter((item: any) => typeof item?.step === 'string' && ['pending', 'inProgress', 'completed'].includes(item.status)) };
}
