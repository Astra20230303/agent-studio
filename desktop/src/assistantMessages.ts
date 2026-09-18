import type { Thread } from './domain';

const identity = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);

export function applyAssistantMessage(thread: Thread, method: string, params: any): boolean {
  const completed = method === 'item/completed' && params?.item?.type === 'agentMessage';
  if (!completed && method !== 'item/agentMessage/delta') return false;
  if (!identity(params?.threadId) || params.threadId !== thread.remoteId || !identity(params.turnId)) return false;
  const itemId = completed ? params.item.id : params.itemId;
  const text = completed ? params.item.text : params.delta;
  if (!identity(itemId) || typeof text !== 'string') return false;
  const id = `live-${itemId}`;
  const existing = thread.messages.find(message => message.id === id);
  if (existing && (existing.role !== 'assistant' || existing.turnId && existing.turnId !== params.turnId || !completed && existing.streamCompleted)) return false;
  if (existing) {
    existing.content = completed ? text : existing.content + text;
    existing.turnId = params.turnId;
    if (completed) existing.streamCompleted = true;
  } else {
    thread.messages.push({ id, role: 'assistant', content: text, turnId: params.turnId, streamCompleted: completed, createdAt: new Date().toISOString() });
  }
  // Item completion does not imply that its containing turn has finished.
  if (!completed) thread.status = 'running';
  return true;
}
