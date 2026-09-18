type Start = typeof import('./codexClient').startTurn;
type Steer = typeof import('./codexClient').steerTurn;
const object = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
const identity = (value: any): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
export function readTurnStart(value: any, threadId: string) {
  if (!object(value) || !object(value.turn) || !identity(value.turn.id)
    || value.threadId != null && value.threadId !== threadId
    || value.turn.status != null && !['inProgress','completed','failed','interrupted'].includes(value.turn.status)) {
    throw Error('发送未确认：服务端回合数据无效，请检查会话记录后再试。');
  }
  return { turn: { id: value.turn.id, status: (value.turn.status || 'inProgress') as 'inProgress' | 'completed' | 'failed' | 'interrupted' } };
}
export function readTurnSteer(value: any, expectedTurnId: string) {
  if (!object(value) || !identity(value.turnId) || value.turnId !== expectedTurnId) throw Error('追加未确认：服务端回合编号不一致，请检查会话记录后再试。');
  return { turnId: value.turnId };
}
export function createTurnCommands(backend: { start: Start; steer: Steer }) {
  const pending = new Set<string>();
  async function exclusive<T>(threadId: string, operation: () => Promise<T>) {
    if (pending.has(threadId)) throw Error('此会话的发送请求尚未确认，请等待完成。');
    pending.add(threadId);
    try { return await operation(); } finally { pending.delete(threadId); }
  }
  return {
    start(options: Parameters<Start>[0]) {
      const snapshot = structuredClone(options);
      return exclusive(snapshot.threadId, async () => readTurnStart(await backend.start(snapshot), snapshot.threadId));
    },
    steer(...args: Parameters<Steer>) {
      const snapshot = structuredClone(args);
      return exclusive(snapshot[0], async () => readTurnSteer(await backend.steer(...snapshot), snapshot[1]));
    },
  };
}
