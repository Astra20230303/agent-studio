export type TimelineEntry =
  | { type: 'item'; position: number; turnId: string; itemType: string; itemId: string }
  | { type: 'realtime'; position: number }
  | { type: 'turnStarted'; position: number; turnId: string; startedAt?: number | null }
  | { type: 'turnCompleted'; position: number; turnId: string; status: string; startedAt?: number | null; completedAt?: number | null; durationMs?: number | null };
export type TimelinePage = { data: TimelineEntry[]; nextCursor?: string };
const id = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
const timestamp = (value: unknown) => value == null || Number.isSafeInteger(value) ? value as number | null | undefined : undefined;
export function readThreadTimelinePage(value: unknown): TimelinePage {
  const input = value as any;
  if (!input || !Array.isArray(input.data) || input.nextCursor != null && !id(input.nextCursor)) throw new Error('会话时间线格式无效');
  const positions = new Set<number>();
  const data = input.data.map((entry: any) => {
    if (!entry || !['item', 'realtime', 'turnStarted', 'turnCompleted'].includes(entry.type) || !Number.isSafeInteger(entry.position) || entry.position < 0 || positions.has(entry.position)) throw new Error('会话时间线条目无效');
    positions.add(entry.position);
    if (entry.type === 'item') {
      if (!id(entry.turnId) || !entry.item || typeof entry.item !== 'object' || !id(entry.item.id) || !id(entry.item.type)) throw new Error('会话时间线条目无效');
      return { type: 'item', position: entry.position, turnId: entry.turnId, itemType: entry.item.type, itemId: entry.item.id };
    }
    if (entry.type === 'realtime') return { type: 'realtime', position: entry.position };
    if (!id(entry.turnId) || !['turnStarted', 'turnCompleted'].includes(entry.type) || ['startedAt', 'completedAt', 'durationMs'].some(key => entry[key] !== undefined && timestamp(entry[key]) === undefined)) throw new Error('会话时间线回合无效');
    if (entry.type === 'turnStarted') return { type: 'turnStarted', position: entry.position, turnId: entry.turnId, ...(entry.startedAt !== undefined ? { startedAt: entry.startedAt } : {}) };
    if (typeof entry.status !== 'string' || !entry.status.trim()) throw new Error('会话时间线回合无效');
    return { type: 'turnCompleted', position: entry.position, turnId: entry.turnId, status: entry.status, ...(entry.startedAt !== undefined ? { startedAt: entry.startedAt } : {}), ...(entry.completedAt !== undefined ? { completedAt: entry.completedAt } : {}), ...(entry.durationMs !== undefined ? { durationMs: entry.durationMs } : {}) };
  });
  return { data, ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}) };
}
