export type TurnModerationMetadata = { turnId: string; metadata: unknown };
const identity = (value: unknown): value is string => typeof value === 'string' && /^\S+$/.test(value) && !value.includes('\0');
export function readTurnModerationMetadata(value: unknown): TurnModerationMetadata | undefined {
  try {
    const input = value as any;
    if (!input || !identity(input.threadId) || !identity(input.turnId)) return;
    let nodes = 0;
    const ancestors = new Set<object>();
    const jsonValue = (item: unknown, depth: number): boolean => {
      if (++nodes > 10000 || depth > 64) return false;
      if (item === null || typeof item === 'boolean') return true;
      if (typeof item === 'string') return item.length <= 128 * 1024;
      if (typeof item === 'number') return Number.isFinite(item);
      if (typeof item !== 'object' || ancestors.has(item)) return false;
      if (!Array.isArray(item) && ![Object.prototype, null].includes(Object.getPrototypeOf(item))) return false;
      ancestors.add(item);
      const valid = Object.values(item).every(child => jsonValue(child, depth + 1));
      ancestors.delete(item);
      return valid;
    };
    if (!jsonValue(input.metadata, 0)) return;
    const serialized = JSON.stringify(input.metadata);
    if (typeof serialized !== 'string' || serialized.length > 128 * 1024) return;
    return { turnId: input.turnId, metadata: JSON.parse(serialized) };
  } catch { return; }
}
