import type { ThreadStartOptions } from './threadStart';
import { parseBackgroundTerminalPage, parseTermination } from './backgroundTerminalResponse';
import { collaborationMode } from './planning';
import { userInput } from './attachments';
import { readThreadGoalClearResponse, readThreadGoalResponse, validateThreadGoalInput } from './threadGoal';
import { readReviewStartResponse, readReviewTarget } from './review';
import { readThreadRevertResponse } from './threadRevert';
import { validateThreadMemoryInput } from './threadMemory';
import { readRateLimits } from './rateLimits';
import { readAccountUsage } from './accountUsage';
import { readAccountInfo } from './accountInfo';
import { readThreadSection, readThreadSections, type ThreadSectionAppearance } from './threadSections';
import { readAccountLoginStart } from './accountAuth';
import { readServerDiagnostics } from './serverDiagnostics';
import { readFeedbackUpload, validateFeedbackInput, type FeedbackInput } from './feedback';
import { readThreadSearchOccurrences, type ThreadSearchOccurrence } from './threadSearchOccurrences';
import { createRemoteProjectParams, deleteRemoteProjectParams, moveRemoteProjectParams, readRemoteProject, readRemoteProjectPage, updateRemoteProjectParams, type RemoteProject } from './remoteProjects';
import { updateThreadGitParams, updateThreadProjectParams } from './threadMetadata';
import { readRemoteControlClients as readRemoteControlClientPage, readRemoteControlPairing, readRemoteControlStatus, remoteControlId, type RemoteControlClient, type RemoteControlPairing, type RemoteControlStatus } from './remoteControl';
import { readThreadTimelinePage, type TimelineEntry } from './threadTimeline';
import { environmentAddParams, readEnvironmentInfo as parseEnvironmentInfo, readEnvironmentStatus as parseEnvironmentStatus, type EnvironmentInfo, type EnvironmentStatus } from './environment';
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
export async function startThread(params: ThreadStartOptions) { const { permission, providerId, projectId, effort, ...rest } = params; const autoReview = permission === 'workspace-write'; return unwrap<any>(bridge().request('thread/start', { ...rest, ...(effort && effort !== 'default' ? { effort } : {}), ...(providerId ? { providerId } : {}), ...(projectId?.trim() ? { projectId: projectId.trim() } : {}), modelProvider: 'minimax', approvalPolicy: permission === 'danger-full-access' ? 'never' : 'on-request', ...(permission === 'danger-full-access' ? { sandbox: 'danger-full-access' } : { sandbox: permission === 'workspace-write' ? 'workspace-write' : 'read-only' }), ...(autoReview ? { approvalsReviewer: 'auto_review' } : {}), personality: 'friendly' })); }
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
export async function setThreadName(threadId: string, name: string) { return unwrap<any>(bridge().request('thread/name/set', { threadId, name })); }
export async function getThreadGoal(threadId: string) {
  const result = await unwrap<any>(bridge().request('thread/goal/get', { threadId }));
  return readThreadGoalResponse(result, threadId);
}
export async function setThreadGoal(threadId: string, input: { objective?: string; status?: string; tokenBudget?: number | null }) {
  const params = validateThreadGoalInput(threadId, input);
  const result = await unwrap<any>(bridge().request('thread/goal/set', params));
  return readThreadGoalResponse(result, threadId);
}
export async function clearThreadGoal(threadId: string) {
  const result = await unwrap<any>(bridge().request('thread/goal/clear', { threadId }));
  return readThreadGoalClearResponse(result);
}
export async function startReview(threadId: string, target: unknown) {
  const result = await unwrap<any>(bridge().request('review/start', { threadId, target: readReviewTarget(target) }));
  return readReviewStartResponse(result, threadId);
}
export const startUncommittedReview = (threadId: string) => startReview(threadId, { type: 'uncommittedChanges' });
export async function revertThread(threadId: string, beforeTurnId: string) {
  const result = await unwrap<any>(bridge().request('thread/revert', { threadId, beforeTurnId }));
  return readThreadRevertResponse(result, threadId);
}
export async function setThreadMemoryMode(threadId: string, mode: 'enabled' | 'disabled') {
  const validMode = validateThreadMemoryInput(threadId, mode);
  return unwrap<any>(bridge().request('thread/memoryMode/set', { threadId, mode: validMode }));
}
export async function resetMemory() { return unwrap<any>(bridge().request('memory/reset', {})); }
export async function readAccountRateLimits() { return readRateLimits(await unwrap<any>(bridge().request('account/rateLimits/read', {}))); }
export async function readAccountTokenUsage() { return readAccountUsage(await unwrap<any>(bridge().request('account/tokenUsage/read', {}))); }
export async function readAccount() { return readAccountInfo(await unwrap<any>(bridge().request('account/read', { refreshToken: false }))); }
export async function readServerDiagnosticsInfo() { return readServerDiagnostics(await unwrap<unknown>(bridge().request('server/diagnostics', {}))); }
export async function readEnvironmentInfo(environmentId: string): Promise<EnvironmentInfo> { if (!/^\S+$/.test(environmentId)) throw new Error('环境 ID 无效'); return parseEnvironmentInfo(await unwrap<unknown>(bridge().request('environment/info', { environmentId }))); }
export async function readEnvironmentStatus(environmentId: string): Promise<EnvironmentStatus> { if (!/^\S+$/.test(environmentId)) throw new Error('环境 ID 无效'); return parseEnvironmentStatus(await unwrap<unknown>(bridge().request('environment/status', { environmentId }))); }
export async function addEnvironment(environmentId: string, execServerUrl: string, connectTimeoutMs?: number) { await unwrap(bridge().request('environment/add', environmentAddParams(environmentId, execServerUrl, connectTimeoutMs))); }
export async function uploadFeedback(input: FeedbackInput) { const params = validateFeedbackInput(input); return readFeedbackUpload(await unwrap<unknown>(bridge().request('feedback/upload', params))); }
export async function searchThreadOccurrences(threadId: string, searchTerm: string, signal?: AbortSignal): Promise<ThreadSearchOccurrence[]> {
  if (!/^\S+$/.test(threadId) || !searchTerm.trim()) throw new Error('会话搜索参数无效');
  const data: ThreadSearchOccurrence[] = []; const seen = new Set<string>(); let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    signal?.throwIfAborted();
    const result = readThreadSearchOccurrences(await unwrap<unknown>(bridge().request('thread/searchOccurrences', { threadId, searchTerm: searchTerm.trim(), limit: 100, ...(cursor ? { cursor } : {}) })));
    signal?.throwIfAborted();
    data.push(...result.data); if (!result.nextCursor) return data;
    if (seen.has(result.nextCursor)) throw new Error('会话完整搜索分页重复，请重试');
    seen.add(result.nextCursor); cursor = result.nextCursor;
  }
  throw new Error('会话完整搜索页数过多，请缩小搜索范围');
}
export async function listRemoteProjects(sortKey: 'position' | 'recencyAt' = 'recencyAt', sortDirection: 'asc' | 'desc' = 'desc'): Promise<RemoteProject[]> {
  const projects: RemoteProject[] = []; const seen = new Set<string>(); let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    const result = readRemoteProjectPage(await unwrap<unknown>(bridge().request('project/list', { limit: 100, sortKey, sortDirection, ...(cursor ? { cursor } : {}) })));
    projects.push(...result.data); if (!result.nextCursor) return projects;
    if (seen.has(result.nextCursor)) throw new Error('远端项目分页重复，请重试');
    seen.add(result.nextCursor); cursor = result.nextCursor;
  }
  throw new Error('远端项目页数过多');
}
export async function createRemoteProject(name: string, roots: string[], metadata: Record<string, string> = {}) {
  const result = await unwrap<any>(bridge().request('project/create', createRemoteProjectParams(name, roots, metadata, crypto.randomUUID())));
  return readRemoteProject(result?.project);
}
export async function updateRemoteProject(project: { id: string }, name: string, roots: string[], metadata: Record<string, string>) {
  const result = await unwrap<any>(bridge().request('project/update', updateRemoteProjectParams(project.id, name, roots, metadata)));
  return readRemoteProject(result?.project);
}
export async function deleteRemoteProject(id: string) { await unwrap<any>(bridge().request('project/delete', deleteRemoteProjectParams(id))); }
export async function moveRemoteProject(id: string, beforeId?: string) { await unwrap<any>(bridge().request('project/move', moveRemoteProjectParams(id, beforeId))); }
export async function updateThreadProject(threadId: string, projectId: string | null) { return unwrap<any>(bridge().request('thread/metadata/update', updateThreadProjectParams(threadId, projectId))); }
export async function updateThreadGitInfo(threadId: string, gitInfo: { sha?: string | null; branch?: string | null; originUrl?: string | null }) { return unwrap<any>(bridge().request('thread/metadata/update', updateThreadGitParams(threadId, gitInfo))); }
export async function listThreadTimeline(threadId: string): Promise<TimelineEntry[]> {
  if (!/^\S+$/.test(threadId)) throw new Error('会话时间线身份无效');
  const data: TimelineEntry[] = []; let cursor: string | undefined; const seen = new Set<string>();
  for (let page = 0; page < 100; page++) {
    const result = readThreadTimelinePage(await unwrap<unknown>(bridge().request('thread/timeline/list', { threadId, limit: 100, ...(cursor ? { cursor } : {}) })));
    data.push(...result.data); if (!result.nextCursor) return data; if (seen.has(result.nextCursor)) throw new Error('会话时间线分页重复，请重试'); seen.add(result.nextCursor); cursor = result.nextCursor;
  }
  throw new Error('会话时间线页数过多');
}
export async function readRemoteControlStatusInfo(): Promise<RemoteControlStatus> { return readRemoteControlStatus(await unwrap<unknown>(bridge().request('remoteControl/status/read', {}))); }
export async function enableRemoteControl(ephemeral = false): Promise<RemoteControlStatus> { return readRemoteControlStatus(await unwrap<unknown>(bridge().request('remoteControl/enable', { ephemeral }))); }
export async function disableRemoteControl(ephemeral = false): Promise<RemoteControlStatus> { return readRemoteControlStatus(await unwrap<unknown>(bridge().request('remoteControl/disable', { ephemeral }))); }
export async function startRemoteControlPairing(manualCode = false): Promise<RemoteControlPairing> { return readRemoteControlPairing(await unwrap<unknown>(bridge().request('remoteControl/pairing/start', { manualCode }))); }
export async function readRemoteControlClients(environmentId: string): Promise<RemoteControlClient[]> {
  const data: RemoteControlClient[] = []; let cursor: string | undefined; const seen = new Set<string>();
  for (let page = 0; page < 100; page++) {
    const result = readRemoteControlClientPage(await unwrap<unknown>(bridge().request('remoteControl/client/list', { environmentId: remoteControlId(environmentId), limit: 100, order: 'desc', ...(cursor ? { cursor } : {}) })));
    data.push(...result.data); if (!result.nextCursor) return data; if (seen.has(result.nextCursor)) throw new Error('远程控制设备分页重复，请重试'); seen.add(result.nextCursor); cursor = result.nextCursor;
  }
  throw new Error('远程控制设备页数过多');
}
export async function revokeRemoteControlClient(environmentId: string, clientId: string) { await unwrap<any>(bridge().request('remoteControl/client/revoke', { environmentId: remoteControlId(environmentId), clientId: remoteControlId(clientId, '远程控制设备身份') })); }
export async function startAccountLogin(kind: 'chatgpt' | 'chatgptDeviceCode' | 'apiKey', apiKey?: string) {
  const params = kind === 'apiKey' ? { type: 'apiKey', apiKey: apiKey || '' } : kind === 'chatgptDeviceCode' ? { type: 'chatgptDeviceCode' } : { type: 'chatgpt', codexStreamlinedLogin: true, useHostedLoginSuccessPage: false };
  if (kind === 'apiKey' && !apiKey?.trim()) throw new Error('API Key 不能为空');
  return readAccountLoginStart(await unwrap<any>(bridge().request('account/login/start', params)));
}
export async function cancelAccountLogin(loginId: string) { if (!/^\S+$/.test(loginId)) throw new Error('登录身份无效'); await unwrap<any>(bridge().request('account/login/cancel', { loginId })); }
export async function logoutAccount() { await unwrap<any>(bridge().request('account/logout', undefined)); }
export async function listThreadSections() { return readThreadSections(await unwrap<any>(bridge().request('threadSection/list', { limit: 100 }))); }
export async function createThreadSection(name: string, sectionAppearance?: ThreadSectionAppearance) { if (!name.trim()) throw new Error('分组名称不能为空'); return readThreadSection(await unwrap<any>(bridge().request('threadSection/create', { name: name.trim(), ...(sectionAppearance ? { appearance: sectionAppearance } : {}) }))); }
export async function updateThreadSection(sectionId: string, name: string, sectionAppearance?: ThreadSectionAppearance) { if (!/^\S+$/.test(sectionId) || !name.trim()) throw new Error('分组更新参数无效'); return readThreadSection(await unwrap<any>(bridge().request('threadSection/update', { sectionId, name: name.trim(), ...(sectionAppearance ? { appearance: sectionAppearance } : {}) }))); }
export async function deleteThreadSection(sectionId: string) { if (!/^\S+$/.test(sectionId)) throw new Error('分组身份无效'); await unwrap<any>(bridge().request('threadSection/delete', { sectionId })); }
export async function moveThreadSection(threadId: string, sectionId: string | null) { if (!/^\S+$/.test(threadId) || sectionId != null && !/^\S+$/.test(sectionId)) throw new Error('分组移动参数无效'); await unwrap<any>(bridge().request('thread/section/move', { threadId, sectionId })); }
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
