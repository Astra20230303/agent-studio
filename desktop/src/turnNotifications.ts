import type { TurnRuntime } from './turnRuntime';

const identity = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);
const object = (value: any) => value && typeof value === 'object' && !Array.isArray(value);

// Gate lifecycle/text notifications before any queue, transcript, or status write.
// Other notification families retain their own parsers.
export function acceptTurnNotification(method: string | undefined, params: any, read: (threadId: string) => TurnRuntime | undefined): boolean {
  if (!['turn/started', 'turn/completed', 'item/agentMessage/delta'].includes(method || '')) return true;
  if (!object(params) || !identity(params.threadId)) return false;
  const delta = method === 'item/agentMessage/delta';
  const turnId = delta ? params.turnId : params.turn?.id;
  if (!identity(turnId)) return false;
  if (delta && (!identity(params.itemId) || typeof params.delta !== 'string')) return false;
  if (!delta && !object(params.turn)) return false;
  if (method === 'turn/completed' && !['completed', 'failed', 'interrupted'].includes(params.turn.status)) return false;
  if (method === 'turn/started' && params.turn.status != null && params.turn.status !== 'inProgress') return false;
  const current = read(params.threadId);
  if (current?.completed.includes(turnId)) return false;
  if (delta && current?.turnId && current.turnId !== turnId) return false;
  return true;
}
