import { unsupportedEffort } from './reasoningEffort';
import { createServerResponses } from './serverResponses';
import { createThreadEvents } from './threadEvents';
import { modelCatalogIds } from './modelCatalog';
import { removeRecentProject } from './recentProjects';
import { projectRepository } from './projectRepository';
import type { HistoryReadOptions } from './threadHistory';
import { threadBackend } from './threadBackend';
import { createThreadStore } from './threadStore';
import { approvalFileChanges } from './approvalFileChanges';
import { BackgroundTerminals } from './BackgroundTerminals';
import { useTurnInterrupt } from './useTurnInterrupt';
import { RelatedThreads } from './RelatedThreads';
import { UserMessageCopy } from './UserMessageCopy';
import { AppMenus } from './AppMenus';
import { AuditLog } from './AuditLog';
import { useAuditLog } from './useAuditLog';
import { RenameThread } from './RenameThread';
import { DeleteThread } from './DeleteThread';
import { useFileDrop } from './useFileDrop';
import { pasteImage } from './pasteImage';
import { CommandPalette } from './CommandPalette';
import { useAppShortcuts } from './useAppShortcuts';
import { usePluginDraft } from './usePluginDraft';
import { LazyArtifactPreview as ArtifactPreview } from './LazyArtifactPreview';
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
import { ContextUsage, readContextTokens, useContextCompaction } from './ContextUsage';
import { useThreadList } from './useThreadList';
import { ArchivedThreads } from './ArchivedThreads';
import { useTurnQueue } from './useTurnQueue';
import { TurnQueue } from './TurnQueuePanel';
import { PlanPanel } from './PlanPanel';
import { TurnDiffPanel } from './TurnDiffPanel';
import { readThreadStatus } from './threadStatus';
import { readThreadName } from './threadName';
import { readThreadGoal } from './threadGoal';
import { ThreadGoalPanel } from './ThreadGoalPanel';
import { ThreadSectionManager } from './ThreadSectionManager';
import { AccountAuthPanel } from './AccountAuthPanel';
import { workspaceFor } from './workspace';
import { useAttachmentDraft } from './useAttachmentDraft';
import { WorkspaceFiles, type FileEditSession, type FilePreviewUpdate } from './WorkspaceFiles';
import { FileEditor } from './FileEditor';
import { GitPanel } from './GitPanel';
import { ApprovalPrompt } from './ApprovalPrompt';
import { LazyMcpForm as McpForm } from './LazyMcpForm';
import { McpUrl } from './McpUrl';
import { createConnectionRecovery } from './connectionRecovery';
import './connection.css';
import { turnCommands } from './turnService';
import type { UserAnswers } from './UserInputDialog';
import { RemoteDesktopPanel } from './RemoteDesktopPanel';
import { RemoteBrowser } from './RemoteBrowser';
import { formatBytes, type ServerDiagnostics } from './serverDiagnostics';
import { FeedbackPanel } from './FeedbackPanel';
import { RemoteProjectsPanel } from './RemoteProjectsPanel';
import { RemoteControlPanel } from './RemoteControlPanel';
import { EnvironmentPanel } from './EnvironmentPanel';
import { ThreadTimelinePanel } from './ThreadTimelinePanel';
import { readThreadProjectUpdated } from './threadMetadata';
import { readModelReroute } from './modelReroute';
import { readModelVerification } from './modelVerification';
import { readModelSafetyBuffering } from './modelSafetyBuffering';
import { ServerWarnings, useServerWarnings } from './ServerWarnings';
import { moveQueuedTurn } from './turnQueue';
import { AttachmentPreviewButton, MessageAttachment } from './MessageAttachment';
import { Globe } from 'lucide-react';
import { StrictMode, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactNode, ClipboardEvent, ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { appendMessage, automaticThreadTitle, createThread, ensureThreadTitle } from './store';
import { useDesktopState } from './useDesktopState';
import { StorageGate } from './StorageGate';
import type { DesktopState, Project } from './domain';
import { failureMessage } from './turnFailure';
import { EffortPicker } from './EffortPicker';
import { ModelPicker, useModelCatalog } from './ModelPicker';
import { restoreMessages } from './toolActivity';
import { ToolActivityGroup, groupMessages } from './ToolActivityView';
import { MessageActions } from './ReplyActions';
import { branchSnapshot, fullBranchSnapshot, isFinalReply } from './messageActions';
import { clearThreadGoal, connectCodex, createThreadSection, deleteThreadSection, getThreadGoal, listThreadSections, moveThreadSection, readAccount, readAccountRateLimits, readAccountTokenUsage, readServerDiagnosticsInfo, resetMemory, revertThread, searchThreadOccurrences, setThreadGoal, setThreadMemoryMode, startReview, subscribeCodex, updateThreadDaybreak, updateThreadSection } from './codexClient';
import { ReviewDialog, type ReviewTarget } from './ReviewDialog';
import { ExtensionsPage, ExtensionIcon } from './ExtensionsPage';
import { ThreadButton } from './ThreadButton';
import { ModePicker } from './ModePicker';
import { ArrowLeft, ArrowRight, ArrowUp, Badge, Bug, Clock3, FolderOpen, GitBranch, Hammer, Laptop, PanelLeft, Plus, Puzzle, RefreshCcw, Search, ShieldAlert, Square, SquarePen, Terminal, Telescope, Trash2, X } from 'lucide-react';
import { useNavigationHistory } from './useNavigationHistory';
import type { Page } from './useNavigationHistory';
import './styles.css';
import './sidebar.css';
import './chat.css';
import { LazyScheduledPage as ScheduledPage } from './LazyScheduledPage';
import { WindowFrame } from './WindowFrame';
import { WindowControls } from './WindowControls';
import { ComposerPlugins } from './ComposerPlugins';
import { extensionName } from './extensions';
import type { Plugin } from './extensions';
import type { WindowFrameBridge } from './WindowFrame';

import { LazyTerminalPanel as TerminalPanel } from './LazyTerminalPanel';

function projectLabel(pathOrName?: string) {
  return pathOrName?.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || pathOrName;
}

function App({ initialState }: { initialState: DesktopState }) {
  const { state, setState, update, saveFailed: stateSaveFailed, retrySave } = useDesktopState(() => ({ ...initialState, model: modelId(initialState.model) }));
  const serverResponses = useMemo(() => createServerResponses(async (id, result) => {
    if (!window.codex) throw Error('app-server 尚未连接。');
    return window.codex.respond(id, result);
  }), []);
  const threadStore = useMemo(() => createThreadStore(threadBackend, update), [update]);
  const audit = useAuditLog();
  const effectiveTheme = useTheme(state.theme);
  const [input, setInput, draftStorage] = useThreadDraft(state.activeThreadId);
  const [composerSkills, setComposerSkills, skillStorage] = useSkillDraft(state.activeThreadId);
  const [composerPlugins, setComposerPlugins, pluginStorage] = usePluginDraft(state.activeThreadId);
  const [page, setPage] = useState<Page>('chat');
  const [taskOpenRequest, setTaskOpenRequest] = useState<{ id: string }>();
  useEffect(() => window.desktop?.onOpenTask?.(id => {
    if (typeof id !== 'string' || !id.trim()) return;
    setTaskOpenRequest({ id }); setPage('scheduled');
  }), []);
  const [sidebarVisible, setSidebarVisible] = useState(() => !window.matchMedia('(max-width: 760px)').matches);
  const closeNarrowSidebar = () => { if (window.matchMedia('(max-width: 760px)').matches) setSidebarVisible(false); };
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const changed = () => { if (media.matches) setSidebarVisible(false); };
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    const desktop = window.desktop as typeof window.desktop & { onOpenConversation?: (listener: (threadId: string) => void) => () => void };
    return desktop?.onOpenConversation?.(threadId => {
      if (typeof threadId !== 'string' || !threadId.trim()) return;
      setState(previous => { const next = structuredClone(previous); selectNotifiedThread(next, threadId); return next; });
      setPage('chat'); setSidebarVisible(!window.matchMedia('(max-width: 760px)').matches);
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [archivesOpen, setArchivesOpen] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [attachments, setAttachments, attachmentStorage] = useAttachmentDraft(state.activeThreadId);
  const [notice, setNotice] = useState('');
  const serverWarnings = useServerWarnings();
  const [codexStatus, setCodexStatus] = useState<'connecting' | 'connected' | 'offline' | 'error'>('connecting');
  const threadList = useThreadList(threadStore, codexStatus === 'connected', setState, search);
  const reconnectRef = useRef<() => void>(() => {});
  const stopRecoveryRef = useRef<() => void>(() => {});
  const restartingRef = useRef(false);
  const [restarting, setRestarting] = useState(false);
  const sandboxState = useSyncExternalStore(subscribeSandbox, sandboxSnapshot);
  const [connectionError, setConnectionError] = useState('');
  const [remoteThreadId, setRemoteThreadId] = useState<string>();
  const runtime = useTurnRuntime();
  const transcriptVersions = useRef(new Map<string, number>());
  const queue = useTurnQueue();
  const [pendingThreads, setPendingThreads] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<Record<string, number>>({});
  const pendingImagesRef = useRef<Record<string, number>>({});
  const [restoringThread, setRestoringThread] = useState<string>();
  const [restoreErrors, setRestoreErrors] = useState<Record<string, string>>({});
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [approvals, setApprovals] = useState<any[]>([]);
  const nonblockingQuestions = approvals.filter(item => item.method === 'item/tool/requestUserInput' && item.params?.isBlocking === false);
  const approval = approvals.find(item => !nonblockingQuestions.includes(item));
  const [renameCandidate, setRenameCandidate] = useState<{ id: string; title: string }>();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<string>();
  const archiveLocks = useRef(new Set<string>());
  const [forking, setForking] = useState(false);
  const [providerStatus, setProviderStatus] = useState<any>();
  const [rateLimits, setRateLimits] = useState<import('./rateLimits').RateLimits>();
  const [accountUsage, setAccountUsage] = useState<import('./accountUsage').AccountUsage>();
  const [serverDiagnostics, setServerDiagnostics] = useState<ServerDiagnostics>();
  const [accountInfo, setAccountInfo] = useState<import('./accountInfo').AccountInfo>();
  const [threadSections, setThreadSections] = useState<import('./threadSections').ThreadSection[]>([]);
  const [providerChoices, setProviderChoices] = useState<Array<{ id: string; name: string; enabled?: boolean; keyConfigured?: boolean; authRequired?: boolean }>>([]);
  const [newThreadProviderId, setNewThreadProviderId] = useState<string>();
  const selectedProviderId = state.threads.find(thread => thread.id === state.activeThreadId)?.providerId || newThreadProviderId;
  const catalog = useModelCatalog(selectedProviderId);
  const availableModels = catalog.models;
  useEffect(() => {
    if (!catalog.loading && availableModels.length) setState(current => availableModels.includes(current.model) ? current : { ...current, model: availableModels[0] });
  }, [availableModels, catalog.loading]);
  const activeThreadRef = useRef<string | undefined>(undefined);
  const sendingRef = useRef(new Set<string>());
  const forkingRef = useRef(false);
  activeThreadRef.current = state.activeThreadId;
  const active = state.threads.find(thread => thread.id === state.activeThreadId);
  const activeRemoteRef = useRef<string | undefined>(undefined);
  activeRemoteRef.current = active?.remoteId;
  const activeModel = active?.model || state.model;
  const activeEffort = active?.reasoningEffort || state.reasoningEffort;
  const effortUnsupported = unsupportedEffort(activeEffort, catalog.efforts[activeModel]);
  const runningTurnId = active?.remoteId ? runtime.threads[active.remoteId]?.turnId : undefined;
  const compaction = useContextCompaction(active?.remoteId);
  const interruption = useTurnInterrupt(active?.remoteId, runningTurnId);
  const activity = active?.remoteId ? runtime.threads[active.remoteId]?.activity : undefined;
  const serviceInUse = pendingThreads.length > 0 || Boolean(restoringThread) || approvals.length > 0 || state.threads.some(thread => thread.status === 'running') || Object.values(runtime.threads).some(thread => Boolean(thread.turnId)) || sandboxState.busy;
  const restartService = async () => {
    if (restartingRef.current || serviceInUse || codexStatus === 'connecting') return;
    restartingRef.current = true; audit.record('请求重启工作区服务'); setRestarting(true); stopRecoveryRef.current(); queue.pause(); setConnectionError(''); setCodexStatus('connecting');
    try {
      const result = await window.codex?.stop?.();
      if (!result?.ok) throw Error(result?.error?.message || result?.error || '服务重启不可用');
      audit.record('工作区服务已停止');
    } catch (error) { audit.record('停止工作区服务失败'); setNotice(`重启服务失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { restartingRef.current = false; setRestarting(false); reconnectRef.current(); }
  };
  const savingImages = (pendingImages[active?.id || 'new'] || 0) > 0;
  const restoreError = active?.remoteId ? restoreErrors[active.remoteId] : undefined;
  const pending = savingImages || pendingThreads.includes(active?.id || '') || !!active?.remoteId && restoringThread === active.remoteId || Boolean(restoreError);
  const pasteAttachments = (event: ClipboardEvent) => {
    const key = active?.id || 'new';
    const done = pasteImage(event, paths => setAttachments(current => [...new Set([...current, ...paths])], key), setNotice);
    if (!done) return;
    const change = (delta: number) => {
      const next = { ...pendingImagesRef.current, [key]: (pendingImagesRef.current[key] || 0) + delta };
      if (!next[key]) delete next[key];
      pendingImagesRef.current = next; setPendingImages(next);
    };
    change(1); void done.finally(() => change(-1));
  };
  const threads = useMemo(() => state.threads.filter(thread => !thread.archived && (thread.title.toLowerCase().includes(search.trim().toLowerCase()) || thread.messages.some(message => message.content.toLowerCase().includes(search.trim().toLowerCase())) || !!thread.remoteId && threadList.matchingIds.includes(thread.remoteId))).slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt)), [state.threads, search, threadList.matchingIds]);
  const threadsBySection = useMemo(() => {
    const grouped = new Map<string, typeof threads>();
    for (const thread of threads) {
      const key = thread.sectionId && threadSections.some(section => section.id === thread.sectionId) ? thread.sectionId : '';
      grouped.set(key, [...(grouped.get(key) || []), thread]);
    }
    return grouped;
  }, [threads, threadSections]);
  const refreshProviders = () => window.desktop?.listProviders?.().then((items: any[]) => {
    const choices = Array.isArray(items) ? items : []; setProviderChoices(choices);
    const enabled = choices.find(item => item.enabled); if (!newThreadProviderId && enabled) setNewThreadProviderId(enabled.id);
  }).catch(() => undefined);
  useEffect(() => {
    refreshProviders();
    window.desktop?.providerStatus?.().then((provider: any) => {
      setProviderStatus(provider);
      if (!provider?.keyConfigured && provider?.authRequired !== false) setNotice(failureMessage('MINIMAX_API_KEY'));
    }).catch(() => undefined);
  }, []);
  useEffect(() => { const changed = () => refreshProviders(); window.addEventListener('provider-changed', changed); return () => window.removeEventListener('provider-changed', changed); });
  useEffect(() => {
    const remoteId = active?.remoteId;
    if (!remoteId || active?.providerId || !window.desktop?.threadProvider) return;
    void window.desktop.threadProvider(remoteId).then((providerId?: string) => {
      if (!providerId) return;
      update(next => { const thread = next.threads.find(item => item.remoteId === remoteId); if (thread && !thread.providerId) thread.providerId = providerId; });
    }).catch(() => undefined);
  }, [active?.remoteId, active?.providerId]);
  useEffect(() => {
    let disposed = false;
    const recovery = createConnectionRecovery({
      connect: connectCodex,
      status: (status, error) => { setCodexStatus(status); setConnectionError(error || ''); },
      connected: () => { if (window.desktop?.platform === 'win32') void checkWindowsSandbox(); },
    });
    reconnectRef.current = recovery.start; stopRecoveryRef.current = recovery.stop;
    const threadEvents = createThreadEvents({ update, runtime, queue, audit, activeRemoteId: () => activeRemoteRef.current });
    const cleanup = subscribeCodex({
      notification: message => {
        const params = message.params || {};
        if (threadEvents(message)) {
          // Invalidate pending history even for content-only events that do not
          // advance the turn lifecycle. Conservatively include unknown payloads.
          if (typeof params.threadId === 'string' && params.threadId.trim()) {
            transcriptVersions.current.set(params.threadId, (transcriptVersions.current.get(params.threadId) || 0) + 1);
          }
          return;
        }
        if (message.method === 'warning' && typeof params.message === 'string' && params.message.trim()) {
          if (typeof params.threadId === 'string' && params.threadId) {
            const warningId = crypto.randomUUID();
            update(next => {
              let thread = next.threads.find(item => item.remoteId === params.threadId);
              if (!thread) {
                thread = { id: crypto.randomUUID(), remoteId: params.threadId, title: '会话警告', status: 'idle', pinned: false, archived: false, messages: [], updatedAt: new Date().toISOString() };
                next.threads.push(thread);
              }
              thread.messages.push({ id: warningId, role: 'system', content: `警告：${params.message}`, createdAt: new Date().toISOString() });
            });
          } else serverWarnings.push(params.message);
        }
        if (message.method === 'thread/settings/updated') {
          update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) thread.effectivePermissions = readThreadPermissions(params.threadSettings); });
        }
        if (message.method === 'thread/project/updated') {
          const project = readThreadProjectUpdated(params);
          if (project) update(next => { const thread = next.threads.find(item => item.remoteId === project.threadId); if (thread) { if (project.projectId) thread.projectId = project.projectId; else delete thread.projectId; } });
        }
        if (message.method === 'model/rerouted') {
          const reroute = readModelReroute(params);
          if (reroute) setNotice(`模型已从 ${reroute.fromModel} 切换为 ${reroute.toModel}（${reroute.reason}）`);
        }
        if (message.method === 'model/verification') {
          const verification = readModelVerification(params);
          if (verification) setNotice(`模型验证：${verification.verifications.join('、')}`);
        }
        if (message.method === 'model/safetyBuffering/updated') {
          const buffering = readModelSafetyBuffering(params);
          if (buffering?.showBufferingUi) setNotice(`模型安全缓冲中：${buffering.reasons.join('、') || '正在完成安全检查'}${buffering.fasterModel ? ` · 可切换为 ${buffering.fasterModel}` : ''}`);
        }
        if (message.method === 'thread/tokenUsage/updated') {
          const usage = readContextTokens(params.tokenUsage);
          if (usage) update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) thread.contextTokens = usage; });
        }
        if (message.method === 'thread/status/changed') {
          const status = readThreadStatus(params);
          if (status) update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) { thread.status = status.status; if (thread.remoteId !== activeRemoteRef.current && status.status === 'needs_input') thread.unread = true; } });
        }
        if (message.method === 'thread/name/updated') {
          const name = readThreadName(params);
          if (name?.name) update(next => { const thread = next.threads.find(item => item.remoteId === name.threadId); if (thread && thread.titleSource !== 'manual') { thread.title = name.name!; thread.titleSource = 'auto'; } });
        }
        if (message.method === 'thread/goal/updated') {
          const parsed = readThreadGoal(params);
          if (parsed) update(next => { const thread = next.threads.find(item => item.remoteId === parsed.threadId); if (thread) thread.goal = parsed.goal; });
        }
        if (message.method === 'thread/goal/cleared' && typeof params.threadId === 'string') {
          update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) delete thread.goal; });
        }
        if (message.method === 'serverRequest/resolved') {
          serverResponses.invalidate(params.requestId);
          setApprovals(pending => pending.filter(item => item.id !== params.requestId));
        }

      },
      serverRequest: message => setApprovals(pending => pending.some(item => item.id === message.id) ? pending : [...pending, { ...message, uiKey: crypto.randomUUID() }]),
      error: error => { setCodexStatus('error'); setNotice(`Codex 通信错误：${error?.message || '未知错误'}`); },
      stderr: text => {
        for (const line of String(text || '').split('\n').filter(Boolean)) {
          try { const log = JSON.parse(line); if (log.level === 'ERROR') setNotice(failureMessage(log.fields?.message)); }
          catch { if (/MINIMAX_API_KEY/.test(line)) setNotice(failureMessage(line)); }
        }
      },
      closed: () => { invalidateWindowsSandbox(); queue.pause(); serverResponses.reset(); setApprovals([]); runtime.clear(); if (!restartingRef.current) recovery.disconnected(); }
    });
    window.addEventListener('online', recovery.online);
    recovery.start();
    return () => { disposed = true; window.removeEventListener('online', recovery.online); recovery.stop(); cleanup(); reconnectRef.current = () => {}; stopRecoveryRef.current = () => {}; };
  }, []);
  const toast = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 1500); };
  const enqueue = () => {
    if (catalog.loading || effortUnsupported) return;
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
      if (!thread || restoreErrors[item.threadId] || restoringThread === item.threadId) continue;
      if (!queue.change(items => items.map(entry => entry.id === item.id ? { ...entry, status: 'sending', error: undefined } : entry), true)) continue;
      sendingRef.current.add(item.localId);
      setPendingThreads(previous => [...previous, item.localId]);
      update(next => { const target = next.threads.find(thread => thread.id === item.localId); if (target) target.messages.push({ id: item.id, role: 'user', content: item.text, attachments: item.attachments, skills: item.skills, plugins: item.plugins, createdAt: new Date().toISOString() }); });
      void (async () => {
        try {
          const result = await turnCommands.start({ threadId: item.threadId, text: item.text, attachments: item.attachments, skills: item.skills, model: item.model, effort: item.effort, plugins: item.plugins, planningMode: item.planningMode || 'default', cwd: item.cwd });
          const turn = result.turn;
          if (!turn?.id) throw new Error('服务未返回回合编号，请检查会话记录。');
          runtime.apply(item.threadId, { type: 'start', turnId: turn.id });
          if (turn.status && turn.status !== 'inProgress') runtime.apply(item.threadId, { type: 'finish', turnId: turn.id, status: turn.status });
          const outcome = runtime.read(item.threadId)?.outcomes?.[turn.id];
          queue.change(items => items.filter(entry => entry.id !== item.id).map(entry => entry.threadId === item.threadId && entry.status !== 'paused' ? { ...entry, waitingOn: turn.id, status: outcome ? outcome === 'completed' ? 'ready' : 'paused' : 'waiting', error: outcome && outcome !== 'completed' ? '上一轮未正常完成，请确认后继续。' : undefined } : entry));
          update(next => { const target = next.threads.find(thread => thread.id === item.localId); const message = target?.messages.find(message => message.id === item.id); if (message) message.turnId = turn.id; });
        } catch (error: any) {
          const reason = error.message || String(error);
          const feedback = reason.includes('未确认') ? reason : `发送未确认：${reason}。请检查会话记录后再试。`;
          queue.change(items => items.map(entry => entry.threadId === item.threadId ? { ...entry, status: 'paused', error: feedback } : entry));
          update(next => { const target = next.threads.find(thread => thread.id === item.localId); if (target) target.messages = target.messages.filter(message => message.id !== item.id); });
        } finally {
          sendingRef.current.delete(item.localId);
          setPendingThreads(previous => previous.filter(id => id !== item.localId));
        }
      })();
    }
  }, [queue.items, codexStatus, runtime.threads, pendingThreads, state.threads, restoreErrors, restoringThread]);
  const send = async () => {
    if (pendingImagesRef.current[state.activeThreadId || 'new']) return;
    const text = input.trim(); if ((!text && !attachments.length && !composerSkills.length) || pending) return;
    if (!runningTurnId && effortUnsupported) { setNotice('此模型不支持当前推理强度，请重新选择；草稿已保留。'); return; }
    if (catalog.loading || !availableModels.includes(activeModel)) { setNotice(catalog.error || '请等待模型列表加载并选择模型。'); setShowModel(true); return; }
    if (codexStatus !== 'connected') { setNotice('app-server 尚未连接，请稍后重试。'); return; }
    const existing = state.threads.find(item => item.id === state.activeThreadId);
    const lockId = existing?.id || 'new-thread';
    if (sendingRef.current.has(lockId)) return;
    sendingRef.current.add(lockId);
    let localId = existing?.id;
    const automaticTitle = automaticThreadTitle(existing, text);
    if (!existing) { const draft = structuredClone(state); const created = createThread(draft); localId = created.id; setInput(input, localId); setInput(''); setAttachments(attachments, localId); setAttachments([]); setComposerSkills(composerSkills, localId); setComposerSkills([]); setComposerPlugins(composerPlugins, localId); setComposerPlugins([]); update(next => { next.threads.push(created); next.activeThreadId = created.id; }); }
    setPendingThreads(previous => [...previous, localId!]);
    const messageId = crypto.randomUUID();
    try {
      const provider = await window.desktop?.providerStatus?.(existing?.providerId || newThreadProviderId);
      setProviderStatus(provider);
      if (!provider?.keyConfigured && provider?.authRequired !== false) throw new Error(failureMessage('MINIMAX_API_KEY'));
      const model = modelId(activeModel); const modelProvider = 'minimax';
      update(next => { const thread = next.threads.find(item => item.id === localId); if (thread) { thread.model = model; thread.reasoningEffort = activeEffort; } });
      const cwd = workspaceFor(state, existing) || (!existing?.remoteId ? await projectRepository.defaultRoot() : undefined);
      const projectId = existing?.projectId || (!existing?.remoteId ? state.activeProjectId : undefined);
      update(next => { const thread = next.threads.find(item => item.id === localId); if (thread && cwd) { thread.cwd = cwd; if (!thread.remoteId) thread.projectId = projectId; } });
      let threadId = existing?.remoteId;
      const createRemoteThread = async () => {
        const started = await threadStore.start(localId!, { effort: activeEffort, model, modelProvider, providerId: newThreadProviderId, projectId, cwd, permission: state.permission });
        const id = started.id;
        if (!id) throw new Error('没有返回 thread id');
        update(next => { const thread = next.threads.find(item => item.id === localId); if (thread) { thread.remoteId = id; thread.providerId = started.providerId || newThreadProviderId; thread.effectivePermissions = started.permissions; thread.requestedPermission = state.permission; } });
        return id;
      };
      if (!threadId) threadId = await createRemoteThread();
      if (!threadId) throw new Error('没有返回 thread id');
      if (automaticTitle) void threadStore.syncInitialTitle({ id: localId!, remoteId: threadId }, automaticTitle).catch(() => toast('标题已保存在本地，远端同步失败。'));
      update(next => {
        const thread = next.threads.find(item => item.id === localId);
        if (!thread) return;
        thread.messages.push({ id: messageId, role: 'user', content: text, attachments: [...attachments], skills: [...composerSkills], plugins: composerPlugins.map(({ id, name }) => ({ id, name })), createdAt: new Date().toISOString() });
        ensureThreadTitle(thread);
        thread.updatedAt = new Date().toISOString();
      });
      let turn;
      const plugins = composerPlugins.map(plugin => ({ id: plugin.id, name: plugin.name }));
      if (runningTurnId) {
        const result = await turnCommands.steer(threadId, runningTurnId, text, plugins, attachments, composerSkills);
        turn = { turn: { id: result.turnId } };
      } else {
        turn = await turnCommands.start({ threadId, text, attachments, skills: composerSkills, plugins, model, modelProvider, effort: activeEffort, cwd, planningMode: existing?.planningMode || 'default' });
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
      setInput(current => current === input ? '' : current, localId);
      setAttachments(current => current.filter(path => !attachments.includes(path)), localId);
      setComposerSkills(current => current.filter(skill => !composerSkills.some(sent => sent.path === skill.path)), localId);
      setComposerPlugins(current => current.filter(plugin => !composerPlugins.some(sent => sent.id === plugin.id)), localId);
    } catch (error: any) {
      update(next => { const thread = next.threads.find(item => item.id === localId); if (thread) thread.messages = thread.messages.filter(item => item.id !== messageId); });
      setNotice(`${runningTurnId ? '追加指令失败' : '发送失败'}：${error.message || error}`);
    } finally {
      sendingRef.current.delete(lockId);
      setPendingThreads(previous => previous.filter(id => id !== localId));
    }
  };
  const retryFailedTurn = (failureId: string) => {
    const thread = state.threads.find(item => item.id === state.activeThreadId);
    const failure = thread?.messages.find(message => message.id === failureId && message.role === 'system' && message.id.startsWith('error-'));
    const turnId = failure?.id.slice('error-'.length);
    const source = turnId ? thread?.messages.find(message => message.role === 'user' && message.turnId === turnId) : undefined;
    if (!thread || !failure || !source || pending || runningTurnId || input || attachments.length || composerSkills.length || composerPlugins.length || savingImages) return;
    setInput(source.content);
    setAttachments(source.attachments || []);
    setComposerSkills(source.skills || []);
    setComposerPlugins((source.plugins || []).map(plugin => ({ id: plugin.id, name: plugin.name, installed: true, enabled: true, marketplaceName: '历史消息' } as Plugin)));
    setNotice('已恢复失败回合，请检查草稿后重新发送。');
  };
  const changeThreadPermission = async (permission: DesktopState['permission']) => {
    const thread = active;
    if (!thread?.remoteId || pending || runningTurnId || codexStatus !== 'connected' || sendingRef.current.has(thread.id)) return;
    sendingRef.current.add(thread.id);
    setPendingThreads(previous => [...previous, thread.id]);
    update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) target.effectivePermissions = undefined; });
    try {
      const settings = await threadStore.changePermission({ id: thread.id, remoteId: thread.remoteId }, permission);
      update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) { target.effectivePermissions = settings; target.requestedPermission = permission; } });
      audit.record('修改会话权限', permission);
    } catch (error: any) { setNotice(`修改权限失败：${error.message}`); }
    finally { sendingRef.current.delete(thread.id); setPendingThreads(previous => previous.filter(id => id !== thread.id)); }
  };
  const cancel = () => {
    queue.change(items => items.map(item => item.localId === active?.id ? { ...item, status: 'paused', error: '已停止，队列暂停。' } : item));
    void interruption.cancel();
  };
  const changeThreadProvider = async (providerId: string) => {
    const thread = active;
    if (!thread?.remoteId) { setNewThreadProviderId(providerId); return; }
    if (providerId === thread.providerId || pending || runningTurnId || thread.status === 'running' || sendingRef.current.has(thread.id) || queue.read().some(item => item.localId === thread.id)) return;
    sendingRef.current.add(thread.id); setPendingThreads(previous => [...previous, thread.id]);
    try {
      const targetCatalog = await window.desktop?.listModels?.({ providerId });
      const models = modelCatalogIds(targetCatalog);
      const model = models.includes(activeModel) ? activeModel : models[0];
      const result = await threadStore.switchProvider({ id: thread.id, remoteId: thread.remoteId }, providerId, model);
      update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) { target.providerId = result.providerId; target.model = result.model; target.effectivePermissions = result.permissions; } });
      audit.record('会话渠道已切换', thread.remoteId); toast('会话渠道已切换');
    } catch (error: any) { setNotice(`切换会话渠道失败：${error.message}`); }
    finally { sendingRef.current.delete(thread.id); setPendingThreads(previous => previous.filter(id => id !== thread.id)); }
  };
  const newChat = () => { closeNarrowSidebar(); setRemoteThreadId(undefined); update(next => createThread(next)); audit.record('新建会话'); setPage('chat'); };
  const forgetProject = (id: string) => {
    if (!state.projects.some(project => project.id === id)) return;
    update(next => { removeRecentProject(next, id); }); audit.record('移除最近项目');
  };
  const changeProject = (project: Project) => {
    update(next => {
      if (!next.projects.some(item => item.id === project.id)) next.projects.push(project);
      next.activeProjectId = project.id;
      const thread = createThread(next);
      thread.projectId = project.id;
      thread.cwd = project.path;
    });
    audit.record('切换项目');
    setPage('chat');
  };
  useAppShortcuts({
    files: () => { setFilesOpen(true); setGitOpen(false); requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[aria-label="查找工作区文件"]')?.focus()); },
    palette: () => setPaletteOpen(true),
    newChat: () => { newChat(); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="消息"]')?.focus()); },
    search: () => { setSidebarVisible(true); setShowSearch(true); requestAnimationFrame(() => document.getElementById('sidebar-search')?.focus()); },
    composer: () => { closeNarrowSidebar(); setPage('chat'); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="消息"]')?.focus()); },
  });
  const selectThread = async (thread: DesktopState['threads'][number]) => { closeNarrowSidebar(); update(next => { next.activeThreadId = thread.id; const selected = next.threads.find(item => item.id === thread.id); if (selected) delete selected.unread; }); audit.record('切换会话', thread.id); setPage('chat'); };
  useEffect(() => {
    const threadId = active?.remoteId;
    if (!threadId || codexStatus !== 'connected' || pendingThreads.includes(active.id)) return;
    let disposed = false;
    const revision = runtime.read(threadId)?.revision || 0;
    const transcriptVersion = transcriptVersions.current.get(threadId) || 0;
    setRestoringThread(threadId);
    update(next => { const thread = next.threads.find(item => item.remoteId === threadId); if (thread) thread.effectivePermissions = undefined; });
    void (async () => {
      try {
        const loaded = await threadStore.resume(threadId);
        if (disposed) return;
        const { items, running } = loaded;
        setRestoreErrors(previous => { const next = { ...previous }; delete next[threadId]; return next; });
        if (loaded.providerId) update(next => { const thread = next.threads.find(item => item.remoteId === threadId); if (thread) thread.providerId = loaded.providerId; });
        // Only use a snapshot that predates no live turn events.
        if ((runtime.read(threadId)?.revision || 0) !== revision) return;
        runtime.apply(threadId, { type: 'restore', turnId: running?.id, revision });
        update(next => {
          const thread = next.threads.find(item => item.remoteId === threadId);
          if (!thread) return;
          thread.effectivePermissions = loaded.permissions;
          if (!thread.model && typeof loaded.model === 'string' && loaded.model) thread.model = loaded.model;
          if (!thread.reasoningEffort) {
            if (loaded.reasoningEffort) thread.reasoningEffort = loaded.reasoningEffort;
          }
          if (loaded.daybreakEnabled !== undefined) thread.daybreakEnabled = loaded.daybreakEnabled;
          if (loaded.cwd) thread.cwd = loaded.cwd;
          if (items.length && (transcriptVersions.current.get(threadId) || 0) === transcriptVersion) thread.messages = restoreMessages(items, thread.messages);
          thread.status = running ? 'running' : 'completed';
          ensureThreadTitle(thread);
        });
      } catch (error: any) { if (!disposed) {
        setRestoreErrors(previous => ({ ...previous, [threadId]: error.message || String(error) }));
        queue.pauseThread(active.id);
      } }
      finally { if (!disposed) setRestoringThread(current => current === threadId ? undefined : current); }
    })();
    return () => { disposed = true; setRestoringThread(current => current === threadId ? undefined : current); };
  }, [active?.remoteId, codexStatus, restoreAttempt]);
  const respondApproval = async (decision: string, answers?: UserAnswers, content?: Record<string, unknown>, target = approval) => {
    const approval = target;
    if (!approval) return;
    if (!await serverResponses.send(approval, decision, answers, content)) return;
    audit.record('处理服务请求', `${approval.method} · ${decision}`);
    setApprovals(pending => pending.filter(item => item !== approval));
  };
  const loadFullHistory = async (options?: HistoryReadOptions) => {
    const thread = active;
    if (!thread?.remoteId || codexStatus !== 'connected' || pending || runningTurnId || sendingRef.current.has(thread.id)) throw new Error('请等待会话空闲且连接成功后重试');
    const revision = runtime.read(thread.remoteId)?.revision || 0;
    const transcriptVersion = transcriptVersions.current.get(thread.remoteId) || 0;
    sendingRef.current.add(thread.id);
    setPendingThreads(previous => [...previous, thread.id]);
    try {
      const items = await threadStore.readHistory(thread.remoteId, options);
      options?.signal?.throwIfAborted();
      if (activeThreadRef.current !== thread.id) throw new Error('已切换会话，未应用旧请求');
      if ((runtime.read(thread.remoteId)?.revision || 0) !== revision || (transcriptVersions.current.get(thread.remoteId) || 0) !== transcriptVersion) throw new Error('会话已有新活动，请重新加载历史');
      update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) target.messages = restoreMessages(items, target.messages); });
    } finally { sendingRef.current.delete(thread.id); setPendingThreads(previous => previous.filter(id => id !== thread.id)); }
  };
  const renameActive = () => { if (active) setRenameCandidate({ id: active.id, title: active.title }); };
  const manageGoal = async (operation: 'get' | 'set' | 'clear', input?: { objective: string; status: NonNullable<DesktopState['threads'][number]['goal']>['status']; tokenBudget: number | null }) => {
    const thread = active;
    if (!thread?.remoteId || codexStatus !== 'connected') throw Error('请先连接远端会话');
    if (runningTurnId || thread.status === 'running' || pending || sendingRef.current.has(thread.id)) throw Error('请等待会话空闲后再管理目标');
    sendingRef.current.add(thread.id); setPendingThreads(previous => [...previous, thread.id]);
    try {
      if (operation === 'get') { const goal = await getThreadGoal(thread.remoteId); update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) { if (goal) target.goal = goal; else delete target.goal; } }); toast(goal ? '已读取远端目标' : '远端暂无目标'); }
      if (operation === 'set' && input) { const goal = await setThreadGoal(thread.remoteId, input); if (!goal) throw Error('服务端未返回目标'); update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) target.goal = goal; }); toast('目标已保存'); }
      if (operation === 'clear') { await clearThreadGoal(thread.remoteId); update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) delete target.goal; }); toast('目标已清除'); }
    } catch (error) { toast(`目标操作失败：${error instanceof Error ? error.message : String(error)}`); } finally { sendingRef.current.delete(thread.id); setPendingThreads(previous => previous.filter(id => id !== thread.id)); }
  };
  const reviewActive = async (target: ReviewTarget) => {
    const thread = active;
    if (!thread?.remoteId || codexStatus !== 'connected') { toast('请先连接远端会话'); return; }
    if (runningTurnId || thread.status === 'running' || pending || sendingRef.current.has(thread.id)) { toast('请等待会话空闲后再开始审查'); return; }
    sendingRef.current.add(thread.id); setPendingThreads(previous => [...previous, thread.id]);
    try { const result = await startReview(thread.remoteId, target); setReviewOpen(false); toast(`代码审查已开始（回合 ${result.turnId}）`); }
    catch (error) { toast(`代码审查失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { sendingRef.current.delete(thread.id); setPendingThreads(previous => previous.filter(id => id !== thread.id)); }
  };
  const changeMemoryMode = async (mode: 'enabled' | 'disabled') => {
    const thread = active;
    if (!thread?.remoteId || codexStatus !== 'connected' || pending || runningTurnId || thread.status === 'running') { toast('请等待会话空闲且连接成功后修改记忆模式'); return; }
    if (sendingRef.current.has(thread.id)) return;
    sendingRef.current.add(thread.id); setPendingThreads(previous => [...previous, thread.id]);
    try { await setThreadMemoryMode(thread.remoteId, mode); update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) target.memoryMode = mode; }); toast(mode === 'enabled' ? '会话记忆已启用' : '会话记忆已停用'); }
    catch (error) { toast(`记忆模式修改失败：${error instanceof Error ? error.message : String(error)}`); }
    finally { sendingRef.current.delete(thread.id); setPendingThreads(previous => previous.filter(id => id !== thread.id)); }
  };
  const resetAllMemory = async () => {
    if (codexStatus !== 'connected' || serviceInUse) { toast('请等待所有会话空闲且连接成功后清除记忆'); return; }
    if (!window.confirm('清除 Codex 记忆？这会影响所有会话，且无法撤销。')) return;
    try { await resetMemory(); toast('Codex 记忆已清除'); } catch (error) { toast(`清除记忆失败：${error instanceof Error ? error.message : String(error)}`); }
  };
  const refreshRateLimits = async () => {
    if (codexStatus !== 'connected') { toast('请先连接工作区服务'); return; }
    try { setRateLimits(await readAccountRateLimits()); toast('额度已刷新'); } catch (error) { toast(`读取额度失败：${error instanceof Error ? error.message : String(error)}`); }
  };
  const refreshAccountUsage = async () => {
    if (codexStatus !== 'connected') { toast('请先连接工作区服务'); return; }
    try { setAccountUsage(await readAccountTokenUsage()); toast('账户用量已刷新'); } catch (error) { toast(`读取账户用量失败：${error instanceof Error ? error.message : String(error)}`); }
  };
  const refreshAccountInfo = async () => {
    if (codexStatus !== 'connected') { toast('请先连接工作区服务'); return; }
    try { setAccountInfo(await readAccount()); toast('账户信息已刷新'); } catch (error) { toast(`读取账户信息失败：${error instanceof Error ? error.message : String(error)}`); }
  };
  const refreshServerDiagnostics = async () => {
    if (codexStatus !== 'connected') { toast('请先连接工作区服务'); return; }
    try { setServerDiagnostics(await readServerDiagnosticsInfo()); toast('服务诊断已刷新'); } catch (error) { toast(`刷新服务诊断失败：${error instanceof Error ? error.message : String(error)}`); }
  };
  const refreshThreadSections = async () => { if (codexStatus !== 'connected') { toast('请先连接工作区服务'); return; } try { setThreadSections(await listThreadSections()); toast('分组已刷新'); } catch (error) { toast(`读取分组失败：${error instanceof Error ? error.message : String(error)}`); } };
  useEffect(() => {
    if (codexStatus !== 'connected') { setThreadSections([]); return; }
    void listThreadSections().then(setThreadSections).catch(() => { /* 设置页提供显式重试 */ });
  }, [codexStatus]);
  const createSection = async (name: string, appearance?: import('./threadSections').ThreadSectionAppearance) => { try { const section = await createThreadSection(name, appearance); setThreadSections(current => [...current, section]); toast('分组已创建'); } catch (error) { toast(`创建分组失败：${error instanceof Error ? error.message : String(error)}`); } };
  const updateSection = async (id: string, name: string, appearance?: import('./threadSections').ThreadSectionAppearance) => { try { const section = await updateThreadSection(id, name, appearance); setThreadSections(current => current.map(item => item.id === id ? section : item)); toast('分组名称已更新'); } catch (error) { toast(`更新分组失败：${error instanceof Error ? error.message : String(error)}`); } };
  const deleteSection = async (id: string) => { try { await deleteThreadSection(id); setThreadSections(current => current.filter(section => section.id !== id)); update(next => next.threads.forEach(thread => { if (thread.sectionId === id) delete thread.sectionId; })); toast('分组已删除'); } catch (error) { toast(`删除分组失败：${error instanceof Error ? error.message : String(error)}`); } };
  const moveActiveSection = async (sectionId: string | null) => { if (!active?.remoteId) return; try { await moveThreadSection(active.remoteId, sectionId); update(next => { const thread = next.threads.find(item => item.id === active.id); if (thread) { if (sectionId) thread.sectionId = sectionId; else delete thread.sectionId; } }); toast('会话分组已更新'); } catch (error) { toast(`移动会话失败：${error instanceof Error ? error.message : String(error)}`); } };
  const revertFromMessage = async (messageId: string) => {
    const thread = active;
    if (!thread?.remoteId || codexStatus !== 'connected') throw Error('请先连接远端会话');
    if (runningTurnId || thread.status === 'running' || pending || sendingRef.current.has(thread.id)) throw Error('请等待会话空闲后再回退');
    const message = thread.messages.find(item => item.id === messageId);
    if (!message?.turnId) throw Error('无法定位该回复的回合，请先重新加载会话');
    sendingRef.current.add(thread.id); setPendingThreads(previous => [...previous, thread.id]);
    try {
      await revertThread(thread.remoteId, message.turnId);
      const items = await threadStore.readHistory(thread.remoteId);
      update(next => { const target = next.threads.find(item => item.id === thread.id); if (target) { target.messages = restoreMessages(items, []); target.status = 'completed'; delete target.plan; delete target.planDelta; delete target.turnDiff; } });
      runtime.apply(thread.remoteId, { type: 'restore', revision: runtime.read(thread.remoteId)?.revision || 0 });
      toast('会话已回退');
    } finally { sendingRef.current.delete(thread.id); setPendingThreads(previous => previous.filter(id => id !== thread.id)); }
  };
  const renameThread = async (name: string) => {
    const thread = state.threads.find(item => item.id === renameCandidate?.id);
    if (!thread) throw Error('会话已不存在，请关闭后重试。');
    if (thread.remoteId) {
      if (codexStatus !== 'connected') throw Error('请重新连接服务后重试。');
    }
    await threadStore.rename(thread, name);
    audit.record('重命名会话');
  };
  const archiveConversation = async (threadId: string) => {
    const thread = state.threads.find(item => item.id === threadId);
    if (!thread || thread.archived || archiveLocks.current.has(threadId)) return;
    if (thread.remoteId && codexStatus !== 'connected') { toast('请重新连接服务后再归档或删除远端会话。'); return; }
    if (sendingRef.current.has(threadId)) { toast('请等待会话操作完成后再归档。'); return; }
    archiveLocks.current.add(threadId);
    sendingRef.current.add(threadId);
    setPendingThreads(previous => [...previous, threadId]);
    try {
      if (queue.read().some(item => item.localId === threadId) && !queue.pauseThread(threadId)) throw Error('排队消息暂停未能保存，请重试保存队列后再归档。');
      await threadStore.archive(thread);
      audit.record('归档会话', thread.id);
      setRemoteThreadId(value => value === thread.remoteId ? undefined : value);
    } catch (error) { toast(`归档失败：${error instanceof Error ? error.message : String(error)}`); }
    finally {
      archiveLocks.current.delete(threadId);
      sendingRef.current.delete(threadId);
      setPendingThreads(previous => previous.filter(id => id !== threadId));
    }
  };
  const archiveActive = () => { if (state.activeThreadId) void archiveConversation(state.activeThreadId); };
  const performDelete = async (threadId: string) => {
    const thread = state.threads.find(item => item.id === threadId);
    if (!thread) throw Error('会话已不存在，请关闭后重试。');
    if (thread.remoteId && codexStatus !== 'connected') throw Error('请重新连接服务后再归档或删除远端会话。');
    if (sendingRef.current.has(threadId)) throw Error('请等待会话操作完成后再删除。');
    sendingRef.current.add(threadId);
    setPendingThreads(previous => [...previous, threadId]);
    try {
      if (queue.read().some(item => item.localId === threadId) && !queue.pauseThread(threadId)) throw Error('排队消息暂停未能保存，请重试保存队列后再删除。');
      await threadStore.remove(thread);
      queue.change(items => items.filter(item => item.localId !== threadId));
      audit.record('删除会话');
      setRemoteThreadId(value => value === thread.remoteId ? undefined : value);
    } finally {
      sendingRef.current.delete(threadId);
      setPendingThreads(previous => previous.filter(id => id !== threadId));
    }
  };
  const deleteActive = async () => { const thread = state.threads.find(item => item.id === state.activeThreadId); if (thread) setDeleteCandidate(thread.id); };
  const togglePinned = (threadId: string) => {
    const thread = state.threads.find(item => item.id === threadId);
    if (!thread) return;
    const pinned = !thread.pinned;
    update(next => { const target = next.threads.find(item => item.id === threadId); if (target) target.pinned = pinned; });
    audit.record(pinned ? '置顶会话' : '取消置顶会话');
  };
  const deleteThreadFromSidebar = async (threadId: string) => { if (state.threads.some(item => item.id === threadId)) setDeleteCandidate(threadId); };
  const forkActive = async () => {
    const source = state.threads.find(item => item.id === state.activeThreadId);
    if (forkingRef.current) return;
    if (!source?.remoteId || codexStatus !== 'connected') { toast('当前会话还没有远端线程'); return; }
    if (source.status === 'running' || runningTurnId || pending || sendingRef.current.has(source.id)) { toast('请等待会话空闲后分叉。'); return; }
    forkingRef.current = true; setForking(true);
    sendingRef.current.add(source.id); setPendingThreads(previous => [...previous, source.id]);
    try {
      const result = await threadStore.fork({ id: source.id, remoteId: source.remoteId });
      const copy = fullBranchSnapshot(source, result.id);
      copy.providerId = result.providerId || source.providerId;
      copy.model = activeModel; copy.reasoningEffort = activeEffort;
      copy.effectivePermissions = result.permissions;
      const stillOnSource = activeThreadRef.current === source.id;
      update(next => { next.threads.push(copy); if (stillOnSource) next.activeThreadId = copy.id; });
      if (stillOnSource) setRemoteThreadId(copy.remoteId);
      audit.record('分叉会话', source.id);
      toast('已创建会话分支');
    } catch (error: any) { toast(`分叉失败：${error.message}`); }
    finally {
      forkingRef.current = false; setForking(false);
      sendingRef.current.delete(source.id); setPendingThreads(previous => previous.filter(id => id !== source.id));
    }
  };
  const forkFromMessage = async (messageId: string) => {
    const source = state.threads.find(thread => thread.id === state.activeThreadId);
    if (forkingRef.current) return;
    if (!source?.remoteId || codexStatus !== 'connected') throw new Error('会话尚未连接。');
    if (source.status === 'running' || runningTurnId || pending || sendingRef.current.has(source.id)) throw new Error('请等待会话空闲后分叉。');
    const message = source.messages.find(item => item.id === messageId);
    if (!message) throw new Error('找不到这条回复。');
    forkingRef.current = true; setForking(true);
    sendingRef.current.add(source.id); setPendingThreads(previous => [...previous, source.id]);
    try {
      const turnId = message.turnId || await threadStore.findMessageTurn(source.remoteId, messageId);
      if (!turnId) throw new Error('无法定位回复所在的回合，请重新加载该会话后重试。');
      const result = await threadStore.fork({ id: source.id, remoteId: source.remoteId }, turnId);
      const copy = branchSnapshot(source, messageId, result.id);
      copy.providerId = result.providerId || source.providerId;
      copy.model = activeModel; copy.reasoningEffort = activeEffort;
      copy.effectivePermissions = result.permissions; copy.requestedPermission = undefined;
      const stillOnSource = activeThreadRef.current === source.id;
      update(next => { next.threads.push(copy); if (stillOnSource) next.activeThreadId = copy.id; });
      if (stillOnSource) setRemoteThreadId(copy.remoteId);
      audit.record('分叉会话', source.id);
    } finally {
      // Release the shared fork lock even if loading historical turns failed.
      forkingRef.current = false; setForking(false);
      sendingRef.current.delete(source.id); setPendingThreads(previous => previous.filter(id => id !== source.id));
    }
  };
  const addAttachment = async () => {
    const picked = await window.desktop?.pickFiles?.();
    if (!picked?.length) return;
    const valid: string[] = [];
    for (const path of picked) {
      try {
        const result = await window.desktop?.validateAttachment?.(path);
        if (result && !result.ok) throw Error(result.error || '附件无法读取或解码');
        valid.push(path);
      } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); }
    }
    if (valid.length) setAttachments(current => [...new Set([...current, ...valid])]);
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
    closeNarrowSidebar(); setPage(location.page);
  };
  const openAgent = (id: string) => {
    update(next => {
      let target = next.threads.find(thread => thread.remoteId === id);
      if (!target) { target = { id: `remote-${id}`, remoteId: id, title: `Agent ${id}`, status: 'idle', pinned: false, archived: false, messages: [], updatedAt: new Date().toISOString() }; next.threads.push(target); }
      target.archived = false; next.activeThreadId = target.id;
    });
    setPage('chat');
  };
  const serviceControl = <><section className="settings-card" aria-label="工作区服务连接"><h2>工作区服务</h2><p role="status">服务连接：{codexStatus === 'connected' ? '已连接' : codexStatus === 'connecting' ? '连接中' : '未连接'}</p><p>配置变更后可重启服务并重新连接。{serviceInUse ? '请先等待运行中会话、审批和沙箱设置结束。' : '草稿保留，排队消息会暂停。'}</p><button disabled={serviceInUse || restarting || codexStatus === 'connecting'} onClick={() => { void restartService(); }}>重启并重新连接服务</button><button disabled={serviceInUse || codexStatus !== 'connected'} onClick={() => void resetAllMemory()}>清除 Codex 记忆</button><button disabled={codexStatus !== 'connected'} onClick={() => void refreshAccountInfo()}>刷新账户信息</button><button disabled={codexStatus !== 'connected'} onClick={() => void refreshRateLimits()}>刷新账户额度</button><button disabled={codexStatus !== 'connected'} onClick={() => void refreshAccountUsage()}>刷新账户用量</button><button disabled={codexStatus !== 'connected'} onClick={() => void refreshServerDiagnostics()}>刷新服务诊断</button>{accountInfo && <p role="status">账户：{accountInfo.kind === 'chatgpt' ? `ChatGPT${accountInfo.email ? ` · ${accountInfo.email}` : ''} · ${accountInfo.planType}` : accountInfo.kind === 'apiKey' ? 'API Key' : `Amazon Bedrock${accountInfo.managedCredentials ? ' · 托管凭据' : ''}`}{accountInfo.requiresOpenAiAuth ? ' · 需要 OpenAI 登录' : ''}</p>}{rateLimits && <p role="status">{rateLimits.limitName ? `${rateLimits.limitName}：` : ''}{rateLimits.primary ? `主窗口已用 ${rateLimits.primary.usedPercent}%` : ''}{rateLimits.secondary ? ` · 次窗口已用 ${rateLimits.secondary.usedPercent}%` : ''}</p>}{accountUsage && <p role="status">累计 Token：{accountUsage.summary.lifetimeTokens?.toLocaleString() || '未知'}{accountUsage.summary.currentStreakDays != null ? ` · 连续使用 ${accountUsage.summary.currentStreakDays} 天` : ''} · 最近 {accountUsage.daily.length} 天有记录</p>}{serverDiagnostics && <div aria-label="服务诊断"><p role="status">服务 PID：{serverDiagnostics.process.id} · 常驻内存：{formatBytes(serverDiagnostics.process.residentMemoryBytes)} · 物理占用：{formatBytes(serverDiagnostics.process.physicalFootprintBytes)}</p>{serverDiagnostics.gauges.map(gauge => <p key={gauge.name}>{gauge.name}：{gauge.value.toLocaleString()}</p>)}</div>}</section><AccountAuthPanel connected={codexStatus === 'connected'} busy={serviceInUse} onChanged={() => void refreshAccountInfo()} /></>;
  const feedbackControl = <><FeedbackPanel connected={codexStatus === 'connected'} busy={serviceInUse} threadId={active?.remoteId} /><RemoteProjectsPanel connected={codexStatus === 'connected'} busy={serviceInUse} threadId={active?.remoteId} /><RemoteControlPanel connected={codexStatus === 'connected'} busy={serviceInUse} /><EnvironmentPanel connected={codexStatus === 'connected'} busy={serviceInUse} /></>;
  return <div className={`desktop-app ${effectiveTheme} ${page === 'settings' ? 'settings-mode' : ''} ${terminalOpen ? 'terminal-visible' : ''}`}>
    <ServerWarnings warnings={serverWarnings.warnings} dismiss={serverWarnings.dismiss} />
    {queue.saveFailed && <div role="alert" className="state-save-warning">排队消息未能保存，自动发送已暂停。关闭窗口可能丢失更改或恢复旧队列。<button onClick={queue.retry}>重试保存队列</button></div>}
    {attachmentStorage.readFailed && <div role="alert">附件读取失败，原始数据已保留；当前编辑暂未保存。<button onClick={attachmentStorage.retry}>重试读取附件</button></div>}{attachmentStorage.saveFailed && <div role="alert" className="state-save-warning">附件选择未保存到本机，刷新后可能丢失选择或恢复旧附件。当前仍可编辑和发送。<button onClick={attachmentStorage.retry}>重试保存附件</button></div>}
    {stateSaveFailed && <div role="alert" className="state-save-warning">会话和设置未能保存到本机，刷新或关闭窗口可能丢失当前更改。<button onClick={retrySave}>重试保存会话和设置</button></div>}
    {renameCandidate && <RenameThread key={renameCandidate.id} title={renameCandidate.title} onSave={renameThread} onClose={() => setRenameCandidate(undefined)} />}
    {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} commands={[
      { id: 'new', label: '新建会话', keywords: 'new chat', run: () => { newChat(); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="消息"]')?.focus()); } },
      { id: 'search', label: '搜索会话', keywords: 'search history', run: () => { setSidebarVisible(true); setShowSearch(true); requestAnimationFrame(() => document.getElementById('sidebar-search')?.focus()); } },
      { id: 'files', label: '浏览工作区文件', keywords: 'files workspace', run: () => { setFilesOpen(true); setGitOpen(false); } },
      { id: 'git', label: '查看 Git 变更', keywords: 'diff commit branch', run: () => { setGitOpen(true); setFilesOpen(false); } },
      { id: 'terminal', label: '打开终端', keywords: 'terminal shell', run: () => { setTerminalStarted(true); setTerminalOpen(true); } },
      { id: 'plugins', label: '浏览插件', keywords: 'plugins skills mcp', run: () => { closeNarrowSidebar(); setPage('plugins'); } },
      { id: 'scheduled', label: '查看已安排任务', keywords: 'scheduled automation', run: () => { closeNarrowSidebar(); setPage('scheduled'); } },
      { id: 'settings', label: '打开设置', keywords: 'settings provider', run: () => { closeNarrowSidebar(); setPage('settings'); } },
      { id: 'archives', label: '查看归档会话', keywords: 'archive', run: () => setArchivesOpen(true) },
      { id: 'browser', label: '打开远程桌面', keywords: 'browser remote desktop', run: () => setBrowserOpen(true) },
      { id: 'rename', label: '重命名当前会话', keywords: 'rename conversation', disabled: !active || Boolean(active.remoteId) && codexStatus !== 'connected', run: renameActive },
      { id: 'pin', label: active?.pinned ? '取消置顶当前会话' : '置顶当前会话', keywords: 'pin conversation', disabled: !active, run: () => { if (active) togglePinned(active.id); } },
      { id: 'fork', label: '分叉当前会话', keywords: 'fork branch conversation', disabled: !active?.remoteId || codexStatus !== 'connected' || forking || pending || Boolean(runningTurnId) || active.status === 'running', run: () => void forkActive() },
      { id: 'stop', label: '停止当前回合', keywords: 'stop interrupt turn', disabled: !active?.remoteId || !runningTurnId || codexStatus !== 'connected', run: cancel },
      ...state.projects.map(project => ({
        id: `project-${project.id}`, label: `在项目中新建会话：${projectLabel(project.name)}`,
        description: `${project.environment === 'worktree' ? '工作树' : '本地'} · ${project.path || '未指定工作区'}`, keywords: 'project workspace new chat',
        run: () => { changeProject(project); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="消息"]')?.focus()); },
      })),
      ...state.threads.filter(thread => !thread.archived).slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map(thread => ({
        id: `thread-${thread.id}`, label: `打开会话：${thread.title}`, description: `${thread.id === state.activeThreadId ? '当前会话 · ' : ''}${workspaceFor(state, thread) || '未指定工作区'}`, keywords: 'conversation thread',
        run: () => { void selectThread(thread); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="消息"]')?.focus()); },
      })),
    ]} />}
    <header className="desktop-titlebar">
      <div className="titlebar-navigation">
        <button className="titlebar-icon" aria-label={sidebarVisible ? '收起侧栏' : '展开侧栏'} title={sidebarVisible ? '收起侧栏' : '展开侧栏'} aria-expanded={sidebarVisible} aria-controls="workspace-sidebar" onClick={() => setSidebarVisible(value => !value)}><PanelLeft aria-hidden="true" /></button>
        <button className="titlebar-icon" aria-label="后退" title="后退" disabled={!navigation.canGoBack} onClick={() => navigateHistory(-1)}><ArrowLeft aria-hidden="true" /></button>
        <button className="titlebar-icon" aria-label="前进" title="前进" disabled={!navigation.canGoForward} onClick={() => navigateHistory(1)}><ArrowRight aria-hidden="true" /></button>
      </div>
      <button aria-label="浏览工作区文件" aria-expanded={filesOpen} onClick={() => setFilesOpen(value => !value)}><FolderOpen size={17} /></button><button aria-label="查看 Git 变更" aria-expanded={gitOpen} onClick={() => { setGitOpen(value => !value); setFilesOpen(false); }}><GitBranch size={17} /></button><button aria-label="打开终端" title="终端" aria-expanded={terminalOpen} onClick={() => { if (!terminalStarted) { setTerminalStarted(true); } setTerminalOpen(value => !value); }}><Terminal size={17} /></button><button aria-label="打开命令面板" title="命令面板（Ctrl/⌘+Shift+P）" onClick={() => setPaletteOpen(true)}>命令</button><AppMenus groups={[
        { label: '文件', actions: [
          { label: '新建会话', run: newChat },
          { label: '浏览工作区文件', run: () => { setFilesOpen(true); setGitOpen(false); } },
          { label: '查看归档会话', run: () => setArchivesOpen(true) },
        ] },
        { label: '编辑', actions: [
          { label: '聚焦消息输入', run: () => { closeNarrowSidebar(); setPage('chat'); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="消息"]')?.focus()); } },
          { label: '搜索会话', run: () => { setSidebarVisible(true); setShowSearch(true); requestAnimationFrame(() => document.getElementById('sidebar-search')?.focus()); } },
          { label: '重命名当前会话', disabled: !active || Boolean(active.remoteId) && codexStatus !== 'connected', run: renameActive },
        ] },
        { label: '视图', actions: [
          { label: sidebarVisible ? '收起侧栏' : '展开侧栏', run: () => setSidebarVisible(value => !value) },
          { label: '查看 Git 变更', run: () => { setGitOpen(true); setFilesOpen(false); } },
          { label: terminalOpen ? '隐藏终端' : '打开终端', run: () => { setTerminalStarted(true); setTerminalOpen(value => !value); } },
          { label: '浏览插件', run: () => { closeNarrowSidebar(); setPage('plugins'); } },
          { label: '查看已安排任务', run: () => { closeNarrowSidebar(); setPage('scheduled'); } },
        ] },
        { label: '帮助', actions: [
          { label: '打开命令面板', run: () => setPaletteOpen(true) },
          { label: '打开设置', run: () => { closeNarrowSidebar(); setPage('settings'); } },
        ] },
      ]} /><button className="remote-browser-toggle" aria-label="浏览器" title="浏览器" aria-expanded={browserOpen} aria-controls="remote-browser" onClick={() => setBrowserOpen(value => !value)}><Globe size={17} /></button><WindowControls />
    </header>
    {codexStatus !== 'connected' && <div className="connection-banner" role="status"><span>{codexStatus === 'connecting' ? '正在连接工作区…' : '工作区连接已断开，草稿已保留。'}{connectionError && ` ${connectionError}`}</span><button disabled={codexStatus === 'connecting'} onClick={() => reconnectRef.current()}>重新连接</button></div>}
    <div className="desktop-body"><aside id="workspace-sidebar" className="sidebar" aria-label="侧栏" hidden={!sidebarVisible}>
      <div className="brand-row"><ModePicker mode={state.mode} onChange={mode => update(next => { next.mode = mode; })} /><button className="sidebar-search-toggle" aria-label="搜索" title="搜索会话" aria-expanded={showSearch} aria-controls="sidebar-search" onClick={() => { setShowSearch(value => !value); setSearch(''); }}><Search aria-hidden="true" /></button></div>
      {showSearch && <input id="sidebar-search" autoFocus className="side-search" aria-label="搜索最近会话" placeholder="搜索会话标题或内容" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setShowSearch(false); setSearch(''); } }} />}
      <button className="sidebar-nav" onClick={() => { newChat(); closeNarrowSidebar(); }}><SquarePen aria-hidden="true" /><span>新对话</span></button>
      {showSearch && <small>搜索未归档会话；离线时仅匹配本机已加载内容。</small>}
      <button className="sidebar-nav" aria-current={page === 'scheduled' ? 'page' : undefined} onClick={() => { setPage('scheduled'); closeNarrowSidebar(); }}><Clock3 aria-hidden="true" /><span>已安排</span></button>
      <button className="sidebar-nav" aria-current={page === 'plugins' ? 'page' : undefined} onClick={() => { setPage('plugins'); closeNarrowSidebar(); }}><Puzzle aria-hidden="true" /><span>插件</span></button>
      <div className="sidebar-scroll">
        <section aria-labelledby="sidebar-projects"><h2 id="sidebar-projects" className="section">项目</h2>
          {state.activeProjectId ? <div className="sidebar-project" title={projectLabel(state.projects.find(project => project.id === state.activeProjectId)?.name ?? state.activeProjectId)}><FolderOpen aria-hidden="true" /><span>{projectLabel(state.projects.find(project => project.id === state.activeProjectId)?.name ?? state.activeProjectId)}</span></div> : <div className="empty">没有项目</div>}
        </section>
        <section aria-labelledby="sidebar-recent"><h2 id="sidebar-recent" className="section">最近</h2>
          {threadSections.map(section => {
            const sectionThreads = threadsBySection.get(section.id) || [];
            if (!sectionThreads.length) return null;
            return <div key={section.id} className="thread-section"><h3 className="section thread-section-heading">{section.name}</h3>{sectionThreads.map(thread => <div key={thread.id}><ThreadButton thread={thread} selected={page === 'chat' && state.activeThreadId === thread.id} onSelect={() => { void selectThread(thread); closeNarrowSidebar(); }} onTogglePin={() => togglePinned(thread.id)} onArchive={() => { void archiveConversation(thread.id); }} onDelete={() => { void deleteThreadFromSidebar(thread.id); }} />{search.trim() && thread.remoteId && threadList.snippets[thread.remoteId] && <p className="thread-search-snippet">{threadList.snippets[thread.remoteId].slice(0, 300)}</p>}</div>)}</div>;
          })}
          {(threadsBySection.get('') || []).map(thread => <div key={thread.id}><ThreadButton thread={thread} selected={page === 'chat' && state.activeThreadId === thread.id} onSelect={() => { void selectThread(thread); closeNarrowSidebar(); }} onTogglePin={() => togglePinned(thread.id)} onArchive={() => { void archiveConversation(thread.id); }} onDelete={() => { void deleteThreadFromSidebar(thread.id); }} />{search.trim() && thread.remoteId && threadList.snippets[thread.remoteId] && <p className="thread-search-snippet">{threadList.snippets[thread.remoteId].slice(0, 300)}</p>}</div>)}
          {threads.length === 0 && !threadList.loading && !threadList.error && <div className="empty">{search ? '没有匹配的会话' : '暂无会话'}</div>}
          {threadList.error && <p role="alert">{threadList.error}</p>}
          {(threadList.hasMore || threadList.error || threadList.loading) && <button disabled={threadList.loading || codexStatus !== 'connected'} onClick={() => void threadList.loadMore()}>{threadList.loading ? '正在加载会话…' : threadList.error ? '重试加载会话' : '加载更多会话'}</button>}
        </section>
      </div>
      <div className="sidebar-footer"><button onClick={() => setArchivesOpen(true)}>归档会话</button><button className="sidebar-nav" aria-current={page === 'settings' ? 'page' : undefined} onClick={() => { setPage('settings'); closeNarrowSidebar(); }}><Badge aria-hidden="true" /><span>设置</span></button></div>
    </aside>
      <main>{nonblockingQuestions.map(request => <details key={request.uiKey} className="async-question"><summary>待回答问题 · {state.threads.find(thread => thread.remoteId === request.params?.threadId)?.title || request.params?.threadId || '会话'}</summary><p>你可以继续操作，提交后回答将发送到此问题所属会话。</p><UserInputDialog inline request={request} onDecision={(decision, answers) => respondApproval(decision, answers, undefined, request)} /></details>)}{pluginStorage.readFailed && <div role="alert">插件选择读取失败，原始数据已保留；当前编辑暂未保存。<button onClick={pluginStorage.retry}>重试读取插件选择</button></div>}{pluginStorage.saveFailed && <div role="alert">插件选择未保存到本机，关闭窗口可能丢失。<button onClick={pluginStorage.retry}>重试保存插件选择</button></div>}{skillStorage.readFailed && <div role="alert">技能草稿读取失败，原始数据已保留；新选择暂未保存。<button onClick={skillStorage.retry}>重试读取技能选择</button></div>}{skillStorage.saveFailed && <div role="alert">技能选择未保存到本机，刷新或关闭窗口可能丢失。<button onClick={skillStorage.retry}>重试保存技能选择</button></div>}{draftStorage.readFailed && <div role="alert">消息草稿读取失败，原始数据已保留；当前编辑暂未保存。<button onClick={draftStorage.retry}>重试读取消息草稿</button></div>}{draftStorage.saveFailed && <div role="alert">草稿未能保存到本机，刷新或关闭窗口可能丢失。当前仍可编辑和发送。<button onClick={draftStorage.retry}>重试保存草稿</button></div>}{page === 'chat' && <><div className="planning-controls"><label>会话渠道 <select aria-label="会话渠道" value={active?.providerId || newThreadProviderId || ''} disabled={Boolean(runningTurnId) || active?.status === 'running' || pending || Boolean(active?.remoteId) && (codexStatus !== 'connected' || queue.items.some(item => item.localId === active?.id))} onChange={event => void changeThreadProvider(event.target.value)}>{providerChoices.map(provider => <option key={provider.id} value={provider.id}>{provider.name}{provider.enabled ? ' · 当前启用' : ''}</option>)}</select></label><label>协作模式 <select aria-label="协作模式" value={active?.planningMode || 'default'} disabled={Boolean(runningTurnId) || pending} onChange={event => { const mode = event.target.value as 'default' | 'plan'; update(next => { const thread = next.threads.find(item => item.id === next.activeThreadId) || createThread(next); thread.planningMode = mode; }); }}><option value="default">直接执行</option><option value="plan">先规划</option></select></label><label>会话记忆 <select aria-label="会话记忆" value={active?.memoryMode || ''} disabled={Boolean(runningTurnId) || pending || codexStatus !== 'connected' || !active?.remoteId} onChange={event => void changeMemoryMode(event.target.value as 'enabled' | 'disabled')}><option value="">未设置</option><option value="enabled">启用</option><option value="disabled">停用</option></select></label><label>Daybreak <select aria-label="Daybreak" value={active?.daybreakEnabled == null ? '' : active.daybreakEnabled ? 'enabled' : 'disabled'} disabled={Boolean(runningTurnId) || pending || codexStatus !== 'connected' || !active?.remoteId} onChange={event => { const value = event.target.value; if (!active?.remoteId || value === '') return; void updateThreadDaybreak(active.remoteId, value === 'enabled').then(() => update(next => { const thread = next.threads.find(item => item.id === active.id); if (thread) thread.daybreakEnabled = value === 'enabled'; })).catch(error => toast(`保存 Daybreak 设置失败：${error instanceof Error ? error.message : String(error)}`)); }}><option value="">未设置</option><option value="enabled">启用</option><option value="disabled">停用</option></select></label>{active?.planningMode === 'plan' && <span>先讨论方案，再切换执行</span>}{active?.planningMode === 'plan' && active.messages.some(message => message.id.startsWith('plan-')) && <button title={input.trim() ? '请先发送或清空当前草稿' : '准备执行计划的指令'} disabled={Boolean(runningTurnId) || pending || Boolean(input.trim())} onClick={() => { update(next => { const thread = next.threads.find(item => item.id === next.activeThreadId); if (thread) thread.planningMode = 'default'; }); setInput('请按照刚才确认的计划逐步实现，并验证结果。'); }}>按计划执行</button>}</div><ThreadGoalPanel goal={active?.goal} busy={pending || Boolean(runningTurnId) || codexStatus !== 'connected'} onGet={() => manageGoal('get')} onSet={input => manageGoal('set', input)} onClear={() => manageGoal('clear')} /><PlanPanel plan={active?.plan} delta={active?.planDelta} /><TurnDiffPanel value={active?.turnDiff} /></>}{page === 'chat' && <><TurnQueue catalog={catalog} onMove={(id, direction) => queue.change(items => moveQueuedTurn(items, id, direction), true)} onPause={() => { if (active) queue.pauseThread(active.id); }} onBeginEdit={id => { const item = queue.read().find(item => item.id === id); return !!item && item.status !== 'sending' && queue.change(items => items.map(item => item.id === id ? { ...item, status: 'paused', error: '编辑已暂停此消息，请继续队列。' } : item), true); }} onEdit={(id, text, attachments, configuration) => { const item = queue.read().find(item => item.id === id); return !!item && item.status === 'paused' && queue.change(items => items.map(item => item.id === id ? { ...item, text, attachments, ...configuration } : item), true); }} items={queue.items.filter(item => item.localId === active?.id)} disabled={codexStatus !== 'connected' || pending} onRemove={id => queue.change(items => items.filter(item => item.id !== id))} onResume={() => queue.change(items => items.map(item => item.localId === active?.id && item.status === 'paused' ? { ...item, status: runningTurnId ? 'waiting' : 'ready', waitingOn: runningTurnId, error: undefined } : item))} />{runningTurnId && <button className="queue-message" disabled={(!input.trim() && !attachments.length && !composerSkills.length) || pending || codexStatus !== 'connected' || catalog.loading || effortUnsupported} onClick={enqueue}>本轮完成后发送</button>}</>}{!!active?.messages.length && page === 'chat' && <div className="thread-toolbar global-thread-toolbar"><span>{active.title}</span><div><ConversationExport repository={threadStore} thread={active} connected={codexStatus === 'connected'} busy={pending || Boolean(runningTurnId)} toast={toast} /><button disabled={pending || Boolean(runningTurnId) || codexStatus !== 'connected' || !active.remoteId} onClick={() => setReviewOpen(true)}>审查变更</button><button onClick={renameActive}>重命名</button><button disabled={forking || pending || Boolean(runningTurnId) || active.status === 'running' || codexStatus !== 'connected' || !active.remoteId} onClick={forkActive}>{forking ? '正在分叉…' : '分叉'}</button><button onClick={archiveActive}>归档</button><button onClick={deleteActive}>删除</button></div></div>}{page === 'chat' ? <ArtifactOpenContext.Provider value={setArtifactTarget}><ArtifactWorkspaceContext.Provider value={workspaceFor(state, active)}><>{restoreError && <section role="alert" aria-label="会话恢复失败"><p>恢复会话失败：{restoreError}</p><p>草稿已保留，恢复成功后可继续发送。</p><button disabled={codexStatus !== 'connected' || restoringThread === active?.remoteId} onClick={() => setRestoreAttempt(value => value + 1)}>重试恢复会话</button></section>}</><>{interruption.error && <p role="alert">{interruption.error} 可再次点击停止生成重试。</p>}</>{active?.remoteId && <BackgroundTerminals onTerminated={() => audit.record('终止后台命令')} key={active.remoteId} threadId={active.remoteId} connected={codexStatus === 'connected'} />}<RelatedThreads threads={state.threads} active={active} onSelect={selectThread} /><Chat compaction={compaction} stopping={interruption.pending} savingImages={savingImages} onPasteImages={pasteAttachments} onDropAttachments={paths => setAttachments(current => [...new Set([...current, ...paths])])} loadFullHistory={loadFullHistory} onChangePermission={changeThreadPermission} onRetryFailure={retryFailedTurn} sendShortcut={state.sendShortcut} composerSkills={composerSkills} setComposerSkills={setComposerSkills} onOpenAgent={openAgent} removeAttachment={path => setAttachments(current => current.filter(item => item !== path))} busy={pending} mode={state.mode} permission={state.permission} onOpenPlugins={() => setPage('plugins')} composerPlugins={composerPlugins} setComposerPlugins={setComposerPlugins} active={active} input={input} setInput={setInput} send={send} cancel={cancel} running={Boolean(runningTurnId)} activity={activity} model={activeModel} reasoningEffort={activeEffort} catalog={catalog} update={update} attachments={attachments} addAttachment={addAttachment} showModel={showModel} setShowModel={setShowModel} showProjects={showProjects} setShowProjects={setShowProjects} toast={toast} projectId={state.activeProjectId} projects={state.projects} status={codexStatus} onForkMessage={forkFromMessage} onRevertMessage={revertFromMessage} onProjectChange={changeProject} onRemoveProject={forgetProject} /></ArtifactWorkspaceContext.Provider></ArtifactOpenContext.Provider> : page === 'scheduled' ? <ScheduledPage onRecord={audit.record} onOpenConversation={(threadId, title) => { update(next => { selectNotifiedThread(next, threadId, title); }); setPage('chat'); }} onOpenHandled={request => setTaskOpenRequest(current => current === request ? undefined : current)} openRequest={taskOpenRequest} onBack={() => setPage('chat')} cwd={workspaceFor(state, active)} providers={providerChoices} /> : page === 'plugins' ? <ExtensionsPage onSelectSkill={skill => { setComposerSkills(current => current.some(item => item.path === skill.path) ? current : [...current, skill]); setPage('chat'); }} cwd={workspaceFor(state, active)} onAddToDraft={text => { setInput(current => current ? `${current}\n\n${text}` : text); setPage('chat'); }} connected={codexStatus === 'connected'} threadId={active?.remoteId} /> : <Workspace audit={audit} serviceControl={<>{serviceControl}{feedbackControl}</>} page={page} state={state} models={availableModels} update={update} toast={toast} providerStatus={providerStatus} sectionProps={{ sections: threadSections, activeThreadId: active?.id, activeRemoteId: active?.remoteId, onRefresh: refreshThreadSections, onCreate: createSection, onUpdate: updateSection, onDelete: deleteSection, onMove: moveActiveSection, busy: codexStatus !== 'connected' }} onBack={() => { setPage('chat'); setSidebarVisible(!window.matchMedia('(max-width: 760px)').matches); }} />}</main>
      {reviewOpen && <ReviewDialog busy={pending || Boolean(runningTurnId)} onClose={() => setReviewOpen(false)} onSubmit={reviewActive} />}`n      <RemoteBrowser open={browserOpen} onClose={() => setBrowserOpen(false)} />
      {terminalStarted && <TerminalPanel cwd={workspaceFor(state, active)} open={terminalOpen} onClose={() => setTerminalOpen(false)} />}
      {gitOpen && <GitPanel threadId={active?.remoteId} onRecord={audit.record} protectedPaths={state.threads.filter(thread => thread.status === 'running' || pendingThreads.includes(thread.id) || thread.remoteId && (restoringThread === thread.remoteId || runtime.threads[thread.remoteId]?.turnId) || queue.items.some(item => item.localId === thread.id)).map(thread => workspaceFor(state, thread)).filter((path): path is string => Boolean(path))} onReview={text => { setInput(current => current ? `${current}\n\n${text}` : text); setPage('chat'); setGitOpen(false); }} key={workspaceFor(state, active) || 'none'} root={workspaceFor(state, active)} onClose={() => setGitOpen(false)} onWorktree={project => { changeProject(project); setGitOpen(false); }} />}
      {filesOpen && <WorkspaceFiles onPreview={setArtifactTarget} onEdit={setFileEdit} previewUpdate={filePreviewUpdate} key={workspaceFor(state, active) || 'none'} root={workspaceFor(state, active)} onClose={() => setFilesOpen(false)} onAttach={path => setAttachments(current => [...new Set([...current, path])])} />}
    </div>{notice && <div className="toast">{notice}</div>}{approval && <ApprovalDialog key={approval.uiKey} fileChanges={approvalFileChanges(approval, state.threads)} request={approval} onDecision={respondApproval} />}{deleteCandidate && <DeleteThread title={state.threads.find(item => item.id === deleteCandidate)?.title || '会话'} onCancel={() => setDeleteCandidate(undefined)} onConfirm={() => performDelete(deleteCandidate)} />}
    {artifactTarget && <ArtifactPreview target={artifactTarget} onClose={() => setArtifactTarget(undefined)} onEdit={session => { setArtifactTarget(undefined); setFileEdit(session); }} />}
    {fileEdit && <FileEditor column={fileEdit.column} matchLength={fileEdit.matchLength} lineNumber={fileEdit.lineNumber} root={fileEdit.root} path={fileEdit.path} initial={fileEdit.initial} onClose={() => setFileEdit(undefined)} onSaved={preview => setFilePreviewUpdate({ root: fileEdit.root, path: fileEdit.path, preview })} />}
    {archivesOpen && <ArchivedThreads repository={threadStore} threads={state.threads} connected={codexStatus === 'connected'} onClose={() => setArchivesOpen(false)} onRestore={async thread => { await threadStore.restore(thread); audit.record('恢复归档会话', thread.id); }} />}
  </div>;
}

function modelId(model: string) { return model.split(' · ')[0]; }


function ApprovalDialog({ request, onDecision, fileChanges }: { fileChanges?: import('./domain').ToolActivity['changes']; request: any; onDecision: (decision: string, answers?: UserAnswers, content?: Record<string, unknown>) => Promise<void> }) {
  if (request.method === 'mcpServer/elicitation/request' && request.params?.mode === 'url') return <McpUrl key={request.id} request={request} onDecision={onDecision} />;
  if (request.method === 'mcpServer/elicitation/request') return <McpForm key={request.id} request={request} onSubmit={(action, content) => onDecision(action, undefined, content)} />;
  if (request.method === 'item/tool/requestUserInput') return <UserInputDialog key={request.id} request={request} onDecision={onDecision} />;
  if (['item/commandExecution/requestApproval', 'item/fileChange/requestApproval', 'item/permissions/requestApproval'].includes(request.method)) return <ApprovalPrompt fileChanges={fileChanges} key={request.id} request={request} onDecision={onDecision} />;
  const params = request.params || {};
  const isFile = request.method === 'item/fileChange/requestApproval';
  const isInput = request.method === 'item/tool/requestUserInput';
  const isPermission = request.method === 'item/permissions/requestApproval';
  const isMcp = request.method === 'mcpServer/elicitation/request';
  const title = isFile ? '确认文件变更' : isInput ? '需要补充信息' : isPermission ? '请求额外权限' : isMcp ? 'MCP 请求输入' : '需要你的确认';
  const reason = params.reason || params.message || (isFile ? 'Codex 请求应用文件修改。' : isInput ? '当前工具请求用户输入。' : isPermission ? 'Codex 请求额外的工作区权限。' : isMcp ? `服务器 ${params.serverName || ''} 请求输入。` : 'Codex 请求执行一项命令。');
  return <div className="approval-backdrop"><section className="approval-dialog"><h2>{title}</h2><p>{reason}</p>{params.command && <pre>{params.command}</pre>}{params.cwd && <small>{params.cwd}</small>}<div className="approval-actions"><button onClick={() => onDecision(isInput ? 'cancel' : 'decline')}>{isInput ? '取消' : '拒绝'}</button><button className="primary" onClick={() => onDecision('accept')}>{isInput ? '提交' : '允许'}</button></div></section></div>;
}

function Chat({ compaction, stopping, savingImages, onPasteImages, onDropAttachments, loadFullHistory, onChangePermission, onRetryFailure, sendShortcut, composerSkills, setComposerSkills, onOpenAgent, removeAttachment, busy, mode, permission, onOpenPlugins, composerPlugins, setComposerPlugins, onForkMessage, onRevertMessage, catalog, active, input, setInput, send, cancel, running, activity, model, reasoningEffort, update, attachments, addAttachment, showModel, setShowModel, showProjects, setShowProjects, toast, projectId, projects, status, onProjectChange, onRemoveProject }: { onRemoveProject: (id: string) => void; compaction: ReturnType<typeof useContextCompaction>; stopping: boolean; loadFullHistory: (options?: HistoryReadOptions) => Promise<void>; onChangePermission: (permission: DesktopState['permission']) => Promise<void>; onRetryFailure: (messageId: string) => void; sendShortcut?: 'enter' | 'mod-enter'; composerSkills: SelectedSkill[]; setComposerSkills: (skills: SelectedSkill[]) => void; onOpenAgent: (id: string) => void; removeAttachment: (path: string) => void; busy: boolean; mode: DesktopState['mode']; permission: DesktopState['permission']; onOpenPlugins: () => void; composerPlugins: Plugin[]; setComposerPlugins: (plugins: Plugin[]) => void; onForkMessage: (messageId: string) => Promise<void>; onRevertMessage: (messageId: string) => Promise<void>; catalog: ReturnType<typeof useModelCatalog>; active: DesktopState['threads'][number] | undefined; input: string; setInput: (value: string) => void; send: () => void; cancel: () => void; running: boolean; activity?: string; model: string; reasoningEffort: DesktopState['reasoningEffort']; update: (fn: (next: DesktopState) => void) => void; savingImages: boolean; onPasteImages: (event: ClipboardEvent) => void; onDropAttachments: (paths: string[]) => void; attachments: string[]; addAttachment: () => void; showModel: boolean; setShowModel: (value: boolean) => void; showProjects: boolean; setShowProjects: (value: boolean) => void; toast: (text: string) => void; projectId?: string; projects: DesktopState['projects']; status: string; onProjectChange: (project: Project) => void }) {
  const fileDrop = useFileDrop(onDropAttachments, toast);
  const pluginCwd = useContext(ArtifactWorkspaceContext);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const threadView = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const [awayFromLatest, setAwayFromLatest] = useState(false);
  const [findReset, setFindReset] = useState(0);
  const searchingConversation = useRef(false);
  const composing = useRef(false);
  const effortUnsupported = unsupportedEffort(reasoningEffort, catalog.efforts[model]);
  const canSend = (running || !effortUnsupported) && Boolean(input.trim() || attachments.length || composerSkills.length) && !busy && status === 'connected' && !catalog.loading && catalog.models.includes(model);
  const [workingDirectory, setWorkingDirectory] = useState<string>();
  const [permissionOpen, setPermissionOpen] = useState(false);

  useEffect(() => {
    let disposed = false;
    projectRepository.defaultRoot().then(root => {
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
  return <div className={`chat-layout${workMode ? ' work-mode' : ''}${workMode && empty ? ' work-new-chat' : ''}`}><ThreadTimelinePanel threadId={active?.remoteId} connected={status === 'connected'} busy={busy || running} />{active && <ConversationFind searchRemote={active.remoteId && status === 'connected' ? (term, signal) => searchThreadOccurrences(active.remoteId!, term, signal) : undefined} reset={findReset} key={active.id} messages={active.messages} view={threadView} searching={searchingConversation} loadHistory={active.remoteId && status === 'connected' ? loadFullHistory : undefined} disabled={busy || running} />}{active?.messages.length ? <div className="thread-view" ref={threadView}>{groupMessages(active.messages).map(group => {
    const message = group[0];
    return message.tool ? <ToolActivityGroup key={message.id} messages={group} onOpenAgent={onOpenAgent} /> : <div className={`message ${message.role}`} key={message.id} data-message-id={message.id}>{message.role === 'assistant' ? <><MarkdownMessage content={message.content} />{isFinalReply(active.messages, active.messages.indexOf(message)) && <MessageActions content={message.content} disabled={busy || running || active.status === 'running' || status !== 'connected' || !active.remoteId} onFork={() => onForkMessage(message.id)} onRevert={() => onRevertMessage(message.id)} onError={toast} />}</> : message.role === 'system' && message.id.startsWith('error-') ? <div className="turn-failure"><p>{message.content}</p>{active.messages.some(item => item.role === 'user' && item.turnId === message.id.slice(6)) && <button title={input || attachments.length || composerSkills.length || composerPlugins.length ? '请先发送或清空当前草稿' : '恢复原始输入为草稿，检查后重新发送'} disabled={busy || running || savingImages || Boolean(input) || !!attachments.length || !!composerSkills.length || !!composerPlugins.length} onClick={() => onRetryFailure(message.id)}>恢复本轮输入</button>}</div> : <div className="user-text">{message.content}{message.plugins?.map(plugin => <div key={plugin.id} className="message-attachment" title={`plugin://${plugin.id}`}>插件：{plugin.name}</div>)}{message.skills?.map(skill => <div key={skill.path} className="message-attachment" title={skill.path}>${skill.name}</div>)}{message.attachments?.map(path => <MessageAttachment key={path} path={path} />)}</div>}{message.role === 'user' && <UserMessageCopy content={message.content} onError={toast} />}</div>;
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
      {workMode ? <><ComposerPlugins key={pluginCwd || 'no-workspace'} cwd={pluginCwd} connected={status === 'connected'} onBrowse={onOpenPlugins} onSelect={plugin => {
        if (!composerPlugins.some(item => item.id === plugin.id)) setComposerPlugins([...composerPlugins, plugin]);
        textarea.current?.focus();
      }} /><span className="work-environment" title={project?.environment === 'worktree' ? '工作树' : '本地'} aria-label={project?.environment === 'worktree' ? '工作树' : '本地'}><Laptop aria-hidden="true" /></span></> : <><span className="project-context"><Laptop aria-hidden="true" />{project?.environment === 'worktree' ? '工作树' : '本地'}</span>
      {project?.git?.branch && <span className="project-context project-branch" title={project.git.branch}><GitBranch aria-hidden="true" /><span>{project.git.branch}</span></span>}</>}
      {showProjects && <div className="floating-menu project-menu"><button onClick={async () => { try { const project = await projectRepository.pick(); if (!project) return; onProjectChange(project); setShowProjects(false); } catch (error: any) { toast(error.message); } }}>打开文件夹…</button>{projects.map(item => <div key={item.id} style={{ display: "flex", alignItems: "center" }}><button style={{ flex: 1, minWidth: 0 }} onClick={() => { onProjectChange(item); setShowProjects(false); }}>{projectLabel(item.name)}</button>{projects.some(project => project.id === item.id) && <button title="仅从最近项目列表移除，保留文件和会话" aria-label={`移除最近项目 ${item.name}`} onClick={() => onRemoveProject(item.id)}>移除</button>}</div>)}</div>}
    </div>
    <div className="composer" {...fileDrop} onPaste={onPasteImages}>
      {savingImages && <p role="status">正在保存图片…</p>}
      {composerSkills.length > 0 && <div className="attachment-list" aria-label="本次使用的技能">{composerSkills.map(skill => <span key={skill.path} title={skill.path}>{skill.name}<button aria-label={`移除技能 ${skill.name}`} onClick={() => setComposerSkills(composerSkills.filter(item => item.path !== skill.path))}><X size={14} /></button></span>)}</div>}
      <ContextUsage compaction={compaction} key={active?.id || 'new'} usage={active?.contextTokens} threadId={active?.remoteId} disabled={busy || running || status !== 'connected'} />
      {composerPlugins.length > 0 && <div className="composer-plugin-chips" aria-label="本次使用的插件">{composerPlugins.map(plugin => <span key={plugin.id}><ExtensionIcon item={plugin} /><span>{extensionName(plugin)}</span><button aria-label={`移除 ${extensionName(plugin)}`} onClick={() => setComposerPlugins(composerPlugins.filter(item => item.id !== plugin.id))}><X /></button></span>)}</div>}
      {attachments.length > 0 && <div className="attachment-list" aria-label="草稿附件">{attachments.map(name => <span className="attachment-chip" key={name}><AttachmentPreviewButton path={name} /><button aria-label={`移除附件：${name}`} onClick={() => removeAttachment(name)}>×</button></span>)}</div>}
      <textarea ref={textarea} aria-label="消息" value={input} onChange={event => setInput(event.target.value)}
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={event => {
          if (event.key !== 'Enter' || event.shiftKey || event.altKey || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          if (sendShortcut === 'mod-enter' && !event.ctrlKey && !event.metaKey) return;
          event.preventDefault();
          if (!event.repeat && canSend) send();
        }} placeholder={status === 'connected' ? '随心输入' : '等待 Codex app-server…'} />
        {effortUnsupported && <p role="status" style={{ fontSize: 12, margin: '8px 0', overflowWrap: 'anywhere' }}>此模型不支持当前推理强度，请重新选择后开始新回合或加入队列；草稿已保留。</p>}
      <div className="composer-footer">
        {active?.requestedPermission === 'workspace-write' && active.effectivePermissions?.sandbox === 'readOnly' && <p role="status">当前会话实际为只读，工作区写入未生效。Windows 未配置沙箱或服务端策略限制可能导致降级。</p>}<div className="composer-left"><button className="icon-button" onClick={addAttachment} title="添加附件" aria-label="添加附件"><Plus aria-hidden="true" /></button><div className="permission-picker"><button className="permission-status" aria-expanded={permissionOpen} onClick={() => setPermissionOpen(value => !value)}><ShieldAlert aria-hidden="true" />{active?.remoteId ? permissionSummary(active.effectivePermissions) : permissionOptions.find(item => item[0] === permission)?.[1]}</button>{permissionOpen && <div className="permission-menu">{active?.remoteId && <><h3>修改当前会话权限</h3><p>在会话空闲时修改；等待服务端确认后生效。</p>{permissionOptions.map(([value, label]) => <button key={`current-${value}`} disabled={busy || running || status !== 'connected'} onClick={() => { void onChangePermission(value); setPermissionOpen(false); }}>当前会话：{label}</button>)}</>}<h3>新会话默认权限</h3>{active?.remoteId && <p>当前会话：{permissionSummary(active.effectivePermissions)}。下面的选择仅用于新会话。</p>}{active?.effectivePermissions && <p>审批策略：{active.effectivePermissions.approvalPolicy}</p>}{permissionOptions.map(([value, label, description]) => <button key={value} className={permission === value ? 'selected' : ''} onClick={() => { update(next => { next.permission = value; }); setPermissionOpen(false); }}><ShieldAlert aria-hidden="true" /><span><b>{label}</b><small>{description}</small></span></button>)}</div>}</div><span className="connection-status" role="status" title={status === 'connected' ? '已连接' : status} aria-label={status === 'connected' ? '已连接' : status}><i className={`status-dot ${status}`} /></span></div>
        <div className="composer-right"><EffortPicker supported={catalog.efforts[model]} model={model} value={reasoningEffort} onChange={value => update(next => { const thread = next.threads.find(item => item.id === active?.id); if (thread) thread.reasoningEffort = value; else next.reasoningEffort = value; })} /><ModelPicker catalog={catalog} selected={model} open={showModel} setOpen={setShowModel} onSelect={id => update(next => { const thread = next.threads.find(item => item.id === active?.id); if (thread) thread.model = id; else next.model = id; })} />{running && <button className="send" title="停止生成" aria-label="停止生成" aria-busy={stopping} disabled={stopping} onClick={cancel}><Square aria-hidden="true" /></button>}<button className="send" title={running ? '追加指令' : '发送'} aria-label={running ? '追加指令' : '发送'} disabled={!canSend} onClick={send}><ArrowUp aria-hidden="true" /></button></div>
      </div>
    </div>
  </div></div>;
}

