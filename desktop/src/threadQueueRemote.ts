export type RemoteQueuedSubmission = { id: string; input: unknown[]; clientUserMessageId: string };
const id = (value: unknown, label: string): string => { if (typeof value !== 'string' || !/^\S+$/.test(value)) throw new Error(`${label} 无效`); return value; };
export function readRemoteQueuePage(value: unknown): { data: RemoteQueuedSubmission[]; nextCursor?: string } {
  const input = value as any;
  if (!input || !Array.isArray(input.data) || input.data.length > 500 || input.nextCursor != null && (typeof input.nextCursor !== 'string' || !input.nextCursor.trim())) throw new Error('服务端队列响应无效');
  const data = input.data.map((item: any) => { if (!item || !Array.isArray(item.input) || item.input.length === 0 || item.input.length > 100 || item.input.some((entry: unknown) => entry == null || typeof entry !== 'object') ) throw new Error('服务端队列条目无效'); return { id: id(item.id, '排队提交身份'), input: structuredClone(item.input), clientUserMessageId: id(item.clientUserMessageId, '客户端消息身份') }; });
  return { data, ...(input.nextCursor ? { nextCursor: input.nextCursor } : {}) };
}
export function remoteQueueIdentity(threadId: string, submissionId?: string) { return { threadId: id(threadId, '会话身份'), ...(submissionId !== undefined ? { queuedSubmissionId: id(submissionId, '排队提交身份') } : {}) }; }
export function remoteQueueReorderParams(threadId: string, submissionIds: string[]) {
  if (!Array.isArray(submissionIds) || new Set(submissionIds).size !== submissionIds.length) throw new Error('队列排序身份重复或无效');
  return { ...remoteQueueIdentity(threadId), queuedSubmissionIds: submissionIds.map(value => id(value, '排队提交身份')) };
}
export function moveRemoteQueue(items: RemoteQueuedSubmission[], submissionId: string, direction: -1 | 1): string[] {
  const ids = items.map(item => item.id);
  const index = ids.indexOf(submissionId), target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length || ![-1, 1].includes(direction)) throw new Error('无法移动此排队消息');
  [ids[index], ids[target]] = [ids[target], ids[index]];
  return ids;
}

export function queueTextBlocks(input: unknown[]): { index: number; text: string }[] {
  return input.flatMap((entry: any, index) => entry?.type === 'text' && typeof entry.text === 'string' ? [{ index, text: entry.text }] : []);
}
export function replaceQueueText(input: unknown[], texts: string[]): unknown[] {
  const blocks = queueTextBlocks(input);
  if (!blocks.length || texts.length !== blocks.length || texts.some(text => typeof text !== 'string' || !text.trim() || text.length > 100000)) throw new Error('排队消息文本无效');
  const result = structuredClone(input) as any[];
  blocks.forEach((block, i) => {
    if (block.text !== texts[i]) result[block.index] = { ...result[block.index], text: texts[i], text_elements: [] };
  });
  return result;
}
