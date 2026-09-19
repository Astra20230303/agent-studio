const id = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
export type ModelSafetyBuffering = { threadId: string; turnId: string; model: string; useCases: string[]; reasons: string[]; showBufferingUi: boolean; fasterModel?: string | null };
export function readModelSafetyBuffering(value: unknown): ModelSafetyBuffering | undefined {
  const input = value as any;
  if (!id(input?.threadId) || !id(input?.turnId) || !id(input?.model) || !Array.isArray(input.useCases) || !Array.isArray(input.reasons) || input.useCases.length > 64 || input.reasons.length > 64 || input.useCases.some((item: unknown) => !id(item)) || input.reasons.some((item: unknown) => !id(item)) || typeof input.showBufferingUi !== 'boolean' || input.fasterModel != null && !id(input.fasterModel)) return;
  return { threadId: input.threadId, turnId: input.turnId, model: input.model, useCases: Array.from(new Set<string>(input.useCases)), reasons: Array.from(new Set<string>(input.reasons)), showBufferingUi: input.showBufferingUi, ...(input.fasterModel != null ? { fasterModel: input.fasterModel } : {}) };
}