function Workspace({ audit, serviceControl, page, state, models, update, toast, providerStatus, sectionProps, onBack }: { audit: ReturnType<typeof useAuditLog>; serviceControl: ReactNode; page: Page; state: DesktopState; models: string[]; update: (fn: (next: DesktopState) => void) => void; toast: (text: string) => void; providerStatus?: any; sectionProps: ComponentProps<typeof ThreadSectionManager>; onBack: () => void }) {
  if (page === 'settings') return <SettingsWorkspace audit={audit} serviceControl={serviceControl} sectionProps={sectionProps} state={state} update={update} toast={toast} onBack={onBack} />;
  if (page === 'scheduled' || page === 'plugins') {
    // These routes are rendered by their dedicated lazy entry points in App.
    // Keep this component honest if a future refactor accidentally reaches it.
    return <section className="page" role="alert"><h1>页面暂不可用</h1><p>请返回聊天后重试。</p><button onClick={onBack}>返回聊天</button></section>;
  }
  return <section className="page" role="alert"><h1>页面暂不可用</h1><p>请返回聊天后重试。</p><button onClick={onBack}>返回聊天</button></section>;
}

function SettingsWorkspace({ audit, serviceControl, sectionProps, state, update, toast, onBack }: { audit: ReturnType<typeof useAuditLog>; serviceControl: ReactNode; sectionProps: ComponentProps<typeof ThreadSectionManager>; state: DesktopState; update: (fn: (next: DesktopState) => void) => void; toast: (text: string) => void; onBack: () => void }) {
  return <SettingsNavigation onBack={onBack}>{section => <>{serviceControl}{section === '常规' && <ThreadSectionManager {...sectionProps} />}{section === '键盘快捷键'
    ? <KeyboardSettings value={state.sendShortcut} onChange={value => update(next => { next.sendShortcut = value; })} />
    : section === '电脑操控' ? <RemoteDesktopPanel />
    : section === '操作记录' ? <AuditLog onRetry={audit.retry} readFailed={audit.readFailed} entries={audit.entries} error={audit.error} onClear={audit.clear} />
    : section === '通知' ? <NotificationSettings />
    : section === '配置' ? <ProviderSettings audit={audit} state={state} update={update} toast={toast} />
    : section === '权限' ? <><PermissionSettings value={state.permission} onChange={value => update(next => { next.permission = value; })} /><WindowsSandboxSettings cwd={workspaceFor(state, state.threads.find(thread => thread.id === state.activeThreadId))} /></>
    : <div className="settings-card"><div className="settings-line"><div><b>主题</b><small>应用界面主题</small></div><select aria-label="主题" value={state.theme} onChange={e => update(next => { next.theme = e.target.value as DesktopState['theme']; })}><option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option></select></div><div className="settings-line"><div><b>默认模型</b><small>Agent 默认使用的模型</small></div><span>{state.model || '自动选择'}</span></div></div>
  }</>}</SettingsNavigation>;
}

