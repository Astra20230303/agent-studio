export type FeedbackInput = { classification: string; reason?: string; threadId?: string; includeLogs?: boolean };
export type FeedbackUploadResult = { threadId: string };

export function validateFeedbackInput(input: FeedbackInput): FeedbackInput {
  if (!input || typeof input.classification !== 'string' || !input.classification.trim() || input.classification.length > 100) throw new Error('反馈分类无效');
  if (input.reason != null && (typeof input.reason !== 'string' || input.reason.length > 10000)) throw new Error('反馈内容无效');
  if (input.threadId != null && (typeof input.threadId !== 'string' || !/^\S+$/.test(input.threadId))) throw new Error('反馈会话无效');
  return { classification: input.classification.trim(), ...(input.reason?.trim() ? { reason: input.reason.trim() } : {}), ...(input.threadId ? { threadId: input.threadId } : {}), ...(input.includeLogs ? { includeLogs: true } : {}) };
}

export function readFeedbackUpload(value: unknown): FeedbackUploadResult {
  const threadId = (value as any)?.threadId;
  if (typeof threadId !== 'string' || !/^\S+$/.test(threadId)) throw new Error('反馈响应无效');
  return { threadId };
}
