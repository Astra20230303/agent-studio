import { applyAssistantMessage } from './assistantMessages.ts';
import { acceptTurnNotification } from './turnNotifications.ts';
import { readPlan, readPlanDelta, readPlanMessage } from './planning.ts';
import { recordTurnFailure } from './turnFailure.ts';
import { applyToolEvent, finishTools, upsertTool } from './toolActivity.ts';
import type { DesktopState } from './domain';
import type { TurnEvent, TurnRuntime } from './turnRuntime';
import { readTurnModerationMetadata } from './turnModerationMetadata.ts';

const methods = new Set(['turn/plan/updated', 'turn/diff/updated', 'turn/moderationMetadata', 'turn/started', 'turn/completed', 'error', 'item/agentMessage/delta', 'item/started', 'item/completed', 'item/autoApprovalReview/started', 'item/autoApprovalReview/completed', 'item/plan/delta', 'item/commandExecution/outputDelta', 'item/commandExecution/terminalInteraction', 'item/fileChange/outputDelta', 'item/fileChange/patchUpdated', 'item/mcpToolCall/progress', 'item/reasoning/textDelta', 'item/reasoning/summaryTextDelta', 'item/reasoning/summaryPartAdded']);

export function createThreadEvents({ update, runtime, queue, audit, activeRemoteId }: {
  update: (mutate: (state: DesktopState) => void) => void;
  runtime: { read: (threadId: string) => TurnRuntime | undefined; apply: (threadId: string, event: TurnEvent) => void };
  queue: { finish: (threadId: string, turnId: string, success: boolean) => void };
  audit: { record: (action: string, detail?: string) => void };
  activeRemoteId?: () => string | undefined;
}) {
  // One event boundary coordinates transcript, runtime, queue and audit effects.
  return (message: { method?: string; params?: any; eventId?: string }): boolean => {
    if (!methods.has(message.method || '')) return false;
    const params = message.params || {};
    if (!acceptTurnNotification(message.method, params, runtime.read)) return true;
    if (message.method === 'turn/plan/updated') {
      const plan = readPlan(params);
      const current = runtime.read(params.threadId);
      if (current?.turnId && current.turnId !== params.turnId || current?.completed.includes(params.turnId)) return true;
      if (plan) update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) thread.plan = plan; });
    }
    if (message.method === 'turn/diff/updated') {
      const valid = typeof params.threadId === 'string' && params.threadId.trim() === params.threadId && params.threadId.length > 0 && !/[\0\r\n]/.test(params.threadId)
        && typeof params.turnId === 'string' && params.turnId.trim() === params.turnId && params.turnId.length > 0 && !/[\0\r\n]/.test(params.turnId)
        && typeof params.diff === 'string' && params.diff.length <= 2 * 1024 * 1024;
      const current = runtime.read(params.threadId);
      if (!valid || current?.turnId && current.turnId !== params.turnId || current?.completed.includes(params.turnId)) return true;
      update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) thread.turnDiff = { turnId: params.turnId, diff: params.diff }; });
    }
    if (message.method === 'turn/moderationMetadata') {
      const metadata = readTurnModerationMetadata(params);
      if (!metadata) return true;
      const current = runtime.read(params.threadId);
      if (!metadata || current?.turnId && current.turnId !== metadata.turnId || current?.completed.includes(metadata?.turnId || '')) return true;
      update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) thread.moderationMetadata = { turnId: metadata.turnId, metadata: metadata.metadata }; });
    }
    if (message.method === 'item/plan/delta') {
      const delta = readPlanDelta(params);
      const current = runtime.read(params.threadId);
      if (!delta || current?.turnId && current.turnId !== delta.turnId || current?.completed.includes(delta?.turnId || '')) return true;
      update(next => {
        const thread = next.threads.find(item => item.remoteId === params.threadId);
        if (!thread) return;
        if (thread.planDelta && (thread.planDelta.turnId !== delta.turnId || thread.planDelta.itemId !== delta.itemId)) return;
        thread.planDelta = { turnId: delta.turnId, itemId: delta.itemId, content: (thread.planDelta?.content || '') + delta.delta };
      });
    }
    if (message.method === 'item/autoApprovalReview/started' || message.method === 'item/autoApprovalReview/completed') {
      const valid = typeof params.threadId === 'string' && params.threadId.trim() === params.threadId && params.threadId.length > 0
        && typeof params.turnId === 'string' && params.turnId.trim() === params.turnId && params.turnId.length > 0
        && typeof params.reviewId === 'string' && params.reviewId.trim() === params.reviewId && params.reviewId.length > 0
        && params.review && typeof params.review === 'object' && typeof params.action === 'object';
      if (valid) update(next => {
        const thread = next.threads.find(item => item.remoteId === params.threadId);
        if (!thread) return;
        const id = `tool-auto-review-${params.reviewId}`;
        const current = thread.messages.find(item => item.id === id)?.tool;
        if (current && (current.turnId !== params.turnId || current.status !== 'inProgress') && message.method !== 'item/autoApprovalReview/completed') return;
        const item: any = { id: `auto-review-${params.reviewId}`, type: 'autoApprovalReview', reviewId: params.reviewId, targetItemId: params.targetItemId, review: params.review, action: params.action, decisionSource: params.decisionSource };
        if (message.method === 'item/autoApprovalReview/completed') item.status = 'completed';
        else item.status = 'inProgress';
        upsertTool(thread, item, params.turnId, message.method === 'item/autoApprovalReview/completed');
      });
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
        if (thread.planDelta?.turnId === planMessage.turnId && thread.planDelta.itemId === params.item.id) thread.planDelta = undefined;
      });
    }
    if (message.method === 'turn/started' && params.threadId && params.turn?.id) {
      audit.record('回合开始', params.threadId);
      runtime.apply(params.threadId, { type: 'start', turnId: params.turn.id });
      update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) { thread.status = 'running'; if (thread.plan?.turnId !== params.turn.id) thread.plan = undefined; if (thread.planDelta?.turnId !== params.turn.id) thread.planDelta = undefined; if (thread.turnDiff?.turnId !== params.turn.id) thread.turnDiff = undefined; if (thread.moderationMetadata?.turnId !== params.turn.id) thread.moderationMetadata = undefined; } });
    }
    if (message.method === 'item/agentMessage/delta' || message.method === 'item/completed' && params.item?.type === 'agentMessage') {
      if (message.method === 'item/agentMessage/delta') runtime.apply(params.threadId, { type: 'activity', turnId: params.turnId });
      update(next => {
        const thread = next.threads.find(item => item.remoteId === params.threadId);
        if (thread) applyAssistantMessage(thread, message.method!, message.eventId && !params.eventId ? { ...params, eventId: message.eventId } : params);
      });
    }
    if (message.method && ['item/started', 'item/completed', 'item/commandExecution/outputDelta', 'item/commandExecution/terminalInteraction', 'item/fileChange/outputDelta', 'item/fileChange/patchUpdated', 'item/mcpToolCall/progress', 'item/reasoning/textDelta', 'item/reasoning/summaryTextDelta', 'item/reasoning/summaryPartAdded'].includes(message.method)) {
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
        if (thread.remoteId !== activeRemoteId?.()) thread.unread = true;
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
