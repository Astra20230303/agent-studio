const id = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
export type ModelReroute = { threadId: string; turnId: string; fromModel: string; toModel: string; reason: string };
export function readModelReroute(value: unknown): ModelReroute | undefined {
  const input = value as any;
  if (!id(input?.threadId) || !id(input?.turnId) || !id(input?.fromModel) || !id(input?.toModel) || !id(input?.reason)) return;
  return { threadId: input.threadId, turnId: input.turnId, fromModel: input.fromModel, toModel: input.toModel, reason: input.reason };
}