function ProviderSettings({ audit, state, update, toast }: { audit: ReturnType<typeof useAuditLog>; state: DesktopState; update: (fn: (next: DesktopState) => void) => void; toast: (text: string) => void }) {
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
      const available = modelCatalogIds(result);
      setModels(available);
      setDraft(current => ({ ...current, model: current.manualModel || available.includes(current.model) ? current.model : '' }));
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
      audit.record(activate ? '启用渠道' : '保存渠道', result.id || draft.id || 'new');
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
      audit.record('启用渠道', provider.id);
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
      audit.record('删除渠道', deleting.id);
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

  declare global { interface Window { desktop?: WindowFrameBridge & { storage?: import('./persistentStorage').StorageBridge; platform?: string; savePastedImage?: (bytes: Uint8Array) => Promise<{ ok: boolean; path?: string; error?: string }>; droppedFilePaths?: (files: File[]) => string[]; saveTaskOutput?: (input: { filename: string; content: string }) => Promise<{ ok: boolean; canceled?: boolean; error?: string }>; saveTerminal?: (input: { filename: string; content: string }) => Promise<{ ok: boolean; canceled?: boolean; error?: string }>; saveConversation?: (input: { filename: string; content: string }) => Promise<{ ok: boolean; canceled?: boolean; error?: string }>;  openExternal?: (url: string) => Promise<void>; terminal?: import('./TerminalPanel').TerminalBridge; artifact?: (input: any) => Promise<any>; toggleMaximize: () => Promise<{ maximized?: boolean }>; minimize?: () => Promise<void>; close?: () => Promise<void>; providerStatus?: (providerId?: string) => Promise<any>; saveProvider?: (input: { id?: string; activate?: boolean; manualModel?: boolean; name: string; baseUrl: string; apiKey: string; model: string }) => Promise<{ ok: boolean; id?: string; error?: string }>; listProviders?: () => Promise<any[]>; threadProvider?: (threadId: string) => Promise<string | undefined>; deleteProvider?: (id: string) => Promise<{ ok: boolean; error?: string }>; activateProvider?: (id: string) => Promise<{ ok: boolean; model?: string; error?: string }>; listModels?: (input?: { providerId: string } | { id?: string; baseUrl: string; apiKey: string }) => Promise<any>; workspaceGit?: (input: any) => Promise<any>; workspaceFile?: (input: { root: string; path: string; action: string; query?: string; searchOptions?: { caseSensitive?: boolean; wholeWord?: boolean }; edit?: { text: string; revision: string } }) => Promise<any>; pickProject?: () => Promise<import('./domain').Project | null>; getProjectRoot?: () => Promise<string>; pickFiles?: () => Promise<string[]>; readExtensionFile?: (path: string, kind: 'image' | 'skill') => Promise<any>; listTasks?: () => Promise<any>; saveTask?: (input: any) => Promise<any>; setTaskStatus?: (id: string, status: string) => Promise<any>; runTask?: (id: string) => Promise<any>; cancelTask?: (id: string) => Promise<any>; deleteTask?: (id: string) => Promise<any>; taskDetail?: (id: string) => Promise<any>; validateAttachment?: (path: string) => Promise<{ ok: boolean; error?: string }>; onOpenTask?: (listener: (taskId: string) => void) => () => void; onTasksChanged?: (listener: (message?: { error?: string }) => void) => () => void }; codex?: any } }
createRoot(document.getElementById('root')!).render(<StrictMode><WindowFrame><StorageGate>{state => <App initialState={state} />}</StorageGate></WindowFrame></StrictMode>);













