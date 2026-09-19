export type TurnModerationMetadata = { turnId: string; metadata: unknown };
export function readTurnModerationMetadata(value: unknown): TurnModerationMetadata | undefined {
  const input = value as any;
  if (!input || typeof input.threadId !== 'string' || !/^\S+$/.test(input.threadId) || typeof input.turnId !== 'string' || !/^\S+$/.test(input.turnId) || input.metadata === undefined) return;
  let serialized: string;
  try { serialized = JSON.stringify(input.metadata); } catch { return; }
  if (serialized.length > 128 * 1024) return;
  return { turnId: input.turnId, metadata: structuredClone(input.metadata) };
}
