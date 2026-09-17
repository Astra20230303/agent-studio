import { ArtifactPreview } from './ArtifactPreview';
import { ArtifactWorkspaceContext, ArtifactOpenContext, type ArtifactTarget } from './Artifacts';
import { UserInputDialog } from './UserInputDialog';
import { useTurnRuntime } from './useTurnRuntime';
import { useSkillDraft, type SelectedSkill } from './useSkillDraft';
import { useThreadDraft } from './useThreadDraft';
import { checkWindowsSandbox, invalidateWindowsSandbox, sandboxSnapshot, subscribeSandbox } from './windowsSandbox';
import { WindowsSandboxSettings } from './WindowsSandboxSettings';
import { PermissionSettings, permissionOptions } from './PermissionSettings';
import { ConversationFind } from './ConversationFind';
import { MarkdownMessage } from './MarkdownMessage';
import { NotificationSettings } from './NotificationSettings';
import { useTheme } from './useTheme';
import { selectNotifiedThread } from './notificationNavigation';
import { ConversationExport } from './ConversationExport';
import { SettingsNavigation } from './SettingsNavigation';
import { readThreadPermissions, permissionSummary } from './threadPermissions';
import { KeyboardSettings } from './KeyboardSettings';
import { ContextUsage, readContextTokens } from './ContextUsage';
import { useThreadList } from './useThreadList';
import { ArchivedThreads } from './ArchivedThreads';
import { useTurnQueue } from './useTurnQueue';
import { TurnQueue } from './TurnQueuePanel';
import { PlanPanel } from './PlanPanel';
import { workspaceFor } from './workspace';
import { useAttachmentDraft } from './useAttachmentDraft';
import { WorkspaceFiles, type FileEditSession, type FilePreviewUpdate } from './WorkspaceFiles';
import { FileEditor } from './FileEditor';
import { GitPanel } from './GitPanel';
import { ApprovalPrompt } from './ApprovalPrompt';
import { LazyMcpForm as McpForm } from './LazyMcpForm';
import { McpUrl } from './McpUrl';
import { readPlan } from './planning';
import { createConnectionRecovery } from './connectionRecovery';
import './connection.css';
import { steerTurn } from './codexClient';
import type { UserAnswers } from './UserInputDialog';
import { RemoteDesktopPanel } from './RemoteDesktopPanel';
import { RemoteBrowser } from './RemoteBrowser';
import { Globe } from 'lucide-react';
import { StrictMode, Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { appendMessage, automaticThreadTitle, createThread, ensureThreadTitle, loadState, saveState } from './store';
import type { DesktopState } from './domain';
import { failureMessage, recordTurnFailure } from './turnFailure';
import { EffortPicker } from './EffortPicker';
import { ModelPicker, useModelCatalog } from './ModelPicker';
import { applyToolEvent, finishTools, restoreMessages } from './toolActivity';
import { ToolActivityGroup, groupMessages } from './ToolActivityView';
import { MessageActions } from './ReplyActions';
import { branchSnapshot, isFinalReply } from './messageActions';
import { listAllThreadItems, updateThreadPermission, archiveThread, connectCodex, deleteThread, forkThread, interruptTurn, listThreadItems, listThreadTurns, resumeThread, setThreadName, startThread, startTurn, subscribeCodex } from './codexClient';
import { ExtensionsPage, ExtensionIcon } from './ExtensionsPage';
import { ThreadButton } from './ThreadButton';
import { ModePicker } from './ModePicker';
import { ArrowLeft, ArrowRight, ArrowUp, Badge, Bug, Clock3, FolderOpen, GitBranch, Hammer, Laptop, PanelLeft, Plus, Puzzle, RefreshCcw, Search, ShieldAlert, Square, SquarePen, Terminal, Telescope, Trash2, X } from 'lucide-react';
import { useNavigationHistory } from './useNavigationHistory';
import type { Page } from './useNavigationHistory';
import './styles.css';
import './sidebar.css';
import './chat.css';
import { ScheduledPage } from './ScheduledPage';
import './scheduled.css';
import { WindowFrame } from './WindowFrame';
import { WindowControls } from './WindowControls';
import { ComposerPlugins } from './ComposerPlugins';
import { extensionName } from './extensions';
import type { Plugin } from './extensions';
import type { WindowFrameBridge } from './WindowFrame';

const TerminalPanel = lazy(() => import('./TerminalPanel').then(module => ({ default: module.TerminalPanel })));

function projectLabel(pathOrName?: string) {
  return pathOrName?.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || pathOrName;
}

function App() {
  const [state, setState] = useState<DesktopState>(() => { const loaded = loadState(); loaded.model = modelId(loaded.model); return loaded; });
  const effectiveTheme = useTheme(state.theme);
  const [stateSaveFailed, setStateSaveFailed] = useState(false);
  const [stateSaveAttempt, setStateSaveAttempt] = useState(0);
  const [input, setInput, draftStorage] = useThreadDraft(state.activeThreadId);
  const [composerSkills, setComposerSkills, skillSaveFailed] = useSkillDraft(state.activeThreadId);
  const [composerPlugins, setComposerPlugins] = useState<Plugin[]>([]);
  const [page, setPage] = useState<Page>('chat');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  useEffect(() => {
    const desktop = window.desktop as typeof window.desktop & { onOpenConversation?: (listener: (threadId: string) => void) => () => void };
    return desktop?.onOpenConversation?.(threadId => {
      if (typeof threadId !== 'string' || !threadId.trim()) return;
      setState(previous => { const next = structuredClone(previous); selectNotifiedThread(next, threadId); return next; });
      setComposerPlugins([]); setPage('chat'); setSidebarVisible(true);
    });
  }, []);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [artifactTarget, setArtifactTarget] = useState<ArtifactTarget>();
  const [fileEdit, setFileEdit] = useState<FileEditSession>();
  const [filePreviewUpdate, setFilePreviewUpdate] = useState<FilePreviewUpdate>();
  const [gitOpen, setGitOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalStarted, setTerminalStarted] = useState(false);
  useEffect(() => {
    const desktop = window.desktop as typeof window.desktop & { onRemoteOpen?: (listener: () => void) => () => void };
    return desktop?.onRemoteOpen?.(() => setBrowserOpen(true));
  }, []);
  const navigation = useNavigationHistory(
    { page, threadId: page === 'chat' ? state.activeThreadId : undefined },
    location => !location.threadId || state.threads.some(thread => thread.id === location.threadId && !thread.archived),
  );
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [archivesOpen, setArchivesOpen] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [attachments, setAttachments, attachmentStorage] = useAttachmentDraft(state.activeThreadId);
  const [notice, setNotice] = useState('');
  const [codexStatus, setCodexStatus] = useState<'connecting' | 'connected' | 'offline' | 'error'>('connecting');
  const threadList = useThreadList(codexStatus === 'connected', setState, search);
  const reconnectRef = useRef<() => void>(() => {});
  const stopRecoveryRef = useRef<() => void>(() => {});
  const restartingRef = useRef(false);
  const [restarting, setRestarting] = useState(false);
  const sandboxState = useSyncExternalStore(subscribeSandbox, sandboxSnapshot);
  const [connectionError, setConnectionError] = useState('');
  const [remoteThreadId, setRemoteThreadId] = useState<string>();
  const runtime = useTurnRuntime();
  const queue = useTurnQueue();
  const [pendingThreads, setPendingThreads] = useState<string[]>([]);
  const [restoringThread, setRestoringThread] = useState<string>();
  const [approvals, setApprovals] = useState<any[]>([]);
  const approval = approvals[0];
  const [deleteCandidate, setDeleteCandidate] = useState<string>();
  const [providerStatus, setProviderStatus] = useState<any>();
  const catalog = useModelCatalog();
  const availableModels = catalog.models;
  useEffect(() => {
    if (!catalog.loading && availableModels.length) setState(current => availableModels.includes(current.model) ? current : { ...current, model: availableModels[0] });
  }, [availableModels, catalog.loading]);
  const activeThreadRef = useRef<string | undefined>(undefined);
  const sendingRef = useRef(new Set<string>());
  const forkingRef = useRef(false);
  activeThreadRef.current = state.activeThreadId;
  const active = state.threads.find(thread => thread.id === state.activeThreadId);
  const activeModel = active?.model || state.model;
  const activeEffort = active?.reasoningEffort || state.reasoningEffort;
  const runningTurnId = active?.remoteId ? runtime.threads[active.remoteId]?.turnId : undefined;
  const activity = active?.remoteId ? runtime.threads[active.remoteId]?.activity : undefined;
  const serviceInUse = pendingThreads.length > 0 || Boolean(restoringThread) || approvals.length > 0 || state.threads.some(thread => thread.status === 'running') || Object.values(runtime.threads).some(thread => Boolean(thread.turnId)) || sandboxState.busy;
  const restartService = async () => {
    if (restartingRef.current || serviceInUse || codexStatus === 'connecting') return;
    restartingRef.current = true; setRestarting(true); stopRecoveryRef.current(); queue.pause(); setConnectionError(''); setCodexStatus('connecting');
    try {
      const result = await window.codex?.stop?.();
      if (!result?.ok) throw Error(result?.error?.message || result?.error || '服务重启不可用');
    } catch (error) { setNotice(`重启服务失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { restartingRef.current = false; setRestarting(false); reconnectRef.current(); }
  };
  const pending = pendingThreads.includes(active?.id || '') || !!active?.remoteId && restoringThread === active.remoteId;
  const threads = useMemo(() => state.threads.filter(thread => !thread.archived && (thread.title.toLowerCase().includes(search.trim().toLowerCase()) || thread.messages.some(message => message.content.toLowerCase().includes(search.trim().toLowerCase())) || !!thread.remoteId && threadList.matchingIds.includes(thread.remoteId))).slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [state.threads, search, threadList.matchingIds]);
  useEffect(() => { setStateSaveFailed(!saveState(state)); }, [state, stateSaveAttempt]);
  useEffect(() => {
    window.desktop?.providerStatus?.().then((provider: any) => {
      setProviderStatus(provider);
      if (!provider?.keyConfigured && provider?.authRequired !== false) setNotice(failureMessage('MINIMAX_API_KEY'));
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    let disposed = false;
    const recovery = createConnectionRecovery({
      connect: connectCodex,
      status: (status, error) => { setCodexStatus(status); setConnectionError(error || ''); },
      connected: () => { if (window.desktop?.platform === 'win32') void checkWindowsSandbox(); },
    });
    reconnectRef.current = recovery.start; stopRecoveryRef.current = recovery.stop;
    const cleanup = subscribeCodex({
      notification: message => {
        const params = message.params || {};
        if (message.method === 'thread/settings/updated') {
          update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) thread.effectivePermissions = readThreadPermissions(params.threadSettings); });
        }
        if (message.method === 'thread/tokenUsage/updated') {
          const usage = readContextTokens(params.tokenUsage);
          if (usage) update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) thread.contextTokens = usage; });
        }
        if (message.method === 'serverRequest/resolved') {
          setApprovals(pending => pending.filter(item => item.id !== params.requestId));
        }
        if (message.method === 'turn/plan/updated') {
          const plan = readPlan(params);
          const current = runtime.read(params.threadId);
          if (current?.turnId && current.turnId !== params.turnId || current?.completed.includes(params.turnId)) return;
          if (plan) update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) thread.plan = plan; });
        }
        if (message.method === 'item/completed' && params.item?.type === 'plan') {
          update(next => {
            const thread = next.threads.find(item => item.remoteId === params.threadId);
            if (!thread) return;
            const id = `plan-${params.item.id}`;
            const saved = thread.messages.find(item => item.id === id);
            if (saved) saved.content = params.item.text;
            else thread.messages.push({ id, role: 'assistant', content: params.item.text, turnId: params.turnId, createdAt: new Date().toISOString() });
          });
        }
        if (message.method === 'turn/started' && params.threadId && params.turn?.id) {
          runtime.apply(params.threadId, { type: 'start', turnId: params.turn.id });
          update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) { thread.status = 'running'; if (thread.plan?.turnId !== params.turn.id) thread.plan = undefined; } });
        }
        if (message.method === 'item/agentMessage/delta' && params.delta) {
          runtime.apply(params.threadId, { type: 'activity', turnId: params.turnId });
          update(next => { const thread = next.threads.find(item => params.threadId ? item.remoteId === params.threadId : item.id === activeThreadRef.current); if (!thread) return; const last = thread.messages.find(message => message.id === `live-${params.itemId}`); if (last?.role === 'assistant') last.content += params.delta; else thread.messages.push({ id: `live-${params.itemId}`, role: 'assistant', turnId: params.turnId, content: params.delta, createdAt: new Date().toISOString() }); thread.status = 'running'; });
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
          queue.finish(params.threadId, params.turn?.id, params.turn?.status === 'completed');
          if (params.threadId && params.turn?.id) runtime.apply(params.threadId, { type: 'finish', turnId: params.turn.id, status: params.turn.status });
          update(next => {
            const thread = next.threads.find(item => params.threadId ? item.remoteId === params.threadId : item.id === activeThreadRef.current);
            if (!thread) return;
            finishTools(thread, params.turn?.id, params.turn?.status === 'failed');
            if (params.turn?.error || params.turn?.status === 'failed') {
              recordTurnFailure(thread, params.turn?.id, params.turn?.error);
              if (runtime.read(params.threadId)?.turnId) thread.status = 'running';
            }
            else thread.status = runtime.read(params.threadId)?.turnId ? 'running' : 'completed';
          });
        }
      },
      serverRequest: message => setApprovals(pending => pending.some(item => item.id === message.id) ? pending : [...pending, message]),
      error: error => { setCodexStatus('error'); setNotice(`Codex 通信错误：${error?.message || '未知错误'}`); },
      stderr: text => {
        for (const line of String(text || '').split('\n').filter(Boolean)) {
          try { const log = JSON.parse(line); if (log.level === 'ERROR') setNotice(failureMessage(log.fields?.message)); }
          catch { if (/MINIMAX_API_KEY/.test(line)) setNotice(failureMessage(line)); }
        }
      },
      closed: () => { invalidateWindowsSandbox(); queue.pause(); setApprovals([]); runtime.clear(); if (!restartingRef.current) recovery.disconnected(); }
    });
    recovery.start();
    return () => { disposed = true; recovery.stop(); cleanup(); reconnectRef.current = () => {}; stopRecoveryRef.current = () => {}; };
  }, []);
  const toast = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 1500); };
  const update = (fn: (next: DesktopState) => void) => setState(previous => { const next = structuredClone(previous); fn(next); return next; });
  const enqueue = () => {
    if ((!input.trim() && !attachments.length && !composerSkills.length) || !active?.remoteId || !runningTurnId) return;
    if (!queue.change(items => [...items, { id: crypto.randomUUID(), localId: active.id, threadId: active.remoteId!, text: input.trim(), attachments: [...attachments], skills: [...composerSkills], model: modelId(activeModel), effort: activeEffort, cwd: workspaceFor(state, active), planningMode: active.planningMode || 'default', plugins: composerPlugins.map(({ id, name }) => ({ id, name })), waitingOn: runningTurnId, status: 'waiting' }], true)) return;
    setInput(''); setAttachments([]); setComposerSkills([]); setComposerPlugins([]);
  };
  useEffect(() => {
    if (codexStatus !== 'connected') return;
    for (const item of queue.items) {
      const head = queue.read().find(entry => entry.threadId === item.threadId);
      if (head?.id !== item.id || head.status !== 'ready' || runtime.read(item.threadId)?.turnId || sendingRef.current.has(item.localId)) continue;
      const thread = state.threads.find(thread => thread.id === item.localId && !thread.archived);
      if (!thread) continue;
      if (!queue.change(items => items.map(entry => entry.id === item.id ? { ...entry, status: 'sending', error: undefined } : entry), true)) continue;
      sendingRef.current.add(item.localId);
      setPendingThreads(previous => [...previous, item.localId]);
      update(next => { const target = next.threads.find(thread => thread.id === item.localId); if (target) target.messages.push({ id: item.id, role: 'user', content: item.text, attachments: item.attachments, skills: item.skills, createdAt: new Date().toISOString() }); });
      void (async () => {
        try {
          const result = await startTurn({ threadId: item.threadId, text: item.text, attachments: item.attachments, skills: item.skills, model: item.model, effort: item.effort, plugins: item.plugins, planningMode: item.planningMode || 'default', cwd: item.cwd });
          const turn = result.turn;
          if (!turn?.id) throw new Error('服务未返回回合编号，请检查会话记录。');
          runtime.apply(item.threadId, { type: 'start', turnId: turn.id });
          if (turn.status && turn.status !== 'inProgress') runtime.apply(item.threadId, { type: 'finish', turnId: turn.id, status: turn.status });
          const outcome = runtime.read(item.threadId)?.outcomes?.[turn.id];
          queue.change(items => items.filter(entry => entry.id !== item.id).map(entry => entry.threadId === item.threadId && entry.status !== 'paused' ? { ...entry, waitingOn: turn.id, status: outcome ? outcome === 'completed' ? 'ready' : 'paused' : 'waiting', error: outcome && outcome !== 'completed' ? '上一轮未正常完成，请确认后继续。' : undefined } : entry));
          update(next => { const target = next.threads.find(thread => thread.id === item.localId); const message = target?.messages.find(message => message.id === item.id); if (message) message.turnId = turn.id; });
        } catch (error: any) {
          queue.change(items => items.map(entry => entry.threadId === item.threadId ? { ...entry, status: 'paused', error: `发送未确认：${error.message}。请检查会话记录后再试。` } : entry));
          update(next => { const target = next.threads.find(thread => thread.id === item.localId); if (target) target.messages = target.messages.filter(message => message.id !== item.id); });
        } finally {
          sendingRef.current.delete(item.localId);
          setPendingThreads(previous => previous.filter(id => id !== item.localId));
        }
      })();
    }
  }, [queue.items, codexStatus, runtime.threads, pendingThreads, state.threads]);
  const send = async () => {
    const text = input.trim(); if ((!text && !attachments.length && !composerSkills.length) || pending) return;
    if (catalog.loading || !availableModels.includes(activeModel)) { setNotice(catalog.error || '请等待模型列表加载并选择模型。'); setShowModel(true); return; }
    if (codexStatus !== 'connected') { setNotice('app-server 尚未连接，请稍后重试。'); return; }
    const existing = state.threads.find(item => item.id === state.activeThreadId);
    const lockId = existing?.id || 'new-thread';
    if (sendingRef.current.has(lockId)) return;
    sendingRef.current.add(lockId);
    let localId = existing?.id;
    const automaticTitle = automaticThreadTitle(existing, text);
    if (!existing) { const draft = structuredClone(state); const created = createThread(draft); localId = created.id; setAttachments(attachments, localId); setAttachments([]); setComposerSkills(composerSkills, localId); setComposerSkills([]); update(next => { next.threads.push(created); next.activeThreadId = created.id; }); }
    setPendingThreads(previous => [...previous, localId!]);
    const messageId = crypto.randomUUID();
    try {
      const provider = await window.desktop?.providerStatus?.();
      setProviderStatus(provider);
      if (!provider?.keyConfigured && provider?.authRequired !== false) throw new Error(failureMessage('MINIMAX_API_KEY'));
      const model = modelId(activeModel); const modelProvider = 'minimax';
      update(next => { const thread = next.threads.find(item => item.id === localId); if (thread) { thread.model = model; thread.reasoningEffort = activeEffort; } });
      const cwd = workspaceFor(state, existing) || (!existing?.remoteId ? await window.desktop?.getProjectRoot?.() : undefined);
      update(next => { const thread = next.threads.find(item => item.id === localId); if (thread && cwd) { thread.cwd = cwd; if (!thread.remoteId) thread.projectId = state.activeProjectId; } });
      let threadId = existing?.remoteId;
      const createRemoteThread = async () => {
        const started = await startThread({ effort: activeEffort, model, modelProvider, cwd, permission: state.permission });
        const id = started.thread?.id;
        if (!id) throw new Error('没有返回 thread id');
        update(next => { const thread = next.threads.find(item => item.id === localId); if (thread) { thread.remoteId = id; thread.effectivePermissions = readThreadPermissions(started); thread.requestedPermission = state.permission; } });
        return id;
      };
      if (!threadId) threadId = await createRemoteThread();
      if (!threadId) throw new Error('没有返回 thread id');
      if (automaticTitle) void setThreadName(threadId, automaticTitle).catch(() => toast('标题已保存在本地，远端同步失败。'));
      update(next => {
        const thread = next.threads.find(item => item.id === localId);
        if (!thread) return;
        thread.messages.push({ id: messageId, role: 'user', content: text, attachments: [...attachments], skills: [...composerSkills], createdAt: new Date().toISOString() });
        ensureThreadTitle(thread);
        thread.updatedAt = new Date().toISOString();
      });
      let turn;
      const plugins = composerPlugins.map(plugin => ({ id: plugin.id, name: plugin.name }));
      if (runningTurnId) {
        const result = await steerTurn(threadId, runningTurnId, text, plugins, attachments, composerSkills);
        turn = { turn: { id: result.turnId } };
      } else {
        turn = await startTurn({ threadId, text, attachments, skills: composerSkills, plugins, model, modelProvider, effort: activeEffort, cwd, planningMode: existing?.planningMode || 'default' });
      }
      if (turn.turn?.id) {
        runtime.apply(threadId, { type: 'start', turnId: turn.turn.id });
        if (turn.turn.status && turn.turn.status !== 'inProgress') runtime.apply(threadId, { type: 'finish', turnId: turn.turn.id, status: turn.turn.status });
      }
      update(next => {
        const thread = next.threads.find(item => item.id === localId);
        if (!thread) return;
        const message = thread.messages.find(item => item.id === messageId);
        if (message) message.turnId = turn.turn?.id;
        thread.status = runtime.read(threadId!)?.turnId ? 'running' : 'completed';
      });
      setInput(current => current === input ? '' : current);
      setAttachments(current => current.filter(path => !attachments.includes(path)), localId);
      setComposerSkills(current => current.filter(skill => !composerSkills.some(sent => sent.path === skill.path)), localId);
      if (activeThreadRef.current === localId) setComposerPlugins([]);
    } catch (error: any) {
      update(next => { const thread = next.threads.find(item => item.id === localId); if (thread) thread.messages = thread.messages.filter(item => item.id !== messageId); });
      setNotice(`${runningTurnId ? '追加指令失败' : '发送失败'}：${error.message || error}`);
    } finally {
      sendingRef.current.delete(lockId);
      setPendingThreads(previous => previous.filter(id => id !== localId));
    }
  };
  const changeThreadPermission = async (permission: DesktopState['permission']) => {
    const thread = active;
    if (!thread?.remoteId || pending || runningTurnId || codexStatus !== 'connected' || sendingRef.current.has(thread.id)) return;
    sendingRef.current.add(thread.id);
    setPendingThreads(previous => [...previous, thread.id]);
    update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) target.effectivePermissions = undefined; });
    try {
      const settings = await updateThreadPermission(thread.remoteId, permission);
      update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) { target.effectivePermissions = readThreadPermissions(settings); target.requestedPermission = permission; } });
    } catch (error: any) { setNotice(`修改权限失败：${error.message}`); }
    finally { sendingRef.current.delete(thread.id); setPendingThreads(previous => previous.filter(id => id !== thread.id)); }
  };
  const cancel = () => {
    queue.change(items => items.map(item => item.localId === active?.id ? { ...item, status: 'paused', error: '已停止，队列暂停。' } : item));
    if (active?.remoteId && runningTurnId) void interruptTurn(active.remoteId, runningTurnId).catch(error => setNotice(`停止失败：${error.message}`));
  };
  const newChat = () => { setRemoteThreadId(undefined); update(next => createThread(next)); setComposerPlugins([]); setPage('chat'); };
  const selectThread = async (thread: DesktopState['threads'][number]) => { update(next => { next.activeThreadId = thread.id; }); setComposerPlugins([]); setPage('chat'); };
  useEffect(() => {
    const threadId = active?.remoteId;
    if (!threadId || codexStatus !== 'connected' || pendingThreads.includes(active.id)) return;
    let disposed = false;
    const revision = runtime.read(threadId)?.revision || 0;
    setRestoringThread(threadId);
    update(next => { const thread = next.threads.find(item => item.remoteId === threadId); if (thread) thread.effectivePermissions = undefined; });
    void (async () => {
      try {
        const loaded = await resumeThread(threadId);
        if (disposed) return;
        const turns = loaded?.thread?.turns || [];
        const running = turns.find((turn: any) => turn.status === 'inProgress');
        // Only use a snapshot that predates no live turn events.
        if ((runtime.read(threadId)?.revision || 0) !== revision) return;
        runtime.apply(threadId, { type: 'restore', turnId: running?.id, revision });
        update(next => {
          const thread = next.threads.find(item => item.remoteId === threadId);
          if (!thread) return;
          thread.effectivePermissions = readThreadPermissions(loaded);
          if (!thread.model && typeof loaded.model === 'string' && loaded.model) thread.model = loaded.model;
          if (!thread.reasoningEffort && ['low', 'medium', 'high'].includes(loaded.reasoningEffort)) thread.reasoningEffort = loaded.reasoningEffort;
          if (loaded.thread?.cwd) thread.cwd = loaded.thread.cwd;
          const items = turns.flatMap((turn: any) => (turn.items || []).map((item: any) => ({ item, turnId: turn.id })));
          if (items.length) thread.messages = restoreMessages(items, thread.messages);
          thread.status = running ? 'running' : 'completed';
          ensureThreadTitle(thread);
        });
      } catch (error: any) { if (!disposed) setNotice(`恢复线程失败：${error.message}`); }
      finally { if (!disposed) setRestoringThread(current => current === threadId ? undefined : current); }
    })();
    return () => { disposed = true; };
  }, [active?.remoteId, codexStatus]);
  const respondApproval = async (decision: string, answers?: UserAnswers, content?: Record<string, unknown>) => {
    if (!approval) return;
    let result: any = { decision };
    if (approval.method === 'item/permissions/requestApproval') {
      result = decision === 'accept' ? { scope: 'turn', permissions: approval.params?.permissions || {} } : { scope: 'turn', permissions: {} };
    } else if (approval.method === 'item/tool/requestUserInput') {
      result = { answers: answers || Object.fromEntries((approval.params?.questions || []).map((question: any) => [question.id, { answers: [] }])) };
    } else if (approval.method === 'mcpServer/elicitation/request') {
      result = { action: decision === 'accept' ? 'accept' : decision === 'cancel' ? 'cancel' : 'decline', content: decision === 'accept' ? content ?? null : null };
    }
    if (!window.codex) throw new Error('app-server 尚未连接。');
    const response = await window.codex.respond(approval.id, result);
    if (!response?.ok) throw new Error(response?.error?.message || response?.error || '提交失败，请重试。');
    setApprovals(pending => pending.filter(item => item.id !== approval.id));
  };
  const loadFullHistory = async () => {
    const thread = active;
    if (!thread?.remoteId || codexStatus !== 'connected' || pending || runningTurnId || sendingRef.current.has(thread.id)) throw new Error('请等待会话空闲且连接成功后重试');
    const revision = runtime.read(thread.remoteId)?.revision || 0;
    sendingRef.current.add(thread.id);
    setPendingThreads(previous => [...previous, thread.id]);
    try {
      const items = await listAllThreadItems(thread.remoteId);
      if (activeThreadRef.current !== thread.id) throw new Error('已切换会话，未应用旧请求');
      if ((runtime.read(thread.remoteId)?.revision || 0) !== revision) throw new Error('会话已有新活动，请重新加载历史');
      update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) target.messages = restoreMessages(items, target.messages); });
    } finally { sendingRef.current.delete(thread.id); setPendingThreads(previous => previous.filter(id => id !== thread.id)); }
  };
  const renameActive = async () => { const thread = state.threads.find(item => item.id === state.activeThreadId); if (!thread) return; const name = window.prompt('重命名会话', thread.title)?.trim(); if (!name || name === thread.title) return; if (thread.remoteId && codexStatus === 'connected') { try { await setThreadName(thread.remoteId, name); } catch (error: any) { toast(`重命名失败：${error.message}`); return; } } update(next => { const item = next.threads.find(value => value.id === thread.id); if (item) { item.title = name; item.titleSource = 'manual'; } }); };
  const archiveActive = async () => { const thread = state.threads.find(item => item.id === state.activeThreadId); if (!thread) return; if (thread.remoteId && codexStatus === 'connected') { try { await archiveThread(thread.remoteId); } catch (error: any) { toast(`归档失败：${error.message}`); return; } } update(next => { const item = next.threads.find(value => value.id === thread.id); if (item) { item.archived = true; item.status = 'completed'; } }); setRemoteThreadId(undefined); };
  const performDelete = async (threadId: string) => { const thread = state.threads.find(item => item.id === threadId); if (!thread) return; if (thread.remoteId && codexStatus === 'connected') { try { await deleteThread(thread.remoteId); } catch (error: any) { toast(`删除失败：${error.message}`); return; } } update(next => { next.threads = next.threads.filter(value => value.id !== threadId); if (next.activeThreadId === threadId) next.activeThreadId = undefined; }); setRemoteThreadId(value => value === thread.remoteId ? undefined : value); };
  const deleteActive = async () => { const thread = state.threads.find(item => item.id === state.activeThreadId); if (thread) setDeleteCandidate(thread.id); };
  const togglePinned = (threadId: string) => update(next => { const thread = next.threads.find(item => item.id === threadId); if (thread) thread.pinned = !thread.pinned; });
  const archiveThreadFromSidebar = async (threadId: string) => { const thread = state.threads.find(item => item.id === threadId); if (!thread) return; if (thread.remoteId && codexStatus === 'connected') { try { await archiveThread(thread.remoteId); } catch (error: any) { toast(`归档失败：${error.message}`); return; } } update(next => { const item = next.threads.find(value => value.id === threadId); if (item) { item.archived = true; item.status = 'completed'; if (next.activeThreadId === threadId) next.activeThreadId = undefined; } }); setRemoteThreadId(value => value === thread.remoteId ? undefined : value); };
  const deleteThreadFromSidebar = async (threadId: string) => { if (state.threads.some(item => item.id === threadId)) setDeleteCandidate(threadId); };
  const forkActive = async () => { const thread = state.threads.find(item => item.id === state.activeThreadId); if (!thread?.remoteId || codexStatus !== 'connected') { toast('当前会话还没有远端线程'); return; } try { const result = await forkThread(thread.remoteId); const remote = result?.thread; if (!remote?.id) throw new Error('没有返回分叉线程'); const copy = { ...thread, id: `remote-${remote.id}`, remoteId: remote.id, effectivePermissions: readThreadPermissions(result), requestedPermission: undefined, title: `${thread.title} · 分支`, messages: structuredClone(thread.messages), updatedAt: new Date().toISOString() }; update(next => { next.threads.push(copy); next.activeThreadId = copy.id; }); setRemoteThreadId(remote.id); toast('已创建会话分支'); } catch (error: any) { toast(`分叉失败：${error.message}`); } };
  const forkFromMessage = async (messageId: string) => {
    const source = state.threads.find(thread => thread.id === state.activeThreadId);
    if (forkingRef.current) return;
    if (!source?.remoteId || codexStatus !== 'connected') throw new Error('会话尚未连接。');
    if (source.status === 'running' || runningTurnId) throw new Error('请等待本轮回复完成。');
    const message = source.messages.find(item => item.id === messageId);
    if (!message) throw new Error('找不到这条回复。');
    forkingRef.current = true;
    try {
      let turnId = message.turnId;
      if (!turnId) {
        let cursor: string | undefined;
        do {
          const result = await listThreadTurns(source.remoteId, cursor);
          const turn = (result.data || []).find((entry: any) => (entry.items || []).some((item: any) => `live-${item.id}` === messageId || item.id === messageId));
          if (turn) { turnId = turn.id; break; }
          cursor = result.nextCursor || undefined;
        } while (cursor);
      }
      if (!turnId) throw new Error('无法定位回复所在的回合，请重新加载该会话后重试。');
      const result = await forkThread(source.remoteId, turnId);
      if (!result.thread?.id) throw new Error('服务未返回分支会话。');
      const copy = branchSnapshot(source, messageId, result.thread.id);
      copy.effectivePermissions = readThreadPermissions(result); copy.requestedPermission = undefined;
      update(next => { next.threads.push(copy); next.activeThreadId = copy.id; });
      setRemoteThreadId(copy.remoteId); setPage('chat');
    } finally { forkingRef.current = false; }
  };
  const addAttachment = async () => {
    const picked = await window.desktop?.pickFiles?.();
    if (!picked?.length) return;
    setAttachments(current => [...new Set([...current, ...picked])]);
  };
  const navigateHistory = (direction: -1 | 1) => {
    const location = navigation.move(direction);
    if (!location) return;
    if (location.page === 'chat') {
      const thread = state.threads.find(item => item.id === location.threadId);
      if (thread) { void selectThread(thread); return; }
      update(next => { next.activeThreadId = undefined; });
      setRemoteThreadId(undefined);
    }
    setPage(location.page);
  };
  const openAgent = (id: string) => {
    update(next => {
      let target = next.threads.find(thread => thread.remoteId === id);
      if (!target) { target = { id: `remote-${id}`, remoteId: id, title: `Agent ${id}`, status: 'idle', pinned: false, archived: false, messages: [], updatedAt: new Date().toISOString() }; next.threads.push(target); }
      target.archived = false; next.activeThreadId = target.id;
    });
    setComposerPlugins([]); setPage('chat');
  };
  const serviceControl = <section className="settings-card" aria-label="工作区服务连接"><h2>工作区服务</h2><p role="status">服务连接：{codexStatus === 'connected' ? '已连接' : codexStatus === 'connecting' ? '连接中' : '未连接'}</p><p>配置变更后可重启服务并重新连接。{serviceInUse ? '请先等待运行中会话、审批和沙箱设置结束。' : '草稿保留，排队消息会暂停。'}</p><button disabled={serviceInUse || restarting || codexStatus === 'connecting'} onClick={() => void restartService()}>重启并重新连接服务</button></section>;
  return <div className={`desktop-app ${effectiveTheme} ${page === 'settings' ? 'settings-mode' : ''} ${terminalOpen ? 'terminal-visible' : ''}`}>
    {queue.saveFailed && <div role="alert" className="state-save-warning">排队消息未能保存，自动发送已暂停。关闭窗口可能丢失更改或恢复旧队列。<button onClick={queue.retry}>重试保存队列</button></div>}
    {attachmentStorage.saveFailed && <div role="alert" className="state-save-warning">附件选择未保存到本机，刷新后可能丢失选择或恢复旧附件。当前仍可编辑和发送。<button onClick={attachmentStorage.retry}>重试保存附件</button></div>}
    {stateSaveFailed && <div role="alert" className="state-save-warning">会话和设置未能保存到本机，刷新或关闭窗口可能丢失当前更改。<button onClick={() => setStateSaveAttempt(attempt => attempt + 1)}>重试保存会话和设置</button></div>}
    <header className="desktop-titlebar">
      <div className="titlebar-navigation">
        <button className="titlebar-icon" aria-label={sidebarVisible ? '收起侧栏' : '展开侧栏'} title={sidebarVisible ? '收起侧栏' : '展开侧栏'} aria-expanded={sidebarVisible} aria-controls="workspace-sidebar" onClick={() => setSidebarVisible(value => !value)}><PanelLeft aria-hidden="true" /></button>
        <button className="titlebar-icon" aria-label="后退" title="后退" disabled={!navigation.canGoBack} onClick={() => navigateHistory(-1)}><ArrowLeft aria-hidden="true" /></button>
        <button className="titlebar-icon" aria-label="前进" title="前进" disabled={!navigation.canGoForward} onClick={() => navigateHistory(1)}><ArrowRight aria-hidden="true" /></button>
      </div>
      <button aria-label="浏览工作区文件" aria-expanded={filesOpen} onClick={() => setFilesOpen(value => !value)}><FolderOpen size={17} /></button><button aria-label="查看 Git 变更" aria-expanded={gitOpen} onClick={() => { setGitOpen(value => !value); setFilesOpen(false); }}><GitBranch size={17} /></button><button aria-label="打开终端" title="终端" aria-expanded={terminalOpen} onClick={() => { if (!terminalStarted) { setTerminalStarted(true); } setTerminalOpen(value => !value); }}><Terminal size={17} /></button><nav aria-label="应用菜单"><button>文件</button><button>编辑</button><button>视图</button><button>帮助</button></nav><button className="remote-browser-toggle" aria-label="浏览器" title="浏览器" aria-expanded={browserOpen} aria-controls="remote-browser" onClick={() => setBrowserOpen(value => !value)}><Globe size={17} /></button><WindowControls />
    </header>
    {codexStatus !== 'connected' && <div className="connection-banner" role="status"><span>{codexStatus === 'connecting' ? '正在连接工作区…' : '工作区连接已断开，草稿已保留。'}{connectionError && ` ${connectionError}`}</span><button disabled={codexStatus === 'connecting'} onClick={() => reconnectRef.current()}>重新连接</button></div>}
    <div className="desktop-body"><aside id="workspace-sidebar" className="sidebar" aria-label="侧栏" hidden={!sidebarVisible}>
      <div className="brand-row"><ModePicker mode={state.mode} onChange={mode => update(next => { next.mode = mode; })} /><button className="sidebar-search-toggle" aria-label="搜索" title="搜索会话" aria-expanded={showSearch} aria-controls="sidebar-search" onClick={() => { setShowSearch(value => !value); setSearch(''); }}><Search aria-hidden="true" /></button></div>
      {showSearch && <input id="sidebar-search" autoFocus className="side-search" aria-label="搜索最近会话" placeholder="搜索会话标题或内容" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setShowSearch(false); setSearch(''); } }} />}
      <button className="sidebar-nav" onClick={newChat}><SquarePen aria-hidden="true" /><span>新对话</span></button>
      {showSearch && <small>搜索未归档会话；离线时仅匹配本机已加载内容。</small>}
      <button className="sidebar-nav" aria-current={page === 'scheduled' ? 'page' : undefined} onClick={() => setPage('scheduled')}><Clock3 aria-hidden="true" /><span>已安排</span></button>
      <button className="sidebar-nav" aria-current={page === 'plugins' ? 'page' : undefined} onClick={() => setPage('plugins')}><Puzzle aria-hidden="true" /><span>插件</span></button>
      <div className="sidebar-scroll">
        <section aria-labelledby="sidebar-projects"><h2 id="sidebar-projects" className="section">项目</h2>
          {state.activeProjectId ? <div className="sidebar-project" title={projectLabel(state.projects.find(project => project.id === state.activeProjectId)?.name ?? state.activeProjectId)}><FolderOpen aria-hidden="true" /><span>{projectLabel(state.projects.find(project => project.id === state.activeProjectId)?.name ?? state.activeProjectId)}</span></div> : <div className="empty">没有项目</div>}
        </section>
        <section aria-labelledby="sidebar-recent"><h2 id="sidebar-recent" className="section">最近</h2>
          {threads.map(thread => <div key={thread.id}><ThreadButton thread={thread} selected={page === 'chat' && state.activeThreadId === thread.id} onSelect={() => { void selectThread(thread); }} onTogglePin={() => togglePinned(thread.id)} onArchive={() => { void archiveThreadFromSidebar(thread.id); }} onDelete={() => { void deleteThreadFromSidebar(thread.id); }} />{search.trim() && thread.remoteId && threadList.snippets[thread.remoteId] && <p className="thread-search-snippet">{threadList.snippets[thread.remoteId].slice(0, 300)}</p>}</div>)}
          {threads.length === 0 && !threadList.loading && !threadList.error && <div className="empty">{search ? '没有匹配的会话' : '暂无会话'}</div>}
          {threadList.error && <p role="alert">{threadList.error}</p>}
          {(threadList.hasMore || threadList.error || threadList.loading) && <button disabled={threadList.loading || codexStatus !== 'connected'} onClick={() => void threadList.loadMore()}>{threadList.loading ? '正在加载会话…' : threadList.error ? '重试加载会话' : '加载更多会话'}</button>}
        </section>
      </div>
      <div className="sidebar-footer"><button onClick={() => setArchivesOpen(true)}>归档会话</button><button className="sidebar-nav" aria-current={page === 'settings' ? 'page' : undefined} onClick={() => setPage('settings')}><Badge aria-hidden="true" /><span>设置</span></button></div>
    </aside>
      <main>{skillSaveFailed && <p role="alert">技能选择未保存到本机，关闭窗口可能丢失。</p>}{draftStorage.saveFailed && <div role="alert">草稿未能保存到本机，刷新或关闭窗口可能丢失。当前仍可编辑和发送。<button onClick={draftStorage.retry}>重试保存草稿</button></div>}{page === 'chat' && <><div className="planning-controls"><label>协作模式 <select aria-label="协作模式" value={active?.planningMode || 'default'} disabled={Boolean(runningTurnId) || pending} onChange={event => { const mode = event.target.value as 'default' | 'plan'; update(next => { const thread = next.threads.find(item => item.id === next.activeThreadId) || createThread(next); thread.planningMode = mode; }); }}><option value="default">直接执行</option><option value="plan">先规划</option></select></label>{active?.planningMode === 'plan' && <span>先讨论方案，再切换执行</span>}{active?.planningMode === 'plan' && active.messages.some(message => message.id.startsWith('plan-')) && <button title={input.trim() ? '请先发送或清空当前草稿' : '准备执行计划的指令'} disabled={Boolean(runningTurnId) || pending || Boolean(input.trim())} onClick={() => { update(next => { const thread = next.threads.find(item => item.id === next.activeThreadId); if (thread) thread.planningMode = 'default'; }); setInput('请按照刚才确认的计划逐步实现，并验证结果。'); }}>按计划执行</button>}</div><PlanPanel plan={active?.plan} /></>}{page === 'chat' && <><TurnQueue onPause={() => { if (active) queue.pauseThread(active.id); }} onBeginEdit={id => { const item = queue.read().find(item => item.id === id); return !!item && item.status !== 'sending' && queue.change(items => items.map(item => item.id === id ? { ...item, status: 'paused', error: '编辑已暂停此消息，请继续队列。' } : item), true); }} onEdit={(id, text) => { const item = queue.read().find(item => item.id === id); return !!item && item.status === 'paused' && queue.change(items => items.map(item => item.id === id ? { ...item, text } : item), true); }} items={queue.items.filter(item => item.localId === active?.id)} disabled={codexStatus !== 'connected' || pending} onRemove={id => queue.change(items => items.filter(item => item.id !== id))} onResume={() => queue.change(items => items.map(item => item.localId === active?.id && item.status === 'paused' ? { ...item, status: runningTurnId ? 'waiting' : 'ready', waitingOn: runningTurnId, error: undefined } : item))} />{runningTurnId && <button className="queue-message" disabled={(!input.trim() && !attachments.length && !composerSkills.length) || pending || codexStatus !== 'connected'} onClick={enqueue}>本轮完成后发送</button>}</>}{!!active?.messages.length && page === 'chat' && <div className="thread-toolbar global-thread-toolbar"><span>{active.title}</span><div><ConversationExport thread={active} connected={codexStatus === 'connected'} busy={pending || Boolean(runningTurnId)} toast={toast} /><button onClick={renameActive}>重命名</button><button onClick={forkActive}>分叉</button><button onClick={archiveActive}>归档</button><button onClick={deleteActive}>删除</button></div></div>}{page === 'chat' ? <ArtifactOpenContext.Provider value={setArtifactTarget}><ArtifactWorkspaceContext.Provider value={workspaceFor(state, active)}><Chat loadFullHistory={loadFullHistory} onChangePermission={changeThreadPermission} sendShortcut={state.sendShortcut} composerSkills={composerSkills} setComposerSkills={setComposerSkills} onOpenAgent={openAgent} removeAttachment={path => setAttachments(current => current.filter(item => item !== path))} busy={pending} mode={state.mode} permission={state.permission} onOpenPlugins={() => setPage('plugins')} composerPlugins={composerPlugins} setComposerPlugins={setComposerPlugins} active={active} input={input} setInput={setInput} send={send} cancel={cancel} running={Boolean(runningTurnId)} activity={activity} model={activeModel} reasoningEffort={activeEffort} catalog={catalog} update={update} attachments={attachments} addAttachment={addAttachment} showModel={showModel} setShowModel={setShowModel} showProjects={showProjects} setShowProjects={setShowProjects} toast={toast} projectId={state.activeProjectId} projects={state.projects} status={codexStatus} onForkMessage={forkFromMessage} /></ArtifactWorkspaceContext.Provider></ArtifactOpenContext.Provider> : page === 'scheduled' ? <ScheduledPage cwd={workspaceFor(state, active)} models={availableModels} loadingModels={catalog.loading} refreshModels={catalog.refresh} /> : page === 'plugins' ? <ExtensionsPage onSelectSkill={skill => { setComposerSkills(current => current.some(item => item.path === skill.path) ? current : [...current, skill]); setPage('chat'); }} cwd={workspaceFor(state, active)} onAddToDraft={text => { setInput(current => current ? `${current}\n\n${text}` : text); setPage('chat'); }} connected={codexStatus === 'connected'} threadId={active?.remoteId} /> : <Workspace serviceControl={serviceControl} page={page} state={state} models={availableModels} update={update} toast={toast} providerStatus={providerStatus} onBack={() => { setPage('chat'); setSidebarVisible(true); }} />}</main>
      <RemoteBrowser open={browserOpen} onClose={() => setBrowserOpen(false)} />
      {terminalStarted && <Suspense fallback={null}><TerminalPanel cwd={workspaceFor(state, active)} open={terminalOpen} onClose={() => setTerminalOpen(false)} /></Suspense>}
      {gitOpen && <GitPanel onReview={text => { setInput(current => current ? `${current}\n\n${text}` : text); setPage('chat'); setGitOpen(false); }} key={workspaceFor(state, active) || 'none'} root={workspaceFor(state, active)} onClose={() => setGitOpen(false)} onWorktree={project => { update(next => { if (!next.projects.some(item => item.id === project.id)) next.projects.push(project); next.activeProjectId = project.id; const thread = createThread(next); thread.projectId = project.id; thread.cwd = project.path; }); setPage('chat'); setGitOpen(false); }} />}
      {filesOpen && <WorkspaceFiles onEdit={setFileEdit} previewUpdate={filePreviewUpdate} key={workspaceFor(state, active) || 'none'} root={workspaceFor(state, active)} onClose={() => setFilesOpen(false)} onAttach={path => setAttachments(current => [...new Set([...current, path])])} />}
    </div>{notice && <div className="toast">{notice}</div>}{approval && <ApprovalDialog request={approval} onDecision={respondApproval} />}{deleteCandidate && <DeleteDialog thread={state.threads.find(item => item.id === deleteCandidate)} onCancel={() => setDeleteCandidate(undefined)} onConfirm={() => { const id = deleteCandidate; setDeleteCandidate(undefined); void performDelete(id); }} />}
    {artifactTarget && <ArtifactPreview target={artifactTarget} onClose={() => setArtifactTarget(undefined)} onEdit={session => { setArtifactTarget(undefined); setFileEdit(session); }} />}
    {fileEdit && <FileEditor root={fileEdit.root} path={fileEdit.path} initial={fileEdit.initial} onClose={() => setFileEdit(undefined)} onSaved={preview => setFilePreviewUpdate({ root: fileEdit.root, path: fileEdit.path, preview })} />}
    {archivesOpen && <ArchivedThreads threads={state.threads} connected={codexStatus === 'connected'} onClose={() => setArchivesOpen(false)} onRestore={thread => update(next => { const existing = next.threads.find(item => item.id === thread.id || !!thread.remoteId && item.remoteId === thread.remoteId); if (existing) existing.archived = false; else next.threads.push({ ...thread, archived: false }); })} />}
  </div>;
}

function modelId(model: string) { return model.split(' · ')[0]; }


function DeleteDialog({ thread, onCancel, onConfirm }: { thread?: DesktopState['threads'][number]; onCancel: () => void; onConfirm: () => void }) {
  if (!thread) return null;
  return <div className="confirm-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
      <div className="confirm-icon" aria-hidden="true">!</div>
      <div className="confirm-copy"><h2 id="delete-dialog-title">删除会话？</h2><p id="delete-dialog-description">“{thread.title}”将被永久删除，此操作无法撤销。</p></div>
      <div className="confirm-actions"><button onClick={onCancel}>取消</button><button className="danger" onClick={onConfirm}>删除</button></div>
    </section>
  </div>;
}

function ApprovalDialog({ request, onDecision }: { request: any; onDecision: (decision: string, answers?: UserAnswers, content?: Record<string, unknown>) => Promise<void> }) {
  if (request.method === 'mcpServer/elicitation/request' && request.params?.mode === 'url') return <McpUrl key={request.id} request={request} onDecision={onDecision} />;
  if (request.method === 'mcpServer/elicitation/request') return <McpForm key={request.id} request={request} onSubmit={(action, content) => onDecision(action, undefined, content)} />;
  if (request.method === 'item/tool/requestUserInput') return <UserInputDialog key={request.id} request={request} onDecision={onDecision} />;
  if (['item/commandExecution/requestApproval', 'item/fileChange/requestApproval', 'item/permissions/requestApproval'].includes(request.method)) return <ApprovalPrompt key={request.id} request={request} onDecision={onDecision} />;
  const params = request.params || {};
  const isFile = request.method === 'item/fileChange/requestApproval';
  const isInput = request.method === 'item/tool/requestUserInput';
  const isPermission = request.method === 'item/permissions/requestApproval';
  const isMcp = request.method === 'mcpServer/elicitation/request';
  const title = isFile ? '确认文件变更' : isInput ? '需要补充信息' : isPermission ? '请求额外权限' : isMcp ? 'MCP 请求输入' : '需要你的确认';
  const reason = params.reason || params.message || (isFile ? 'Codex 请求应用文件修改。' : isInput ? '当前工具请求用户输入。' : isPermission ? 'Codex 请求额外的工作区权限。' : isMcp ? `服务器 ${params.serverName || ''} 请求输入。` : 'Codex 请求执行一项命令。');
  return <div className="approval-backdrop"><section className="approval-dialog"><h2>{title}</h2><p>{reason}</p>{params.command && <pre>{params.command}</pre>}{params.cwd && <small>{params.cwd}</small>}<div className="approval-actions"><button onClick={() => onDecision(isInput ? 'cancel' : 'decline')}>{isInput ? '取消' : '拒绝'}</button><button className="primary" onClick={() => onDecision('accept')}>{isInput ? '提交' : '允许'}</button></div></section></div>;
}

function Chat({ loadFullHistory, onChangePermission, sendShortcut, composerSkills, setComposerSkills, onOpenAgent, removeAttachment, busy, mode, permission, onOpenPlugins, composerPlugins, setComposerPlugins, onForkMessage, catalog, active, input, setInput, send, cancel, running, activity, model, reasoningEffort, update, attachments, addAttachment, showModel, setShowModel, showProjects, setShowProjects, toast, projectId, projects, status }: { loadFullHistory: () => Promise<void>; onChangePermission: (permission: DesktopState['permission']) => Promise<void>; sendShortcut?: 'enter' | 'mod-enter'; composerSkills: SelectedSkill[]; setComposerSkills: (skills: SelectedSkill[]) => void; onOpenAgent: (id: string) => void; removeAttachment: (path: string) => void; busy: boolean; mode: DesktopState['mode']; permission: DesktopState['permission']; onOpenPlugins: () => void; composerPlugins: Plugin[]; setComposerPlugins: (plugins: Plugin[]) => void; onForkMessage: (messageId: string) => Promise<void>; catalog: ReturnType<typeof useModelCatalog>; active: DesktopState['threads'][number] | undefined; input: string; setInput: (value: string) => void; send: () => void; cancel: () => void; running: boolean; activity?: string; model: string; reasoningEffort: DesktopState['reasoningEffort']; update: (fn: (next: DesktopState) => void) => void; attachments: string[]; addAttachment: () => void; showModel: boolean; setShowModel: (value: boolean) => void; showProjects: boolean; setShowProjects: (value: boolean) => void; toast: (text: string) => void; projectId?: string; projects: DesktopState['projects']; status: string }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const threadView = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const [findReset, setFindReset] = useState(0);
  const searchingConversation = useRef(false);
  const composing = useRef(false);
  const canSend = Boolean(input.trim() || attachments.length || composerSkills.length) && !busy && status === 'connected' && !catalog.loading && catalog.models.includes(model);
  const [workingDirectory, setWorkingDirectory] = useState<string>();
  const [permissionOpen, setPermissionOpen] = useState(false);

  useEffect(() => {
    let disposed = false;
    window.desktop?.getProjectRoot?.().then(root => {
      if (!disposed) setWorkingDirectory(root);
    }).catch(() => undefined);
    return () => { disposed = true; };
  }, []);
  const project = projects.find(item => item.id === (active?.projectId || (!active?.remoteId ? projectId : undefined)) || !!active?.cwd && item.path === active.cwd);
  const projectPath = active?.cwd || project?.path || (!active?.remoteId ? workingDirectory : undefined);
  const projectName = projectLabel(projectPath || project?.name) || (active?.remoteId ? '会话工作区' : undefined);
  const workMode = mode === 'work';
  const empty = !active?.messages.length;
  const messageRevision = active?.messages.map(message => `${message.id}:${message.content.length}:${message.role}`).join('|') || '';
  useEffect(() => {
    const element = threadView.current;
    setAwayFromLatest(false);
    if (!element) return;
    followLatest.current = true;
    element.scrollTop = element.scrollHeight;
    const updateFollowState = () => {
      followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
      setAwayFromLatest(!followLatest.current);
    };
    element.addEventListener('scroll', updateFollowState, { passive: true });
    updateFollowState();
    return () => element.removeEventListener('scroll', updateFollowState);
  }, [active?.id, empty]);
  useLayoutEffect(() => {
    const element = threadView.current;
    if (!element || !messageRevision && !activity) return;
    if (followLatest.current && !searchingConversation.current) element.scrollTo({ top: element.scrollHeight, behavior: 'auto' });
  }, [messageRevision, activity]);
  const suggestions = [
    { text: '探索并理解代码', icon: Telescope, color: 'explore' },
    { text: '构建新功能、应用或工具', icon: Hammer, color: 'build' },
    { text: '审查代码并提出修改建议', icon: RefreshCcw, color: 'review' },
    { text: '修复问题和失败', icon: Bug, color: 'fix' },
  ];
  return <div className={`chat-layout${workMode ? ' work-mode' : ''}${workMode && empty ? ' work-new-chat' : ''}`}>{active && <ConversationFind reset={findReset} key={active.id} messages={active.messages} view={threadView} searching={searchingConversation} loadHistory={active.remoteId && status === 'connected' ? loadFullHistory : undefined} disabled={busy || running} />}{active?.messages.length ? <div className="thread-view" ref={threadView}>{groupMessages(active.messages).map(group => {
    const message = group[0];
    return message.tool ? <ToolActivityGroup key={message.id} messages={group} onOpenAgent={onOpenAgent} /> : <div className={`message ${message.role}`} key={message.id} data-message-id={message.id}>{message.role === 'assistant' ? <><MarkdownMessage content={message.content} />{isFinalReply(active.messages, active.messages.indexOf(message)) && <MessageActions content={message.content} disabled={running || active.status === 'running' || status !== 'connected' || !active.remoteId} onFork={() => onForkMessage(message.id)} onError={toast} />}</> : <div className="user-text">{message.content}{message.skills?.map(skill => <div key={skill.path} className="message-attachment" title={skill.path}>${skill.name}</div>)}{message.attachments?.map(path => <div key={path} className="message-attachment" title={path}>📎 {path.replace(/^.*[\\/]/, '')}</div>)}</div>}</div>;
  })}{activity && <div className={`activity${activity === '正在思考…' ? ' thinking' : ''}`}>{activity}</div>}</div> : !workMode && <div className="welcome">
    <div className="welcome-content">
      <div className="welcome-mark" role="img" aria-label="Felix" title="Felix" tabIndex={0}><Badge className="welcome-badge" aria-hidden="true" /><Terminal className="welcome-terminal" aria-hidden="true" /></div>
      <h1>{projectName ? <>你想让我们在 <span title={projectPath}>{projectName}</span> 中构建什么？</> : '你想让我们构建什么？'}</h1>
      <div className="cards">{suggestions.map(({ text, icon: Icon, color }) => <button key={text} onClick={() => { setInput(text); textarea.current?.focus(); }}><Icon className={`suggestion-icon ${color}`} aria-hidden="true" /><span>{text}</span></button>)}</div>
    </div>
  </div>}
  <div className="composer-dock">
    {awayFromLatest && <button className="jump-to-latest" onClick={() => { setFindReset(value => value + 1); searchingConversation.current = false; followLatest.current = true; threadView.current?.scrollTo({ top: threadView.current.scrollHeight, behavior: 'auto' }); setAwayFromLatest(false); requestAnimationFrame(() => { threadView.current?.scrollTo({ top: threadView.current.scrollHeight, behavior: 'auto' }); followLatest.current = true; }); }}>↓ 回到最新消息</button>}
    {workMode && empty && <h1 className="work-welcome-heading">我们要做什么？</h1>}
    <div className="project-strip">
      <button className="project" aria-expanded={showProjects} title={projectPath || projectName || '选择项目'} onClick={() => setShowProjects(!showProjects)}><FolderOpen aria-hidden="true" /><span>{projectName || '选择项目'}</span></button>
      {workMode ? <><ComposerPlugins connected={status === 'connected'} onBrowse={onOpenPlugins} onSelect={plugin => {
        if (!composerPlugins.some(item => item.id === plugin.id)) setComposerPlugins([...composerPlugins, plugin]);
        textarea.current?.focus();
      }} /><span className="work-environment" title={project?.environment === 'worktree' ? '工作树' : '本地'} aria-label={project?.environment === 'worktree' ? '工作树' : '本地'}><Laptop aria-hidden="true" /></span></> : <><span className="project-context"><Laptop aria-hidden="true" />{project?.environment === 'worktree' ? '工作树' : '本地'}</span>
      {project?.git?.branch && <span className="project-context project-branch" title={project.git.branch}><GitBranch aria-hidden="true" /><span>{project.git.branch}</span></span>}</>}
      {showProjects && <div className="floating-menu project-menu"><button onClick={async () => { try { const project = await window.desktop?.pickProject?.(); if (!project) return; update(next => { if (!next.projects.some(item => item.id === project.id)) next.projects.push(project); next.activeProjectId = project.id; const thread = createThread(next); thread.projectId = project.id; thread.cwd = project.path; }); setShowProjects(false); } catch (error: any) { toast(error.message); } }}>打开文件夹…</button>{(projects.length ? projects : [{ id: workingDirectory || 'my-agent-plantform', name: projectName || 'my-agent-plantform' }]).map(item => <button key={item.id} onClick={() => { update(next => { next.activeProjectId = item.id; const thread = createThread(next); thread.projectId = item.id; thread.cwd = projects.find(project => project.id === item.id)?.path; }); setShowProjects(false); }}>{projectLabel(item.name)}</button>)}</div>}
    </div>
    <div className="composer">
      {composerSkills.length > 0 && <div className="attachment-list" aria-label="本次使用的技能">{composerSkills.map(skill => <span key={skill.path} title={skill.path}>{skill.name}<button aria-label={`移除技能 ${skill.name}`} onClick={() => setComposerSkills(composerSkills.filter(item => item.path !== skill.path))}><X size={14} /></button></span>)}</div>}
      <ContextUsage key={active?.id || 'new'} usage={active?.contextTokens} threadId={active?.remoteId} disabled={busy || running || status !== 'connected'} />
      {composerPlugins.length > 0 && <div className="composer-plugin-chips" aria-label="本次使用的插件">{composerPlugins.map(plugin => <span key={plugin.id}><ExtensionIcon item={plugin} /><span>{extensionName(plugin)}</span><button aria-label={`移除 ${extensionName(plugin)}`} onClick={() => setComposerPlugins(composerPlugins.filter(item => item.id !== plugin.id))}><X /></button></span>)}</div>}
      {attachments.length > 0 && <div className="attachment-list">{attachments.map(name => <span key={name} title={name}>{name.replace(/^.*[\\/]/, '')}<button aria-label={`移除附件：${name}`} onClick={() => removeAttachment(name)}>×</button></span>)}</div>}
      <textarea ref={textarea} aria-label="消息" value={input} onChange={event => setInput(event.target.value)}
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={event => {
          if (event.key !== 'Enter' || event.shiftKey || event.altKey || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          if (sendShortcut === 'mod-enter' && !event.ctrlKey && !event.metaKey) return;
          event.preventDefault();
          if (!event.repeat && canSend) send();
        }} placeholder={status === 'connected' ? '随心输入' : '等待 Codex app-server…'} />
      <div className="composer-footer">
        {active?.requestedPermission === 'workspace-write' && active.effectivePermissions?.sandbox === 'readOnly' && <p role="status">当前会话实际为只读，工作区写入未生效。Windows 未配置沙箱或服务端策略限制可能导致降级。</p>}<div className="composer-left"><button className="icon-button" onClick={addAttachment} title="添加附件" aria-label="添加附件"><Plus aria-hidden="true" /></button><div className="permission-picker"><button className="permission-status" aria-expanded={permissionOpen} onClick={() => setPermissionOpen(value => !value)}><ShieldAlert aria-hidden="true" />{active?.remoteId ? permissionSummary(active.effectivePermissions) : permissionOptions.find(item => item[0] === permission)?.[1]}</button>{permissionOpen && <div className="permission-menu">{active?.remoteId && <><h3>修改当前会话权限</h3><p>在会话空闲时修改；等待服务端确认后生效。</p>{permissionOptions.map(([value, label]) => <button key={`current-${value}`} disabled={busy || running || status !== 'connected'} onClick={() => { void onChangePermission(value); setPermissionOpen(false); }}>当前会话：{label}</button>)}</>}<h3>新会话默认权限</h3>{active?.remoteId && <p>当前会话：{permissionSummary(active.effectivePermissions)}。下面的选择仅用于新会话。</p>}{active?.effectivePermissions && <p>审批策略：{active.effectivePermissions.approvalPolicy}</p>}{permissionOptions.map(([value, label, description]) => <button key={value} className={permission === value ? 'selected' : ''} onClick={() => { update(next => { next.permission = value; }); setPermissionOpen(false); }}><ShieldAlert aria-hidden="true" /><span><b>{label}</b><small>{description}</small></span></button>)}</div>}</div><span className="connection-status" role="status" title={status === 'connected' ? '已连接' : status} aria-label={status === 'connected' ? '已连接' : status}><i className={`status-dot ${status}`} /></span></div>
        <div className="composer-right"><EffortPicker model={model} value={reasoningEffort} onChange={value => update(next => { const thread = next.threads.find(item => item.id === active?.id); if (thread) thread.reasoningEffort = value; else next.reasoningEffort = value; })} /><ModelPicker catalog={catalog} selected={model} open={showModel} setOpen={setShowModel} onSelect={id => update(next => { const thread = next.threads.find(item => item.id === active?.id); if (thread) thread.model = id; else next.model = id; })} />{running && <button className="send" title="停止生成" aria-label="停止生成" onClick={cancel}><Square aria-hidden="true" /></button>}<button className="send" title={running ? '追加指令' : '发送'} aria-label={running ? '追加指令' : '发送'} disabled={!canSend} onClick={send}><ArrowUp aria-hidden="true" /></button></div>
      </div>
    </div>
  </div></div>;
}

function Workspace({ serviceControl, page, state, models, update, toast, providerStatus, onBack }: { serviceControl: ReactNode; page: Page; state: DesktopState; models: string[]; update: (fn: (next: DesktopState) => void) => void; toast: (text: string) => void; providerStatus?: any; onBack: () => void }) {
  if (page === 'settings') return <SettingsWorkspace serviceControl={serviceControl} state={state} update={update} toast={toast} onBack={onBack} />;
  const title = page === 'scheduled' ? '已安排' : page === 'plugins' ? '插件' : '设置';
return <section className="page"><h1>{title}</h1><p>本地工作区演示页面，已准备好接入对应 connector。</p></section>;
}

function SettingsWorkspace({ serviceControl, state, update, toast, onBack }: { serviceControl: ReactNode; state: DesktopState; update: (fn: (next: DesktopState) => void) => void; toast: (text: string) => void; onBack: () => void }) {
  return <SettingsNavigation onBack={onBack}>{section => <>{serviceControl}{section === '键盘快捷键'
    ? <KeyboardSettings value={state.sendShortcut} onChange={value => update(next => { next.sendShortcut = value; })} />
    : section === '电脑操控' ? <RemoteDesktopPanel />
    : section === '通知' ? <NotificationSettings />
    : section === '配置' ? <ProviderSettings state={state} update={update} toast={toast} />
    : section === '权限' ? <><PermissionSettings value={state.permission} onChange={value => update(next => { next.permission = value; })} /><WindowsSandboxSettings cwd={workspaceFor(state, state.threads.find(thread => thread.id === state.activeThreadId))} /></>
    : <div className="settings-card"><div className="settings-line"><div><b>主题</b><small>应用界面主题</small></div><select aria-label="主题" value={state.theme} onChange={e => update(next => { next.theme = e.target.value as DesktopState['theme']; })}><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></div><div className="settings-line"><div><b>默认模型</b><small>Agent 默认使用的模型</small></div><span>{state.model || '自动选择'}</span></div></div>
  }</>}</SettingsNavigation>;
}

function ProviderSettings({ state, update, toast }: { state: DesktopState; update: (fn: (next: DesktopState) => void) => void; toast: (text: string) => void }) {
  type ProviderSummary = { id: string; name: string; baseUrl: string; model: string; enabled: boolean; keyConfigured: boolean; authRequired?: boolean; manualModel?: boolean };
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [deleting, setDeleting] = useState<ProviderSummary>();
  const [deleteError, setDeleteError] = useState('');
  const [draft, setDraft] = useState({ id: '', name: 'RVCompute', baseUrl: 'https://api.rvcompute.com:60000/v1', apiKey: '', model: '', manualModel: false });
  const reload = async () => { setProviders(await window.desktop?.listProviders?.() || []); };
  useEffect(() => { void reload().catch(() => toast('无法读取 Provider 配置')); }, []);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState('');
  const changeConnection = (field: 'baseUrl' | 'apiKey', value: string) => {
    setDraft(current => ({ ...current, [field]: value, model: '' }));
    setModels([]);
    setConnectionError('');
  };
  const connect = async () => {
    setConnecting(true);
    setModels([]);
    setConnectionError('');
    try {
      const result = await window.desktop?.listModels?.({ id: draft.id, baseUrl: draft.baseUrl, apiKey: draft.apiKey });
      if (!result?.ok || !result.models?.length) throw new Error(result?.error || '请在桌面应用中连接模型服务');
      setModels(result.models);
      setDraft(current => ({ ...current, model: current.manualModel || result.models.includes(current.model) ? current.model : '' }));
    } catch (error) { setConnectionError(error instanceof Error ? error.message : '连接失败'); }
    finally { setConnecting(false); }
  };
  const validModel = draft.manualModel ? Boolean(draft.model.trim()) && !/[\r\n\0]/.test(draft.model) : models.includes(draft.model);
  const add = async (activate: boolean) => {
    if (saving) return;
    if (!draft.name.trim() || !validModel) return toast('请选择模型或填写手动模型 ID');
    setSaving(true);
    try {
      const result = await window.desktop?.saveProvider?.({ ...draft, model: draft.model.trim(), activate });
      if (!result?.ok) throw new Error(result?.error || '请在桌面应用中配置 Provider');
      if (activate) { update(next => { next.model = draft.model.trim(); }); window.dispatchEvent(new Event('provider-changed')); }
      setDraft({ ...draft, id: result.id || draft.id, apiKey: '' });
      await reload();
      toast(activate ? `已启用模型：${draft.model}` : '渠道已保存');
    } catch (error) { toast(error instanceof Error ? error.message : '保存失败'); }
    finally { setSaving(false); }
  };
  const activate = async (provider: ProviderSummary) => {
    setSaving(true);
    try {
      const result = await window.desktop?.activateProvider?.(provider.id);
      if (!result?.ok) throw new Error(result?.error || '切换失败');
      update(next => { next.model = result.model || ''; });
      window.dispatchEvent(new Event('provider-changed'));
      await reload();
      toast(`已切换到 ${provider.name}`);
    } catch (error) { toast(error instanceof Error ? error.message : '切换失败'); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleting || saving) return;
    setSaving(true); setDeleteError('');
    try {
      const result = await window.desktop?.deleteProvider?.(deleting.id);
      if (!result?.ok) throw new Error(result?.error || '删除渠道失败');
      if (draft.id === deleting.id) { setDraft({ id: '', name: '', baseUrl: '', apiKey: '', model: '', manualModel: false }); setModels([]); setConnectionError(''); }
      setDeleting(undefined);
      await reload();
      toast('渠道及其已保存密钥已删除');
    } catch (error) { setDeleteError(error instanceof Error ? error.message : '删除渠道失败'); }
    finally { setSaving(false); }
  };
  return <div className="provider-settings"><h2>Agent LLM Provider</h2>
    {deleting && <section role="alert" aria-label="确认删除渠道"><p>删除渠道“{deleting.name}”？其已保存的密钥也会移除。</p><button disabled={saving} onClick={() => { setDeleting(undefined); setDeleteError(''); }}>取消删除</button><button disabled={saving} onClick={() => void remove()}>确认删除渠道</button>{deleteError && <p>{deleteError}</p>}</section>}
    {providers.map(provider => <div className="provider-item" key={provider.id}>
      <div><b>{provider.name}{provider.enabled ? ' · 当前使用' : ''}</b><small>{provider.baseUrl}</small><small>{provider.model || '未选择默认模型'} · {provider.keyConfigured ? '密钥已配置' : provider.authRequired === false ? '本机服务，无密钥' : '待配置密钥'}</small></div>
      <div><button disabled={saving || connecting} onClick={() => { setDraft({ id: provider.id, name: provider.name, baseUrl: provider.baseUrl, model: provider.model, apiKey: '', manualModel: provider.manualModel === true }); setModels([]); setConnectionError(''); }}>编辑</button>
      <button disabled={saving || connecting || provider.enabled} aria-label={`删除渠道 ${provider.name}`} title={provider.enabled ? '请先启用其他渠道' : '删除渠道和已保存密钥'} onClick={() => { setDeleting(provider); setDeleteError(''); }}><Trash2 size={14} /></button><button disabled={saving || connecting || provider.enabled || (!provider.keyConfigured && provider.authRequired !== false)} onClick={() => void activate(provider)}>启用</button></div>
    </div>)}
    <button disabled={saving || connecting} onClick={() => { setDraft({ id: '', name: '', baseUrl: 'https://api.rvcompute.com:60000/v1', apiKey: '', model: '', manualModel: false }); setModels([]); setConnectionError(''); }}><Plus size={14} /> 新增渠道</button>
    <h3>{draft.id ? '编辑渠道' : '新增渠道'}</h3>
    <fieldset className="provider-form" disabled={saving || connecting} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <input aria-label="Provider 名称" placeholder="Provider 名称" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
      <input aria-label="Base URL" value={draft.baseUrl} onChange={e => changeConnection('baseUrl', e.target.value)} />
      <input aria-label="API Key" placeholder="API Key（本机服务可留空；同一服务保留已保存密钥）" type="password" autoComplete="off" value={draft.apiKey} onChange={e => changeConnection('apiKey', e.target.value)} />
      <button type="button" onClick={() => void connect()}><RefreshCcw size={14} /> {connecting ? '正在连接…' : '连接并获取模型'}</button>
      {connectionError && <p role="alert" style={{ gridColumn: '1 / -1' }}>{connectionError}</p>}
      <label style={{ gridColumn: '1 / -1' }}><input type="checkbox" checked={draft.manualModel} onChange={event => setDraft(current => ({ ...current, manualModel: event.target.checked }))} />手动填写模型 ID</label>
      {draft.manualModel && <><input aria-label="手动模型 ID" placeholder="服务提供的完整模型 ID" value={draft.model} onChange={event => setDraft(current => ({ ...current, model: event.target.value }))} /><p style={{ gridColumn: '1 / -1' }}>适用于不提供模型列表的服务。保存配置不会验证模型是否可用，发送消息时由服务端确认。</p></>}
      {!draft.manualModel && models.length > 0 && <>
        <p role="status" style={{ gridColumn: '1 / -1' }}>连接成功 · 获取到 {models.length} 个模型</p>
        <label htmlFor="provider-model">模型</label>
        <select id="provider-model" value={draft.model} onChange={e => setDraft({ ...draft, model: e.target.value })} style={{ minWidth: 0, maxWidth: '100%' }}>
          <option value="" disabled>请选择模型</option>
          {models.map(model => <option key={model} value={model}>{model}</option>)}
        </select>
      </>}
      <button disabled={!validModel} onClick={() => void add(false)}>保存渠道</button>
      <button className="primary-button" disabled={!validModel} onClick={() => void add(true)}>{saving ? '保存中…' : '保存并启用模型'}</button>
    </fieldset>
  </div>;
}

declare global { interface Window { desktop?: WindowFrameBridge & { platform?: string; saveTerminal?: (input: { filename: string; content: string }) => Promise<{ ok: boolean; canceled?: boolean; error?: string }>; saveConversation?: (input: { filename: string; content: string }) => Promise<{ ok: boolean; canceled?: boolean; error?: string }>;  openExternal?: (url: string) => Promise<void>; terminal?: import('./TerminalPanel').TerminalBridge; artifact?: (input: any) => Promise<any>; toggleMaximize: () => Promise<{ maximized?: boolean }>; minimize?: () => Promise<void>; close?: () => Promise<void>; providerStatus?: () => Promise<any>; saveProvider?: (input: { id?: string; activate?: boolean; manualModel?: boolean; name: string; baseUrl: string; apiKey: string; model: string }) => Promise<{ ok: boolean; id?: string; error?: string }>; listProviders?: () => Promise<any[]>; deleteProvider?: (id: string) => Promise<{ ok: boolean; error?: string }>; activateProvider?: (id: string) => Promise<{ ok: boolean; model?: string; error?: string }>; listModels?: (input?: { id?: string; baseUrl: string; apiKey: string }) => Promise<any>; workspaceGit?: (input: any) => Promise<any>; workspaceFile?: (input: { root: string; path: string; action: string; query?: string; edit?: { text: string; revision: string } }) => Promise<any>; pickProject?: () => Promise<import('./domain').Project | null>; getProjectRoot?: () => Promise<string>; pickFiles?: () => Promise<string[]>; readExtensionFile?: (path: string, kind: 'image' | 'skill') => Promise<any>; listTasks?: () => Promise<any>; saveTask?: (input: any) => Promise<any>; setTaskStatus?: (id: string, status: string) => Promise<any>; runTask?: (id: string) => Promise<any>; cancelTask?: (id: string) => Promise<any>; deleteTask?: (id: string) => Promise<any>; taskDetail?: (id: string) => Promise<any>; onTasksChanged?: (listener: (message?: { error?: string }) => void) => () => void }; codex?: any } }
createRoot(document.getElementById('root')!).render(<StrictMode><WindowFrame><App /></WindowFrame></StrictMode>);
