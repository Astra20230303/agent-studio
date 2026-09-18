export type ThreadSearchOccurrence = { turnId: string; itemId: string; snippet: string; matchStart: number; matchEnd: number; turnCursor: string };
const identity = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
export function readThreadSearchOccurrences(value: unknown): { data: ThreadSearchOccurrence[]; nextCursor?: string } {
  const input = value as any;
  if (!input || !Array.isArray(input.data) || input.nextCursor != null && !identity(input.nextCursor)) throw new Error('会话完整搜索响应无效');
  const data = input.data.map((item: any) => {
    const range = item?.snippetMatchRange;
    if (!identity(item?.turnId) || !identity(item?.itemId) || typeof item.snippet !== 'string' || !identity(item?.turnCursor) || !Number.isSafeInteger(range?.start) || !Number.isSafeInteger(range?.end) || range.start < 0 || range.end < range.start || range.end > item.snippet.length) throw new Error('会话搜索结果无效');
    return { turnId: item.turnId, itemId: item.itemId, snippet: item.snippet, matchStart: range.start, matchEnd: range.end, turnCursor: item.turnCursor };
  });
  return { data, ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}) };
}
