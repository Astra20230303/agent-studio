import { applyAssistantMessage } from './assistantMessages.ts';
import { acceptTurnNotification } from './turnNotifications.ts';
import { readPlan, readPlanMessage } from './planning.ts';
import { recordTurnFailure } from './turnFailure.ts';
import { applyToolEvent, finishTools } from './toolActivity.ts';
import type { DesktopState } from './domain';
import type { TurnEvent, TurnRuntime } from './turnRuntime';

const methods = new Set(['turn/plan/updated', 'turn/started', 'turn/completed', 'error', 'item/agentMessage/delta', 'item/started', 'item/completed', 'item/commandExecution/outputDelta', 'item/fileChange/outputDelta', 'item/fileChange/patchUpdated', 'item/reasoning/summaryTextDelta', 'item/reasoning/summaryPartAdded']);

export function createThreadEvents({ update, runtime, queue, audit }: {
  update: (mutate: (state: DesktopState) => void) => void;
  runtime: { read: (threadId: string) => TurnRuntime | undefined; apply: (threadId: string, event: TurnEvent) => void };
  queue: { finish: (threadId: string, turnId: string, success: boolean) => void };
  audit: { record: (action: string, detail?: string) => void };
}) {
  // One event boundary coordinates transcript, runtime, queue and audit effects.
  return (message: { method?: string; params?: any }): boolean => {
    if (!methods.has(message.method || '')) return false;
    const params = message.params || {};
    if (!acceptTurnNotification(message.method, params, runtime.read)) return true;
    if (message.method === 'turn/plan/updated') {
      const plan = readPlan(params);
      const current = runtime.read(params.threadId);
      if (current?.turnId && current.turnId !== params.turnId || current?.completed.includes(params.turnId)) return true;
      if (plan) update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) thread.plan = plan; });
    }
    if (message.method === 'item/completed' && params.item?.type === 'plan') {
      const planMessage = readPlanMessage(params);
      const current = runtime.read(params.threadId);
      if (!planMessage || current?.turnId && current.turnId !== planMessage.turnId) return true;
      update(next => {
        const thread = next.threads.find(item => item.remoteId === params.threadId);
        if (!thread) return;
        const saved = thread.messages.find(item => item.id === planMessage.id);
        if (saved) { if (saved.role === 'assistant' && (!saved.turnId || saved.turnId === planMessage.turnId)) Object.assign(saved, planMessage); }
        else thread.messages.push({ ...planMessage, role: 'assistant', createdAt: new Date().toISOString() });
      });
    }
    if (message.method === 'turn/started' && params.threadId && params.turn?.id) {
      audit.record('回合开始', params.threadId);
      runtime.apply(params.threadId, { type: 'start', turnId: params.turn.id });
      update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) { thread.status = 'running'; if (thread.plan?.turnId !== params.turn.id) thread.plan = undefined; } });
    }
    if (message.method === 'item/agentMessage/delta' || message.method === 'item/completed' && params.item?.type === 'agentMessage') {
      if (message.method === 'item/agentMessage/delta') runtime.apply(params.threadId, { type: 'activity', turnId: params.turnId });
      update(next => {
        const thread = next.threads.find(item => item.remoteId === params.threadId);
        if (thread) applyAssistantMessage(thread, message.method!, params);
      });
    }
    if (message.method && ['item/started', 'item/completed', 'item/commandExecution/outputDelta', 'item/fileChange/outputDelta', 'item/fileChange/patchUpdated', 'item/reasoning/summaryTextDelta', 'item/reasoning/summaryPartAdded'].includes(message.method)) {
      update(next => {
        const thread = next.threads.find(item => item.remoteId === params.threadId);
        if (thread) applyToolEvent(thread, message.method!, params);
      });
    }
    if (message.method === 'error') {
      if (params.willRetry) runtime.apply(params.threadId, { type: 'activity', turnId: params.turnId, activity: '服务暂时不可用，正在重试…' });
      else update(next => {
        const thread = next.threads.find(item => item.remoteId === params.threadId);
        if (thread) {
          recordTurnFailure(thread, params.turnId, params.error);
          const currentTurn = runtime.read(params.threadId)?.turnId;
          if (currentTurn && currentTurn !== params.turnId) thread.status = 'running';
        }
      });
    }
    if (message.method === 'turn/completed') {
      if (typeof params.threadId === 'string') audit.record('回合结束', params.threadId);
      queue.finish(params.threadId, params.turn?.id, params.turn?.status === 'completed');
      if (params.threadId && params.turn?.id) runtime.apply(params.threadId, { type: 'finish', turnId: params.turn.id, status: params.turn.status });
      update(next => {
        const thread = next.threads.find(item => item.remoteId === params.threadId);
        if (!thread) return;
        finishTools(thread, params.turn?.id, params.turn?.status === 'failed');
        if (params.turn?.error || params.turn?.status === 'failed') {
          recordTurnFailure(thread, params.turn?.id, params.turn?.error);
          if (runtime.read(params.threadId)?.turnId) thread.status = 'running';
        }
        else thread.status = runtime.read(params.threadId)?.turnId ? 'running' : 'completed';
      });
    }
    return true;
  };
}
