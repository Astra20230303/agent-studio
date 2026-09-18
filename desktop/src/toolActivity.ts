import type { Message, Thread, ToolActivity } from './domain';

export function upsertTool(thread: Thread, item: any, turnId?: string, completed = false) {
  if (typeof item?.id !== 'string' || typeof item.type !== 'string' || ['userMessage', 'agentMessage', 'plan'].includes(item.type)) return;
  const known = ['commandExecution', 'fileChange', 'collabAgentToolCall', 'subAgentActivity', 'contextCompaction', 'mcpToolCall', 'dynamicToolCall'].includes(item.type);
  const id = `tool-${item.id}`;
  let message = thread.messages.find(message => message.id === id);
  if (!message) {
    message = { id, role: 'system', content: '', createdAt: new Date().toISOString() };
    thread.messages.push(message);
  }
  const previous = message.tool;
  // Lifecycle completion supplies authoritative output; deltas are only provisional.
  message.tool = {
    ...previous,
    kind: known ? item.type : 'rawRecord',
    rawRecord: known ? undefined : { type: item.type, item: { ...previous?.rawRecord?.item, ...item } },
    subAgent: item.type === 'subAgentActivity' ? { kind: item.kind ?? previous?.subAgent?.kind, threadId: item.agentThreadId ?? previous?.subAgent?.threadId, path: item.agentPath ?? previous?.subAgent?.path } : undefined,
    invocation: ['mcpToolCall', 'dynamicToolCall'].includes(item.type) ? { server: item.server ?? item.namespace ?? previous?.invocation?.server, name: item.tool ?? previous?.invocation?.name, arguments: item.arguments !== undefined ? item.arguments : previous?.invocation?.arguments, result: item.result !== undefined ? item.result : item.contentItems !== undefined ? item.contentItems : previous?.invocation?.result, error: item.error !== undefined ? item.error : previous?.invocation?.error, success: item.success ?? previous?.invocation?.success } : undefined,
    collaboration: item.type === 'collabAgentToolCall' ? { tool: item.tool ?? previous?.collaboration?.tool, prompt: item.prompt ?? previous?.collaboration?.prompt, model: item.model ?? previous?.collaboration?.model, receiverThreadIds: item.receiverThreadIds ?? previous?.collaboration?.receiverThreadIds ?? [], agentsStates: item.agentsStates ?? previous?.collaboration?.agentsStates ?? {} } : undefined,
    status: item.status || (completed ? 'completed' : previous?.status || 'inProgress'),
    turnId: turnId ?? previous?.turnId,
    command: item.command ?? previous?.command,
    cwd: item.cwd ?? previous?.cwd,
    output: item.aggregatedOutput ?? previous?.output ?? '',
    exitCode: item.exitCode ?? previous?.exitCode,
    durationMs: item.durationMs ?? previous?.durationMs,
    changes: item.changes ?? previous?.changes
  };
}

const toolIdentity = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value === value.trim() && !/[\0\r\n]/.test(value);

export function applyToolEvent(thread: Thread, method: string, params: any) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return;
  const lifecycle = method === 'item/started' || method === 'item/completed';
  const itemId = lifecycle ? params.item?.id : params.itemId;
  if (!toolIdentity(itemId) || params.turnId != null && !toolIdentity(params.turnId)) return;
  const existing = thread.messages.find(message => message.id === `tool-${itemId}`)?.tool;
  const kind = lifecycle ? params.item?.type : method.startsWith('item/commandExecution/') ? 'commandExecution' : method.startsWith('item/fileChange/') ? 'fileChange' : method.startsWith('item/reasoning/') ? 'reasoning' : undefined;
  if (!toolIdentity(kind)) return;
  if (existing && ((existing.rawRecord?.type || existing.kind) !== kind || existing.turnId && params.turnId && existing.turnId !== params.turnId)) return;
  // A completed item owns its final output. Only an authoritative completion
  // may update it; starts, patches and deltas cannot reopen or append to it.
  if (existing && existing.status !== 'inProgress' && method !== 'item/completed') return;
  if (method.endsWith('outputDelta') && typeof params.delta !== 'string') return;
  if (method === 'item/fileChange/patchUpdated' && (!Array.isArray(params.changes) || params.changes.some((change: any) => !change || typeof change.path !== 'string' || typeof change.diff !== 'string' || !change.kind || !['add', 'delete', 'update'].includes(change.kind.type)))) return;

  if (method === 'item/reasoning/textDelta' || method === 'item/reasoning/summaryTextDelta' || method === 'item/reasoning/summaryPartAdded') {
    const textDelta = method === 'item/reasoning/textDelta';
    const index = textDelta ? params.contentIndex : params.summaryIndex;
    if (typeof params.itemId !== 'string' || !Number.isSafeInteger(index) || index < 0 || index > 1024) return;
    if ((method.endsWith('summaryTextDelta') || textDelta) && typeof params.delta !== 'string') return;
    let message = thread.messages.find(message => message.id === `tool-${params.itemId}`);
    if (message?.tool && (message.tool.rawRecord?.type !== 'reasoning' || message.tool.status !== 'inProgress')) return;
    if (!message) {
      upsertTool(thread, { id: params.itemId, type: 'reasoning', summary: [] }, params.turnId);
      message = thread.messages.find(message => message.id === `tool-${params.itemId}`);
    }
    const item = message?.tool?.rawRecord?.item;
    if (!item) return;
    const key = textDelta ? 'text' : 'summary';
    const parts = Array.isArray(item[key]) ? [...item[key]] : [];
    parts[index] = (typeof parts[index] === 'string' ? parts[index] : '') + (method.endsWith('summaryTextDelta') || textDelta ? params.delta : '');
    item[key] = parts;
  } else if (method === 'item/started' || method === 'item/completed') {
    upsertTool(thread, params.item, params.turnId, method === 'item/completed');
  } else if (method === 'item/commandExecution/outputDelta' || method === 'item/fileChange/outputDelta') {
    let message = thread.messages.find(message => message.id === `tool-${params.itemId}`);
    if (!message) {
      upsertTool(thread, { id: params.itemId, type: method.includes('commandExecution') ? 'commandExecution' : 'fileChange' }, params.turnId);
      message = thread.messages.find(message => message.id === `tool-${params.itemId}`);
    }
    if (message?.tool && typeof params.delta === 'string') message.tool.output = (message.tool.output || '') + params.delta;
  } else if (method === 'item/fileChange/patchUpdated') {
    upsertTool(thread, { id: params.itemId, type: 'fileChange', changes: params.changes }, params.turnId);
  }
}

