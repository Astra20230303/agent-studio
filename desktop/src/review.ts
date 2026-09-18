const validId = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.trim() === value && !/[\0\r\n]/.test(value);
export function readReviewStartResponse(value: any, threadId: string) {
  if (!validId(threadId) || !validId(value?.reviewThreadId) || value.reviewThreadId !== threadId || !validId(value?.turn?.id)) throw new Error('服务端返回了无效代码审查回合');
  return { reviewThreadId: value.reviewThreadId, turnId: value.turn.id };
}
