import type { ThreadStartOptions } from './threadStart';
import { createThreadHistory } from './threadHistory';
import type { HistoryReadOptions } from './threadHistory';
import { parseBackgroundTerminalPage, parseTermination } from './backgroundTerminalResponse';
import { collaborationMode } from './planning';
import { userInput } from './attachments';
export type RpcMessage = { id?: number | string; method?: string; params?: any; result?: any; error?: any };
type Bridge = { connect: () => Promise<any>; request: (method: string, params?: unknown) => Promise<any>; notify: (method: string, params?: unknown) => Promise<any>; respond: (id: number | string, result?: unknown, error?: unknown) => Promise<any>; onNotification: (listener: (message: RpcMessage) => void) => () => void; onServerRequest: (listener: (message: RpcMessage) => void) => () => void; onError: (listener: (message: any) => void) => () => void; onStderr: (listener: (message: any) => void) => () => void; onClosed: (listener: (message: any) => void) => () => void };
const bridge = () => window.codex as Bridge;
const unwrap = async <T>(promise: Promise<any>): Promise<T> => { const response = await promise; if (!response?.ok) throw new Error(response?.error?.message || response?.error || 'Codex app-server request failed'); return response.result as T; };
let connecting: Promise<any> | undefined;
export function connectCodex() {
  if (connecting) return connecting;
  const attempt = (async () => {
    const info = await bridge()?.connect();
    if (!info?.ok) throw new Error(info?.error || 'Codex app-server unavailable');
    try {
      await unwrap(bridge().request('initialize', { clientInfo: { name: 'felix', title: 'Felix', version: '0.1.0' }, capabilities: { experimentalApi: true } }));
    } catch (error) {
      // A renderer reload can attach to an already initialized main-process RPC.
      if (!/^already initialized\.?$/i.test((error as Error).message.trim())) throw error;
    }
    const response = await bridge().notify('initialized', {});
    if (response?.ok === false) throw new Error(response.error?.message || response.error || '初始化通知失败');
    return info;
  })();
  connecting = attempt;
  void attempt.finally(() => { if (connecting === attempt) connecting = undefined; }).catch(() => {});
  return attempt;
}
export async function startThread(params: ThreadStartOptions) { const { permission, providerId, effort, ...rest } = params; const autoReview = permission === 'workspace-write'; return unwrap<any>(bridge().request('thread/start', { ...rest, ...(effort && effort !== 'default' ? { effort } : {}), ...(providerId ? { providerId } : {}), modelProvider: 'minimax', approvalPolicy: permission === 'danger-full-access' ? 'never' : 'on-request', ...(permission === 'danger-full-access' ? { sandbox: 'danger-full-access' } : { sandbox: permission === 'workspace-write' ? 'workspace-write' : 'read-only' }), ...(autoReview ? { approvalsReviewer: 'auto_review' } : {}), personality: 'friendly' })); }
export async function resumeThread(threadId: string) { return unwrap<any>(bridge().request('thread/resume', { threadId, excludeTurns: false })); }
export async function switchThreadProvider(threadId: string, providerId: string, model: string) { return unwrap<any>(bridge().request('felix/thread/provider', { threadId, providerId, model })); }
export async function updateThreadPermission(threadId: string, permission: 'on-request' | 'workspace-write' | 'danger-full-access') {
  const sandboxPolicy = permission === 'danger-full-access' ? { type: 'dangerFullAccess' } : permission === 'workspace-write'
    ? { type: 'workspaceWrite', writableRoots: [], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false }
    : { type: 'readOnly', networkAccess: false };
  let dispose = () => {};
  let closed = () => {};
  let timer: ReturnType<typeof setTimeout>;
  const applied = new Promise<any>((resolve, reject) => {
    dispose = bridge().onNotification(message => {
      if (message.method === 'thread/settings/updated' && message.params?.threadId === threadId) resolve(message.params.threadSettings);
    });
    closed = bridge().onClosed(() => reject(new Error('连接已断开，权限变更结果待确认')));
    timer = setTimeout(() => reject(new Error('权限变更尚未确认，请重新打开会话核对')), 15000);
  });
  try {
    // The RPC response only acknowledges enqueueing. Wait for effective settings.
    const [, settings] = await Promise.all([
      unwrap(bridge().request('thread/settings/update', { threadId, sandboxPolicy, approvalPolicy: permission === 'danger-full-access' ? 'never' : 'on-request', approvalsReviewer: permission === 'workspace-write' ? 'auto_review' : 'user' })),
      applied,
    ]);
    return settings;
  } finally { clearTimeout(timer!); dispose(); closed(); }
}
export async function listThreadTurns(threadId: string, cursor?: string) { return unwrap<any>(bridge().request('thread/turns/list', { threadId, limit: 100, sortDirection: 'asc', itemsView: 'full', ...(cursor ? { cursor } : {}) })); }
export async function listThreadItems(threadId: string, cursor?: string) { return unwrap<any>(bridge().request('thread/items/list', { threadId, limit: 200, sortDirection: 'asc', ...(cursor ? { cursor } : {}) })); }
export async function listAllThreadItems(threadId: string, options?: HistoryReadOptions) { return createThreadHistory(listThreadItems).readAll(threadId, options); }
export async function setThreadName(threadId: string, name: string) { return unwrap<any>(bridge().request('thread/name/set', { threadId, name })); }
export async function archiveThread(threadId: string) { return unwrap<any>(bridge().request('thread/archive', { threadId })); }
export async function unarchiveThread(threadId: string) { return unwrap<any>(bridge().request('thread/unarchive', { threadId })); }
export async function listArchivedThreads(cursor?: string) { return unwrap<any>(bridge().request('thread/list', { modelProviders: [], archived: true, limit: 100, sortKey: 'recency_at', sortDirection: 'desc', ...(cursor ? { cursor } : {}) })); }
export async function deleteThread(threadId: string) { return unwrap<any>(bridge().request('thread/delete', { threadId })); }
export async function forkThread(threadId: string, lastTurnId?: string) { return unwrap<any>(bridge().request('thread/fork', { threadId, excludeTurns: true, ...(lastTurnId ? { lastTurnId, deferGoalContinuation: true } : {}) })); }
export async function startTurn(params: { threadId: string; text: string; skills?: { name: string; path: string }[]; attachments?: string[]; planningMode?: 'default' | 'plan'; plugins?: { id: string; name: string }[]; cwd?: string; model?: string; modelProvider?: string; effort?: string }) { return unwrap<any>(bridge().request('turn/start', { threadId: params.threadId, ...((params.planningMode || params.effort === 'default') && params.model ? { collaborationMode: collaborationMode(params.planningMode || 'default', params.model, params.effort) } : {}), input: userInput(params.text, params.plugins, params.attachments, params.skills), ...(params.cwd ? { cwd: params.cwd } : {}), ...(params.model ? { model: params.model } : {}), modelProvider: 'minimax', ...(params.effort && params.effort !== 'default' ? { effort: params.effort } : {}) })); }
export async function interruptTurn(threadId: string, turnId: string) { return unwrap<any>(bridge().request('turn/interrupt', { threadId, turnId })); }
export async function steerTurn(threadId: string, expectedTurnId: string, text: string, plugins: { id: string; name: string }[] = [], attachments: string[] = [], skills: { name: string; path: string }[] = []) {
  return unwrap<any>(bridge().request('turn/steer', { threadId, expectedTurnId, input: userInput(text, plugins, attachments, skills) }));
}
export async function listThreads(cursor?: string, searchTerm?: string) { return unwrap<any>(bridge().request('thread/list', { modelProviders: [], limit: 100, ...(searchTerm ? { searchTerm } : {}), sortKey: 'recency_at', sortDirection: 'desc', ...(cursor ? { cursor } : {}) })); }
export async function searchThreads(searchTerm: string, cursor?: string, archived = false) { return unwrap<any>(bridge().request('thread/search', { searchTerm, archived, limit: 100, sortKey: 'recency_at', sortDirection: 'desc', ...(cursor ? { cursor } : {}) })); }
export function subscribeCodex(handlers: { notification?: (message: RpcMessage) => void; serverRequest?: (message: RpcMessage) => void; error?: (message: any) => void; stderr?: (message: any) => void; closed?: (message: any) => void }) { const cleanups = [handlers.notification && bridge()?.onNotification(handlers.notification), handlers.serverRequest && bridge()?.onServerRequest(handlers.serverRequest), handlers.error && bridge()?.onError(handlers.error), handlers.stderr && bridge()?.onStderr(handlers.stderr), handlers.closed && bridge()?.onClosed(handlers.closed)].filter(Boolean) as Array<() => void>; return () => cleanups.forEach(cleanup => cleanup()); }
export type BackgroundTerminal = { processId: string; command: string; cwd: string; osPid?: number | null; cpuPercent?: number | null; rssKb?: number | null };
export async function listBackgroundTerminals(threadId: string, cursor?: string) {
  return parseBackgroundTerminalPage(await unwrap<unknown>(bridge().request('thread/backgroundTerminals/list', { threadId, limit: 50, ...(cursor ? { cursor } : {}) })));
}
export async function terminateBackgroundTerminal(threadId: string, processId: string) {
  return parseTermination(await unwrap<unknown>(bridge().request('thread/backgroundTerminals/terminate', { threadId, processId })));
}
