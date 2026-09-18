import { readThreadPermissions } from './threadPermissions.ts';
import type { Thread } from './domain';
import { validateRestorableHistory } from './historyValidation.ts';

// A successful transport response alone does not confirm the selected thread.
export function readThreadResume(value: any, threadId: string) {
  const object = (item: any) => item && typeof item === 'object' && !Array.isArray(item);
  const thread = value?.thread;
  if (!object(value) || !object(thread) || thread.id !== threadId || !Array.isArray(thread.turns)
    || [value.providerId, value.model, value.reasoningEffort, thread.cwd].some(field => field != null && typeof field !== 'string')) {
    throw Error('服务端会话恢复数据无效，已有会话已保留，请重试。');
  }
  const ids = new Set<string>();
  let running: any;
  const items: any[] = [];
  for (const turn of thread.turns) {
    if (!object(turn) || typeof turn.id !== 'string' || !turn.id.trim() || ids.has(turn.id)
      || !Array.isArray(turn.items) || turn.status != null && !['inProgress', 'completed', 'interrupted', 'failed'].includes(turn.status)) {
      throw Error('服务端会话回合无效，已有会话已保留，请重试。');
    }
    ids.add(turn.id);
    if (turn.status === 'inProgress') {
      if (running) throw Error('服务端返回多个运行中回合，请重试恢复会话。');
      running = turn;
    }
    for (const item of turn.items) items.push({ item, turnId: turn.id, ...(turn.status ? { turnStatus: turn.status } : {}) });
  }
  validateRestorableHistory(items);
  const reasoningEffort: Thread['reasoningEffort'] = value.reasoningEffort === null ? 'default'
    : ['low', 'medium', 'high'].includes(value.reasoningEffort) ? value.reasoningEffort : undefined;
  return structuredClone({ items, running,
    providerId: (value.providerId || undefined) as string | undefined,
    model: (value.model || undefined) as string | undefined,
    cwd: (thread.cwd || undefined) as string | undefined,
    reasoningEffort, permissions: readThreadPermissions(value),
  });
}