export function finishTools(thread: Thread, turnId: string, failed = false) {
  for (const message of thread.messages) {
    if (message.tool?.turnId === turnId && message.tool.status === 'inProgress') {
      message.tool.status = failed ? 'failed' : 'interrupted';
    }
  }
}

export function restoreMessages(items: any[], previous: Message[]): Message[] {
  const thread = { messages: [] as Message[] } as Thread;
  for (const entry of items) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const item = Object.hasOwn(entry, 'item') ? entry.item : entry;
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id || typeof item.type !== 'string') continue;
    if (item && typeof item.type === 'string' && !['userMessage', 'agentMessage', 'plan'].includes(item.type)) {
      const saved = previous.find(message => message.id === `tool-${item.id}`);
      if (saved && !thread.messages.some(message => message.id === saved.id)) thread.messages.push(structuredClone(saved));
      upsertTool(thread, item, entry.turnId, true);
    } else if (item.type === 'userMessage' || item.type === 'agentMessage' || item.type === 'plan') {
      const id = item.type === 'plan' ? `plan-${item.id}` : item.type === 'agentMessage' ? `live-${item.id}` : item.id;
      const existing = thread.messages.find(message => message.id === id);
      const parts = Array.isArray(item.content) ? item.content.filter((part: any) => part && typeof part === 'object' && !Array.isArray(part)) : undefined;
      const saved = previous.find(message => message.id === id);
      const completed = item.type === 'agentMessage' && (['completed', 'failed', 'interrupted'].includes(entry.turnStatus) || existing?.streamCompleted || saved?.streamCompleted && (!entry.turnId || !saved.turnId || entry.turnId === saved.turnId));
      const savedTurnCompatible = !entry.turnId || !saved?.turnId || entry.turnId === saved.turnId;
      const streamDeltaIds = item.type === 'agentMessage' && savedTurnCompatible && Array.isArray(saved?.streamDeltaIds)
        ? [...new Set(saved.streamDeltaIds.filter(value => typeof value === 'string' && value.trim() === value && value.length > 0 && !/[\0\r\n]/.test(value)))].slice(-256)
        : undefined;
      const message = { id,
        ...(completed ? { streamCompleted: true } : {}),
        ...(streamDeltaIds?.length ? { streamDeltaIds } : {}),
        turnId: entry.turnId || previous.find(message => message.id === `live-${item.id}`)?.turnId,
        role: item.type === 'userMessage' ? 'user' : 'assistant',
        attachments: item.type === 'userMessage' ? parts?.filter((part: any) => part.type === 'localImage' && typeof part.path === 'string').map((part: any) => part.path) : undefined,
        plugins: item.type === 'userMessage' ? [...new Map((parts || []).filter((part: any) => part.type === 'mention' && typeof part.name === 'string' && typeof part.path === 'string' && part.path.startsWith('plugin://') && part.path.length > 9).map((part: any) => [part.path, { id: part.path.slice(9), name: part.name }])).values()] : undefined,
        skills: item.type === 'userMessage' ? parts?.filter((part: any) => part.type === 'skill' && typeof part.name === 'string' && typeof part.path === 'string').map((part: any) => ({ name: part.name, path: part.path })) : undefined,
        content: typeof item.text === 'string' ? item.text : parts?.map((part: any) => typeof part.text === 'string' ? part.text : typeof part.input_text === 'string' ? part.input_text : '').join('') ?? existing?.content ?? '',
        createdAt: existing?.createdAt || new Date().toISOString() } as Message;
      if (existing) Object.assign(existing, message);
      else thread.messages.push(message);
    }
  }
  // Keep local-only tool/error records when an older server omits those items.
  for (let i = 0; i < previous.length; i++) {
    const message = previous[i];
    if (!(message.tool || message.id.startsWith('error-')) || thread.messages.some(value => value.id === message.id)) continue;
    const next = previous.slice(i + 1).find(value => thread.messages.some(item => item.id === value.id));
    const index = next ? thread.messages.findIndex(value => value.id === next.id) : thread.messages.length;
    thread.messages.splice(index, 0, message);
  }
  return thread.messages;
}

export function toolLabel(tool: ToolActivity) {
  if (tool.status === 'inProgress') return tool.kind === 'fileChange' ? '正在修改' : '正在运行';
  if (tool.status === 'declined') return '已拒绝';
  if (tool.status === 'interrupted') return '已中断';
  if (tool.status === 'failed' || (tool.exitCode != null && tool.exitCode !== 0)) return '执行失败';
  return tool.kind === 'fileChange' ? '已修改' : '已运行';
}
