export type QueuedTurn = {
  attachments?: string[];
  cwd?: string;
  planningMode?: 'default' | 'plan';
  id: string; localId: string; threadId: string; text: string; model: string;
  effort: string; plugins: { id: string; name: string }[];
  waitingOn?: string; status: 'waiting' | 'ready' | 'sending' | 'paused'; error?: string;
};

export function finishQueuedTurn(queue: QueuedTurn[], threadId: string, turnId: string, success: boolean): QueuedTurn[] {
  return queue.map(item => item.threadId === threadId && item.status === 'waiting' && item.waitingOn === turnId
    ? { ...item, status: success ? 'ready' : 'paused', error: success ? undefined : '上一轮未正常完成，请确认后继续。' } : item);
}
export function restoreQueue(raw: string | null): QueuedTurn[] {
  try {
    const items = JSON.parse(raw || '[]');
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && ['id', 'localId', 'threadId', 'text', 'model', 'effort'].every(key => typeof item[key] === 'string') && Array.isArray(item.plugins))
      .map(item => ({ ...item, status: 'paused', error: item.status === 'sending' ? '上次发送结果未知，请检查会话记录后再试。' : '已恢复排队消息，请继续队列。' }));
  } catch { return []; }
}
