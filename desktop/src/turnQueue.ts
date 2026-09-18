export type QueuedTurn = {
  skills?: { name: string; path: string }[];
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
export function pauseThreadQueue(queue: QueuedTurn[], localId: string): QueuedTurn[] {
  return queue.map(item => item.localId === localId && item.status !== 'sending'
    ? { ...item, status: 'paused', error: '队列已手动暂停。' } : item);
}
export function queueMoveTarget(queue: QueuedTurn[], id: string, direction: -1 | 1): number {
  const source = queue.findIndex(item => item.id === id);
  const item = queue[source];
  if (!item || item.status !== 'paused') return -1;
  for (let index = source + direction; index >= 0 && index < queue.length; index += direction) {
    const target = queue[index];
    if (target.threadId !== item.threadId) continue;
    return target.localId === item.localId && target.status === 'paused' ? index : -1;
  }
  return -1;
}
export function moveQueuedTurn(queue: QueuedTurn[], id: string, direction: -1 | 1): QueuedTurn[] {
  const target = queueMoveTarget(queue, id, direction);
  if (target < 0) return queue;
  const source = queue.findIndex(item => item.id === id);
  const next = [...queue];
  [next[source], next[target]] = [next[target], next[source]];
  return next;
}
export function restoreQueue(raw: string | null): QueuedTurn[] {
  const items = JSON.parse(raw ?? '[]');
  const ids = new Set<string>();
  if (!Array.isArray(items) || !items.every(item => {
    if (!item || !['id', 'localId', 'threadId', 'text', 'model', 'effort'].every(key => typeof item[key] === 'string')
      || !item.id.trim() || !item.localId.trim() || !item.threadId.trim() || ids.has(item.id)
      || !Array.isArray(item.plugins) || !item.plugins.every((plugin: any) => plugin && typeof plugin.id === 'string' && typeof plugin.name === 'string')
      || item.attachments !== undefined && (!Array.isArray(item.attachments) || !item.attachments.every((path: unknown) => typeof path === 'string'))
      || item.skills !== undefined && (!Array.isArray(item.skills) || !item.skills.every((skill: any) => skill && typeof skill.name === 'string' && typeof skill.path === 'string'))
      || item.cwd !== undefined && typeof item.cwd !== 'string'
      || item.waitingOn !== undefined && typeof item.waitingOn !== 'string'
      || item.planningMode !== undefined && !['default', 'plan'].includes(item.planningMode)
      || !Array.isArray(item.plugins) || item.plugins.some((plugin: any) => !plugin || typeof plugin.id !== 'string' || !plugin.id.trim() || typeof plugin.name !== 'string')
      || item.skills !== undefined && item.skills.some((skill: any) => !skill || typeof skill.name !== 'string' || typeof skill.path !== 'string' || !skill.path.trim())) return false;
    ids.add(item.id); return true;
  })) throw Error('排队消息格式无效，原始数据已保留。');
  return items.map(item => ({ ...item, planningMode: item.planningMode || 'default', status: 'paused', error: item.status === 'sending' ? '上次发送结果未知，请检查会话记录后再试。' : '已恢复排队消息，请继续队列。' }));
}
