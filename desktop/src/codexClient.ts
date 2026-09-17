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
export async function startThread(params: { cwd?: string; model?: string; modelProvider?: string; effort?: string; permission?: 'on-request' | 'workspace-write' | 'danger-full-access' }) { const { permission, ...rest } = params; const autoReview = permission === 'workspace-write'; return unwrap<any>(bridge().request('thread/start', { ...rest, modelProvider: 'minimax', approvalPolicy: permission === 'danger-full-access' ? 'never' : 'on-request', ...(permission === 'danger-full-access' ? { sandbox: 'danger-full-access' } : { sandbox: permission === 'workspace-write' ? 'workspace-write' : 'read-only' }), ...(autoReview ? { approvalsReviewer: 'auto_review' } : {}), personality: 'friendly' })); }
export async function resumeThread(threadId: string) { return unwrap<any>(bridge().request('thread/resume', { threadId, excludeTurns: false })); }
export async function listThreadTurns(threadId: string, cursor?: string) { return unwrap<any>(bridge().request('thread/turns/list', { threadId, limit: 100, sortDirection: 'asc', itemsView: 'full', ...(cursor ? { cursor } : {}) })); }
export async function listThreadItems(threadId: string, cursor?: string) { return unwrap<any>(bridge().request('thread/items/list', { threadId, limit: 200, sortDirection: 'asc', ...(cursor ? { cursor } : {}) })); }
export async function setThreadName(threadId: string, name: string) { return unwrap<any>(bridge().request('thread/name/set', { threadId, name })); }
export async function archiveThread(threadId: string) { return unwrap<any>(bridge().request('thread/archive', { threadId })); }
export async function unarchiveThread(threadId: string) { return unwrap<any>(bridge().request('thread/unarchive', { threadId })); }
export async function listArchivedThreads(cursor?: string) { return unwrap<any>(bridge().request('thread/list', { archived: true, limit: 100, sortKey: 'recencyAt', sortDirection: 'desc', ...(cursor ? { cursor } : {}) })); }
export async function deleteThread(threadId: string) { return unwrap<any>(bridge().request('thread/delete', { threadId })); }
export async function forkThread(threadId: string, lastTurnId?: string) { return unwrap<any>(bridge().request('thread/fork', { threadId, excludeTurns: true, ...(lastTurnId ? { lastTurnId, deferGoalContinuation: true } : {}) })); }
export async function startTurn(params: { threadId: string; text: string; attachments?: string[]; planningMode?: 'default' | 'plan'; plugins?: { id: string; name: string }[]; cwd?: string; model?: string; modelProvider?: string; effort?: string }) { return unwrap<any>(bridge().request('turn/start', { threadId: params.threadId, ...(params.planningMode && params.model ? { collaborationMode: collaborationMode(params.planningMode, params.model, params.effort) } : {}), input: userInput(params.text, params.plugins, params.attachments), ...(params.cwd ? { cwd: params.cwd } : {}), ...(params.model ? { model: params.model } : {}), modelProvider: 'minimax', ...(params.effort ? { effort: params.effort } : {}) })); }
export async function interruptTurn(threadId: string, turnId: string) { return unwrap<any>(bridge().request('turn/interrupt', { threadId, turnId })); }
export async function steerTurn(threadId: string, expectedTurnId: string, text: string, plugins: { id: string; name: string }[] = [], attachments: string[] = []) {
  return unwrap<any>(bridge().request('turn/steer', { threadId, expectedTurnId, input: userInput(text, plugins, attachments) }));
}
export async function listThreads(cursor?: string) { return unwrap<any>(bridge().request('thread/list', { limit: 100, sortKey: 'recencyAt', sortDirection: 'desc', ...(cursor ? { cursor } : {}) })); }
export function subscribeCodex(handlers: { notification?: (message: RpcMessage) => void; serverRequest?: (message: RpcMessage) => void; error?: (message: any) => void; stderr?: (message: any) => void; closed?: (message: any) => void }) { const cleanups = [handlers.notification && bridge()?.onNotification(handlers.notification), handlers.serverRequest && bridge()?.onServerRequest(handlers.serverRequest), handlers.error && bridge()?.onError(handlers.error), handlers.stderr && bridge()?.onStderr(handlers.stderr), handlers.closed && bridge()?.onClosed(handlers.closed)].filter(Boolean) as Array<() => void>; return () => cleanups.forEach(cleanup => cleanup()); }
