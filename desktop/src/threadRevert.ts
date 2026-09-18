const validId = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.trim() === value && !/[\0\r\n]/.test(value);
export function readThreadRevertResponse(value: any, threadId: string) {
  if (!validId(threadId) || !validId(value?.thread?.id) || value.thread.id !== threadId || value.turnsBackwardsCursor != null && typeof value.turnsBackwardsCursor !== 'string' || value.itemsBackwardsCursor != null && typeof value.itemsBackwardsCursor !== 'string') throw new Error('服务端返回了无效回退结果');
  return { threadId, turnsBackwardsCursor: value.turnsBackwardsCursor, itemsBackwardsCursor: value.itemsBackwardsCursor };
}
