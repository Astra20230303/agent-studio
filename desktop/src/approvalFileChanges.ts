import type { Thread, ToolActivity } from './domain';
export function approvalFileChanges(request: any, threads: Thread[]): ToolActivity['changes'] {
  if (request?.method !== 'item/fileChange/requestApproval') return;
  const { threadId, turnId, itemId } = request.params || {};
  if (![threadId, turnId, itemId].every(value => typeof value === 'string' && value)) return;
  const message = threads.find(thread => thread.remoteId === threadId)?.messages.find(message => message.id === `tool-${itemId}` && message.tool?.turnId === turnId && message.tool?.kind === 'fileChange');
  return message?.tool?.changes;
}
