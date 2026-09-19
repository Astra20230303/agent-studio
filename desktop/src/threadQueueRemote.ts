export type RemoteQueuedSubmission = { id: string; input: unknown[]; clientUserMessageId: string };
const id = (value: unknown, label: string): string => { if (typeof value !== 'string' || !/^\S+$/.test(value)) throw new Error(`${label} 无效`); return value; };
export function readRemoteQueuePage(value: unknown): { data: RemoteQueuedSubmission[]; nextCursor?: string } {
  const input = value as any;
  if (!input || !Array.isArray(input.data) || input.data.length > 500 || input.nextCursor != null && (typeof input.nextCursor !== 'string' || !input.nextCursor.trim())) throw new Error('服务端队列响应无效');
  const data = input.data.map((item: any) => { if (!item || !Array.isArray(item.input) || item.input.length === 0 || item.input.length > 100 || item.input.some((entry: unknown) => entry == null || typeof entry !== 'object') ) throw new Error('服务端队列条目无效'); return { id: id(item.id, '排队提交身份'), input: structuredClone(item.input), clientUserMessageId: id(item.clientUserMessageId, '客户端消息身份') }; });
  return { data, ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}) };
}
export function remoteQueueIdentity(threadId: string, submissionId?: string) { return { threadId: id(threadId, '会话身份'), ...(submissionId !== undefined ? { queuedSubmissionId: id(submissionId, '排队提交身份') } : {}) }; }
