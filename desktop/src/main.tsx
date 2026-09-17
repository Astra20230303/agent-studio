import { ArtifactLink } from './Artifacts';
import { UserInputDialog } from './UserInputDialog';
import { useTurnRuntime } from './useTurnRuntime';
import { useThreadDraft } from './useThreadDraft';
import { useTurnQueue } from './useTurnQueue';
import { TurnQueue } from './TurnQueuePanel';
import { PlanPanel } from './PlanPanel';
import { readPlan } from './planning';
import { createConnectionRecovery } from './connectionRecovery';
import './connection.css';
import { steerTurn } from './codexClient';
import type { UserAnswers } from './UserInputDialog';
import { RemoteDesktopPanel } from './RemoteDesktopPanel';
import { RemoteBrowser } from './RemoteBrowser';
import { Globe } from 'lucide-react';
import { Fragment, StrictMode, useEffect, useMemo, useRef, useState } from 'react';
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
import { branchSnapshot, isFinalReply, replyText } from './messageActions';
import { archiveThread, connectCodex, deleteThread, forkThread, interruptTurn, listThreadItems, listThreadTurns, listThreads, resumeThread, setThreadName, startThread, startTurn, subscribeCodex } from './codexClient';
import { ExtensionsPage, ExtensionIcon } from './ExtensionsPage';
import { ThreadButton } from './ThreadButton';
import { ModePicker } from './ModePicker';
import { ArrowLeft, ArrowRight, ArrowUp, Badge, Bug, Clock3, FolderOpen, GitBranch, Hammer, Laptop, PanelLeft, Plus, Puzzle, RefreshCcw, Search, ShieldAlert, Square, SquarePen, Terminal, Telescope, X } from 'lucide-react';
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

function projectLabel(pathOrName?: string) {
  return pathOrName?.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || pathOrName;
}

function App() {
  const [state, setState] = useState<DesktopState>(() => { const loaded = loadState(); loaded.model = modelId(loaded.model); return loaded; });
  const [input, setInput] = useThreadDraft(state.activeThreadId);
  const [composerPlugins, setComposerPlugins] = useState<Plugin[]>([]);
  const [page, setPage] = useState<Page>('chat');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [browserOpen, setBrowserOpen] = useState(false);
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
  const [showModel, setShowModel] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [codexStatus, setCodexStatus] = useState<'connecting' | 'connected' | 'offline' | 'error'>('connecting');
  const reconnectRef = useRef<() => void>(() => {});
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
  const runningTurnId = active?.remoteId ? runtime.threads[active.remoteId]?.turnId : undefined;
  const activity = active?.remoteId ? runtime.threads[active.remoteId]?.activity : undefined;
  const pending = pendingThreads.includes(active?.id || '') || !!active?.remoteId && restoringThread === active.remoteId;
  const threads = useMemo(() => state.threads.filter(thread => !thread.archived && thread.title.toLowerCase().includes(search.toLowerCase())).slice().reverse(), [state.threads, search]);
  useEffect(() => { saveState(state); document.documentElement.dataset.theme = state.theme; }, [state]);
  useEffect(() => {
    window.desktop?.providerStatus?.().then((provider: any) => {
      setProviderStatus(provider);
      if (!provider?.keyConfigured) setNotice(failureMessage('MINIMAX_API_KEY'));
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    let disposed = false;
    const recovery = createConnectionRecovery({
      connect: connectCodex,
      status: (status, error) => { setCodexStatus(status); setConnectionError(error || ''); },
      connected: () => {
        void listThreads().then(listed => {
          if (disposed) return;
          const remote = listed?.data || listed?.threads || [];
          update(next => {
            for (const item of remote) {
              if (next.threads.some(local => local.remoteId === item.id)) continue;
              next.threads.push({ id: `remote-${item.id}`, remoteId: item.id, title: item.name || item.preview || 'Felix 对话', status: item.status?.type === 'active' ? 'running' : 'completed', pinned: false, archived: false, messages: [], updatedAt: new Date((item.updatedAt || 0) * 1000).toISOString() });
            }
          });
        }).catch(error => { if (!disposed) setNotice(`会话列表加载失败：${error.message}`); });
      },
    });
    reconnectRef.current = recovery.start;
    const cleanup = subscribeCodex({
      notification: message => {
        const params = message.params || {};
        if (message.method === 'serverRequest/resolved') {
          setApprovals(pending => pending.filter(item => item.id !== params.requestId));
        }
        if (message.method === 'turn/plan/updated') {
          const plan = readPlan(params);
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
          update(next => { const thread = next.threads.find(item => item.remoteId === params.threadId); if (thread) thread.status = 'running'; });
        }
        if (message.method === 'item/agentMessage/delta' && params.delta) {
          runtime.apply(params.threadId, { type: 'activity', turnId: params.turnId });
          update(next => { const thread = next.threads.find(item => params.threadId ? item.remoteId === params.threadId : item.id === activeThreadRef.current); if (!thread) return; const last = thread.messages.find(message => message.id === `live-${params.itemId}`); if (last?.role === 'assistant') last.content += params.delta; else thread.messages.push({ id: `live-${params.itemId}`, role: 'assistant', turnId: params.turnId, content: params.delta, createdAt: new Date().toISOString() }); thread.status = 'running'; });
        }
        if (message.method && ['item/started', 'item/completed', 'item/commandExecution/outputDelta', 'item/fileChange/outputDelta', 'item/fileChange/patchUpdated'].includes(message.method)) {
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
      closed: () => { queue.pause(); setApprovals([]); runtime.clear(); recovery.disconnected(); }
    });
    recovery.start();
    return () => { disposed = true; recovery.stop(); cleanup(); reconnectRef.current = () => {}; };
  }, []);
  const toast = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 1500); };
  const update = (fn: (next: DesktopState) => void) => setState(previous => { const next = structuredClone(previous); fn(next); return next; });
  const enqueue = () => {
    if (!input.trim() || !active?.remoteId || !runningTurnId) return;
    queue.change(items => [...items, { id: crypto.randomUUID(), localId: active.id, threadId: active.remoteId!, text: input.trim(), model: modelId(state.model), effort: state.reasoningEffort, planningMode: active.planningMode || 'default', plugins: composerPlugins.map(({ id, name }) => ({ id, name })), waitingOn: runningTurnId, status: 'waiting' }]);
    setInput(''); setComposerPlugins([]);
  };
  useEffect(() => {
    if (codexStatus !== 'connected') return;
    for (const item of queue.items) {
      const head = queue.read().find(entry => entry.threadId === item.threadId);
      if (head?.id !== item.id || head.status !== 'ready' || runtime.read(item.threadId)?.turnId || sendingRef.current.has(item.localId)) continue;
      const thread = state.threads.find(thread => thread.id === item.localId && !thread.archived);
      if (!thread) continue;
      sendingRef.current.add(item.localId);
      queue.change(items => items.map(entry => entry.id === item.id ? { ...entry, status: 'sending', error: undefined } : entry));
      setPendingThreads(previous => [...previous, item.localId]);
      update(next => { const target = next.threads.find(thread => thread.id === item.localId); if (target) target.messages.push({ id: item.id, role: 'user', content: item.text, createdAt: new Date().toISOString() }); });
      void (async () => {
        try {
          const result = await startTurn({ threadId: item.threadId, text: item.text, model: item.model, effort: item.effort, plugins: item.plugins, planningMode: item.planningMode || 'default' });
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
    const text = input.trim(); if (!text || pending) return;
    if (catalog.loading || !availableModels.includes(state.model)) { setNotice(catalog.error || '请等待模型列表加载并选择模型。'); setShowModel(true); return; }
    if (codexStatus !== 'connected') { setNotice('app-server 尚未连接，请稍后重试。'); return; }
    const existing = state.threads.find(item => item.id === state.activeThreadId);
    const lockId = existing?.id || 'new-thread';
    if (sendingRef.current.has(lockId)) return;
    sendingRef.current.add(lockId);
    let localId = existing?.id;
    const automaticTitle = automaticThreadTitle(existing, text);
    if (!existing) { const draft = structuredClone(state); const created = createThread(draft); localId = created.id; update(next => { next.threads.push(created); next.activeThreadId = created.id; }); }
    setPendingThreads(previous => [...previous, localId!]);
    const messageId = crypto.randomUUID();
    try {
      const provider = await window.desktop?.providerStatus?.();
      setProviderStatus(provider);
      if (!provider?.keyConfigured) throw new Error(failureMessage('MINIMAX_API_KEY'));
      const model = modelId(state.model); const modelProvider = 'minimax'; const cwd = await window.desktop?.getProjectRoot?.();
      let threadId = existing?.remoteId;
      const createRemoteThread = async () => {
        const started = await startThread({ effort: state.reasoningEffort, model, modelProvider, cwd, permission: state.permission });
        const id = started.thread?.id;
        if (!id) throw new Error('没有返回 thread id');
        update(next => { const thread = next.threads.find(item => item.id === localId); if (thread) thread.remoteId = id; });
        return id;
      };
      if (!threadId) threadId = await createRemoteThread();
      if (!threadId) throw new Error('没有返回 thread id');
      if (automaticTitle) void setThreadName(threadId, automaticTitle).catch(() => toast('标题已保存在本地，远端同步失败。'));
      update(next => {
        const thread = next.threads.find(item => item.id === localId);
        if (!thread) return;
        thread.messages.push({ id: messageId, role: 'user', content: text, createdAt: new Date().toISOString() });
        ensureThreadTitle(thread);
        thread.updatedAt = new Date().toISOString();
      });
      let turn;
      const plugins = composerPlugins.map(plugin => ({ id: plugin.id, name: plugin.name }));
      if (runningTurnId) {
        const result = await steerTurn(threadId, runningTurnId, text, plugins);
        turn = { turn: { id: result.turnId } };
      } else {
        turn = await startTurn({ threadId, text, plugins, model, modelProvider, effort: state.reasoningEffort, cwd, planningMode: existing?.planningMode || 'default' });
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
      if (activeThreadRef.current === localId) setComposerPlugins([]);
    } catch (error: any) {
      update(next => { const thread = next.threads.find(item => item.id === localId); if (thread) thread.messages = thread.messages.filter(item => item.id !== messageId); });
      setNotice(`${runningTurnId ? '追加指令失败' : '发送失败'}：${error.message || error}`);
    } finally {
      sendingRef.current.delete(lockId);
      setPendingThreads(previous => previous.filter(id => id !== localId));
    }
  };
  const cancel = () => {
    queue.change(items => items.map(item => item.localId === active?.id ? { ...item, status: 'paused', error: '已停止，队列暂停。' } : item));
    if (active?.remoteId && runningTurnId) void interruptTurn(active.remoteId, runningTurnId).catch(error => setNotice(`停止失败：${error.message}`));
  };
  const newChat = () => { setRemoteThreadId(undefined); update(next => createThread(next)); setComposerPlugins([]); setAttachments([]); setPage('chat'); };
  const selectThread = async (thread: DesktopState['threads'][number]) => { update(next => { next.activeThreadId = thread.id; }); setComposerPlugins([]); setPage('chat'); };
  useEffect(() => {
    const threadId = active?.remoteId;
    if (!threadId || codexStatus !== 'connected' || pendingThreads.includes(active.id)) return;
    let disposed = false;
    const revision = runtime.read(threadId)?.revision || 0;
    setRestoringThread(threadId);
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
  const respondApproval = async (decision: string, answers?: UserAnswers) => {
    if (!approval) return;
    let result: any = { decision };
    if (approval.method === 'item/permissions/requestApproval') {
      result = decision === 'accept' ? { scope: 'turn', permissions: approval.params?.permissions || {} } : { scope: 'turn', permissions: {} };
    } else if (approval.method === 'item/tool/requestUserInput') {
      result = { answers: answers || Object.fromEntries((approval.params?.questions || []).map((question: any) => [question.id, { answers: [] }])) };
    } else if (approval.method === 'mcpServer/elicitation/request') {
      result = { action: decision === 'accept' ? 'accept' : decision === 'cancel' ? 'cancel' : 'decline', content: null };
    }
    if (!window.codex) throw new Error('app-server 尚未连接。');
    const response = await window.codex.respond(approval.id, result);
    if (!response?.ok) throw new Error(response?.error?.message || response?.error || '提交失败，请重试。');
    setApprovals(pending => pending.filter(item => item.id !== approval.id));
  };
  const renameActive = async () => { const thread = state.threads.find(item => item.id === state.activeThreadId); if (!thread) return; const name = window.prompt('重命名会话', thread.title)?.trim(); if (!name || name === thread.title) return; if (thread.remoteId && codexStatus === 'connected') { try { await setThreadName(thread.remoteId, name); } catch (error: any) { toast(`重命名失败：${error.message}`); return; } } update(next => { const item = next.threads.find(value => value.id === thread.id); if (item) { item.title = name; item.titleSource = 'manual'; } }); };
  const archiveActive = async () => { const thread = state.threads.find(item => item.id === state.activeThreadId); if (!thread) return; if (thread.remoteId && codexStatus === 'connected') { try { await archiveThread(thread.remoteId); } catch (error: any) { toast(`归档失败：${error.message}`); return; } } update(next => { const item = next.threads.find(value => value.id === thread.id); if (item) { item.archived = true; item.status = 'completed'; } }); setRemoteThreadId(undefined); };
  const performDelete = async (threadId: string) => { const thread = state.threads.find(item => item.id === threadId); if (!thread) return; if (thread.remoteId && codexStatus === 'connected') { try { await deleteThread(thread.remoteId); } catch (error: any) { toast(`删除失败：${error.message}`); return; } } update(next => { next.threads = next.threads.filter(value => value.id !== threadId); if (next.activeThreadId === threadId) next.activeThreadId = undefined; }); setRemoteThreadId(value => value === thread.remoteId ? undefined : value); };
  const deleteActive = async () => { const thread = state.threads.find(item => item.id === state.activeThreadId); if (thread) setDeleteCandidate(thread.id); };
  const togglePinned = (threadId: string) => update(next => { const thread = next.threads.find(item => item.id === threadId); if (thread) thread.pinned = !thread.pinned; });
  const archiveThreadFromSidebar = async (threadId: string) => { const thread = state.threads.find(item => item.id === threadId); if (!thread) return; if (thread.remoteId && codexStatus === 'connected') { try { await archiveThread(thread.remoteId); } catch (error: any) { toast(`归档失败：${error.message}`); return; } } update(next => { const item = next.threads.find(value => value.id === threadId); if (item) { item.archived = true; item.status = 'completed'; if (next.activeThreadId === threadId) next.activeThreadId = undefined; } }); setRemoteThreadId(value => value === thread.remoteId ? undefined : value); };
  const deleteThreadFromSidebar = async (threadId: string) => { if (state.threads.some(item => item.id === threadId)) setDeleteCandidate(threadId); };
  const forkActive = async () => { const thread = state.threads.find(item => item.id === state.activeThreadId); if (!thread?.remoteId || codexStatus !== 'connected') { toast('当前会话还没有远端线程'); return; } try { const result = await forkThread(thread.remoteId); const remote = result?.thread; if (!remote?.id) throw new Error('没有返回分叉线程'); const copy = { ...thread, id: `remote-${remote.id}`, remoteId: remote.id, title: `${thread.title} · 分支`, messages: structuredClone(thread.messages), updatedAt: new Date().toISOString() }; update(next => { next.threads.push(copy); next.activeThreadId = copy.id; }); setRemoteThreadId(remote.id); toast('已创建会话分支'); } catch (error: any) { toast(`分叉失败：${error.message}`); } };
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
      update(next => { next.threads.push(copy); next.activeThreadId = copy.id; });
      setRemoteThreadId(copy.remoteId); setPage('chat');
    } finally { forkingRef.current = false; }
  };
  const addAttachment = async () => {
    const picked = await window.desktop?.pickFiles?.();
    if (!picked?.length) return;
    const next = [...new Set([...attachments, ...picked])];
    setAttachments(next);
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
  return <div className={`desktop-app ${state.theme} ${page === 'settings' ? 'settings-mode' : ''}`}>
    <header className="desktop-titlebar">
      <div className="titlebar-navigation">
        <button className="titlebar-icon" aria-label={sidebarVisible ? '收起侧栏' : '展开侧栏'} title={sidebarVisible ? '收起侧栏' : '展开侧栏'} aria-expanded={sidebarVisible} aria-controls="workspace-sidebar" onClick={() => setSidebarVisible(value => !value)}><PanelLeft aria-hidden="true" /></button>
        <button className="titlebar-icon" aria-label="后退" title="后退" disabled={!navigation.canGoBack} onClick={() => navigateHistory(-1)}><ArrowLeft aria-hidden="true" /></button>
        <button className="titlebar-icon" aria-label="前进" title="前进" disabled={!navigation.canGoForward} onClick={() => navigateHistory(1)}><ArrowRight aria-hidden="true" /></button>
      </div>
      <nav aria-label="应用菜单"><button>文件</button><button>编辑</button><button>视图</button><button>帮助</button></nav><button className="remote-browser-toggle" aria-label="浏览器" title="浏览器" aria-expanded={browserOpen} aria-controls="remote-browser" onClick={() => setBrowserOpen(value => !value)}><Globe size={17} /></button><WindowControls />
    </header>
    {codexStatus !== 'connected' && <div className="connection-banner" role="status"><span>{codexStatus === 'connecting' ? '正在连接工作区…' : '工作区连接已断开，草稿已保留。'}{connectionError && ` ${connectionError}`}</span><button disabled={codexStatus === 'connecting'} onClick={() => reconnectRef.current()}>重新连接</button></div>}
    <div className="desktop-body"><aside id="workspace-sidebar" className="sidebar" aria-label="侧栏" hidden={!sidebarVisible}>
      <div className="brand-row"><ModePicker mode={state.mode} onChange={mode => update(next => { next.mode = mode; })} /><button className="sidebar-search-toggle" aria-label="搜索" title="搜索会话" aria-expanded={showSearch} aria-controls="sidebar-search" onClick={() => { setShowSearch(value => !value); setSearch(''); }}><Search aria-hidden="true" /></button></div>
      {showSearch && <input id="sidebar-search" autoFocus className="side-search" aria-label="搜索最近会话" placeholder="搜索最近会话" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setShowSearch(false); setSearch(''); } }} />}
      <button className="sidebar-nav" onClick={newChat}><SquarePen aria-hidden="true" /><span>新对话</span></button>
      <button className="sidebar-nav" aria-current={page === 'scheduled' ? 'page' : undefined} onClick={() => setPage('scheduled')}><Clock3 aria-hidden="true" /><span>已安排</span></button>
      <button className="sidebar-nav" aria-current={page === 'plugins' ? 'page' : undefined} onClick={() => setPage('plugins')}><Puzzle aria-hidden="true" /><span>插件</span></button>
      <div className="sidebar-scroll">
        <section aria-labelledby="sidebar-projects"><h2 id="sidebar-projects" className="section">项目</h2>
          {state.activeProjectId ? <div className="sidebar-project" title={projectLabel(state.projects.find(project => project.id === state.activeProjectId)?.name ?? state.activeProjectId)}><FolderOpen aria-hidden="true" /><span>{projectLabel(state.projects.find(project => project.id === state.activeProjectId)?.name ?? state.activeProjectId)}</span></div> : <div className="empty">没有项目</div>}
        </section>
        <section aria-labelledby="sidebar-recent"><h2 id="sidebar-recent" className="section">最近</h2>
          {threads.map(thread => <ThreadButton key={thread.id} thread={thread} selected={page === 'chat' && state.activeThreadId === thread.id} onSelect={() => { void selectThread(thread); }} onTogglePin={() => togglePinned(thread.id)} onArchive={() => { void archiveThreadFromSidebar(thread.id); }} onDelete={() => { void deleteThreadFromSidebar(thread.id); }} />)}
          {threads.length === 0 && <div className="empty">{search ? '没有匹配的会话' : '暂无会话'}</div>}
        </section>
      </div>
      <div className="sidebar-footer"><button className="sidebar-nav" aria-current={page === 'settings' ? 'page' : undefined} onClick={() => setPage('settings')}><Badge aria-hidden="true" /><span>设置</span></button></div>
    </aside>
      <main>{page === 'chat' && <><div className="planning-controls"><label>协作模式 <select aria-label="协作模式" value={active?.planningMode || 'default'} disabled={Boolean(runningTurnId) || pending} onChange={event => { const mode = event.target.value as 'default' | 'plan'; update(next => { const thread = next.threads.find(item => item.id === next.activeThreadId) || createThread(next); thread.planningMode = mode; }); }}><option value="default">直接执行</option><option value="plan">先规划</option></select></label>{active?.planningMode === 'plan' && <span>先讨论方案，再切换执行</span>}{active?.planningMode === 'plan' && active.messages.some(message => message.id.startsWith('plan-')) && <button disabled={Boolean(runningTurnId) || pending} onClick={() => { update(next => { const thread = next.threads.find(item => item.id === next.activeThreadId); if (thread) thread.planningMode = 'default'; }); setInput('请按照刚才确认的计划逐步实现，并验证结果。'); }}>按计划执行</button>}</div><PlanPanel plan={active?.plan} /></>}{page === 'chat' && <><TurnQueue items={queue.items.filter(item => item.localId === active?.id)} disabled={codexStatus !== 'connected' || pending} onRemove={id => queue.change(items => items.filter(item => item.id !== id))} onResume={() => queue.change(items => items.map(item => item.localId === active?.id && item.status === 'paused' ? { ...item, status: runningTurnId ? 'waiting' : 'ready', waitingOn: runningTurnId, error: undefined } : item))} />{runningTurnId && <button className="queue-message" disabled={!input.trim() || pending || codexStatus !== 'connected'} onClick={enqueue}>本轮完成后发送</button>}</>}{!!active?.messages.length && page === 'chat' && <div className="thread-toolbar global-thread-toolbar"><span>{active.title}</span><div><button onClick={renameActive}>重命名</button><button onClick={forkActive}>分叉</button><button onClick={archiveActive}>归档</button><button onClick={deleteActive}>删除</button></div></div>}{page === 'chat' ? <Chat busy={pending} mode={state.mode} permission={state.permission} onOpenPlugins={() => setPage('plugins')} composerPlugins={composerPlugins} setComposerPlugins={setComposerPlugins} active={active} input={input} setInput={setInput} send={send} cancel={cancel} running={Boolean(runningTurnId)} activity={activity} model={state.model} reasoningEffort={state.reasoningEffort} catalog={catalog} update={update} attachments={attachments} addAttachment={addAttachment} showModel={showModel} setShowModel={setShowModel} showProjects={showProjects} setShowProjects={setShowProjects} toast={toast} projectId={state.activeProjectId} projects={state.projects} status={codexStatus} onForkMessage={forkFromMessage} /> : page === 'scheduled' ? <ScheduledPage models={availableModels} loadingModels={catalog.loading} refreshModels={catalog.refresh} /> : page === 'plugins' ? <ExtensionsPage connected={codexStatus === 'connected'} /> : <Workspace page={page} state={state} models={availableModels} update={update} toast={toast} providerStatus={providerStatus} onBack={() => { setPage('chat'); setSidebarVisible(true); }} />}</main>
      <RemoteBrowser open={browserOpen} onClose={() => setBrowserOpen(false)} />
    </div>{notice && <div className="toast">{notice}</div>}{approval && <ApprovalDialog request={approval} onDecision={respondApproval} />}{deleteCandidate && <DeleteDialog thread={state.threads.find(item => item.id === deleteCandidate)} onCancel={() => setDeleteCandidate(undefined)} onConfirm={() => { const id = deleteCandidate; setDeleteCandidate(undefined); void performDelete(id); }} />}
  </div>;
}

function modelId(model: string) { return model.split(' · ')[0]; }

function cleanAssistantText(value: string) { return replyText(value); }

function inlineMarkdown(value: string) {
  const parts = value.split(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\[[^\]]+\]\((?:<[^>]+>|[^)]+)\))/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <del key={index}>{part.slice(2, -2)}</del>;
    const link = part.match(/^\[([^\]]+)\]\((?:<([^>]+)>|([^)]+))\)$/);
    if (link) return <ArtifactLink key={index} path={link[2] || link[3]} label={link[1]} />;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function tableCells(line: string) {
  const value = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return value.split('|').map(cell => cell.trim());
}

function isTableDivider(line: string) {
  const cells = tableCells(line);
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function MarkdownMessage({ content }: { content: string }) {
  const text = cleanAssistantText(content);
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let code: string[] | null = null;
  let language = '';
  let table: string[][] | null = null;
  let tableAlign: Array<'left' | 'center' | 'right' | undefined> = [];
  const flushParagraph = () => { if (paragraph.length) { blocks.push(<p key={`p-${blocks.length}`}>{inlineMarkdown(paragraph.join(' '))}</p>); paragraph = []; } };
  const flushCode = () => { if (code) { const source = code.join('\n'); blocks.push(<div className="code-block" key={`code-${blocks.length}`}><div className="code-header"><span>{language || '代码'}</span><button title="复制代码" onClick={() => navigator.clipboard?.writeText(source)}>复制</button></div><pre><code>{source}</code></pre></div>); code = null; language = ''; } };
  const flushTable = () => {
    if (!table) return;
    const rows = table;
    blocks.push(<div className="md-table-wrap" key={`table-${blocks.length}`}><table className="md-table"><thead><tr>{rows[0]?.map((cell, i) => <th key={i} style={{ textAlign: tableAlign[i] }}>{inlineMarkdown(cell)}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{rows[0].map((_, i) => <td key={i} style={{ textAlign: tableAlign[i] }}>{inlineMarkdown(row[i] || '')}</td>)}</tr>)}</tbody></table></div>);
    table = null;
    tableAlign = [];
  };
  lines.forEach((line, index) => {
    const fence = line.match(/^\s*```(.*)$/);
    if (fence) { if (code) flushCode(); else { flushParagraph(); code = []; language = fence[1].trim(); } return; }
    if (code) { code.push(line); return; }
    const image = line.match(/^!\[([^\]]*)\]\((?:<([^>]+)>|(.+))\)$/);
    if (image) { flushParagraph(); blocks.push(<ArtifactLink key={`image-${index}`} path={image[2] || image[3]} label={image[1] || '预览'} preview />); return; }
    if (!line.trim()) { flushTable(); flushParagraph(); return; }
    if (line.includes('|')) {
      const cells = tableCells(line);
      if (table && isTableDivider(line)) return;
      if (!table && cells.length > 1) {
        const next = lines[index + 1];
        if (next !== undefined && isTableDivider(next)) {
          flushParagraph();
          table = [cells];
          tableAlign = tableCells(next).map(cell => cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : cell.startsWith(':') ? 'left' : undefined);
          return;
        }
      } else if (table && !isTableDivider(line)) {
        table.push(cells);
        return;
      }
    }
    if (table) flushTable();
    const heading = line.match(/^\s*(#{1,3})\s+(.+)$/);
    if (heading) { flushParagraph(); blocks.push(<div className={`md-heading md-h${heading[1].length}`} key={`h-${index}`}>{inlineMarkdown(heading[2])}</div>); return; }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) { flushParagraph(); blocks.push(<div className="md-list-item" key={`b-${index}`}><span>•</span><div>{inlineMarkdown(bullet[1])}</div></div>); return; }
    const numbered = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (numbered) { flushParagraph(); blocks.push(<div className="md-list-item" key={`n-${index}`}><span>{numbered[1]}.</span><div>{inlineMarkdown(numbered[2])}</div></div>); return; }
    paragraph.push(line.trim());
  });
  flushCode(); flushTable(); flushParagraph();
  return <div className="markdown-content">{blocks.length ? blocks : <p>{text}</p>}</div>;
}

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

function ApprovalDialog({ request, onDecision }: { request: any; onDecision: (decision: string, answers?: UserAnswers) => Promise<void> }) {
  if (request.method === 'item/tool/requestUserInput') return <UserInputDialog key={request.id} request={request} onDecision={onDecision} />;
  const params = request.params || {};
  const isFile = request.method === 'item/fileChange/requestApproval';
  const isInput = request.method === 'item/tool/requestUserInput';
  const isPermission = request.method === 'item/permissions/requestApproval';
  const isMcp = request.method === 'mcpServer/elicitation/request';
  const title = isFile ? '确认文件变更' : isInput ? '需要补充信息' : isPermission ? '请求额外权限' : isMcp ? 'MCP 请求输入' : '需要你的确认';
  const reason = params.reason || params.message || (isFile ? 'Codex 请求应用文件修改。' : isInput ? '当前工具请求用户输入。' : isPermission ? 'Codex 请求额外的工作区权限。' : isMcp ? `服务器 ${params.serverName || ''} 请求输入。` : 'Codex 请求执行一项命令。');
  return <div className="approval-backdrop"><section className="approval-dialog"><h2>{title}</h2><p>{reason}</p>{params.command && <pre>{params.command}</pre>}{params.cwd && <small>{params.cwd}</small>}<div className="approval-actions"><button onClick={() => onDecision(isInput ? 'cancel' : 'decline')}>{isInput ? '取消' : '拒绝'}</button><button className="primary" onClick={() => onDecision('accept')}>{isInput ? '提交' : '允许'}</button></div></section></div>;
}

function Chat({ busy, mode, permission, onOpenPlugins, composerPlugins, setComposerPlugins, onForkMessage, catalog, active, input, setInput, send, cancel, running, activity, model, reasoningEffort, update, attachments, addAttachment, showModel, setShowModel, showProjects, setShowProjects, toast, projectId, projects, status }: { busy: boolean; mode: DesktopState['mode']; permission: DesktopState['permission']; onOpenPlugins: () => void; composerPlugins: Plugin[]; setComposerPlugins: (plugins: Plugin[]) => void; onForkMessage: (messageId: string) => Promise<void>; catalog: ReturnType<typeof useModelCatalog>; active: DesktopState['threads'][number] | undefined; input: string; setInput: (value: string) => void; send: () => void; cancel: () => void; running: boolean; activity?: string; model: string; reasoningEffort: DesktopState['reasoningEffort']; update: (fn: (next: DesktopState) => void) => void; attachments: string[]; addAttachment: () => void; showModel: boolean; setShowModel: (value: boolean) => void; showProjects: boolean; setShowProjects: (value: boolean) => void; toast: (text: string) => void; projectId?: string; projects: DesktopState['projects']; status: string }) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const threadView = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const composing = useRef(false);
  const canSend = Boolean(input.trim()) && !busy && status === 'connected' && !catalog.loading && catalog.models.includes(model);
  const [workingDirectory, setWorkingDirectory] = useState<string>();
  const [permissionOpen, setPermissionOpen] = useState(false);
  const permissionOptions = [
    ['on-request', '按需审批', '编辑外部文件和使用互联网时始终询问'],
    ['workspace-write', '帮我审批', '仅对检测到的风险操作请求批准'],
    ['danger-full-access', '完全访问权限', '可不受限制地访问互联网和工作区文件']
  ] as const;
  useEffect(() => {
    let disposed = false;
    window.desktop?.getProjectRoot?.().then(root => {
      if (!disposed) setWorkingDirectory(root);
    }).catch(() => undefined);
    return () => { disposed = true; };
  }, []);
  const project = projects.find(item => item.id === projectId);
  const projectPath = workingDirectory || project?.path;
  const projectName = projectLabel(projectPath || project?.name || projectId);
  const workMode = mode === 'work';
  const empty = !active?.messages.length;
  const messageRevision = active?.messages.map(message => `${message.id}:${message.content.length}:${message.role}`).join('|') || '';
  useEffect(() => {
    const element = threadView.current;
    if (!element) return;
    followLatest.current = true;
    element.scrollTop = element.scrollHeight;
    const updateFollowState = () => {
      followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    };
    element.addEventListener('scroll', updateFollowState, { passive: true });
    updateFollowState();
    return () => element.removeEventListener('scroll', updateFollowState);
  }, [active?.id]);
  useEffect(() => {
    const element = threadView.current;
    if (!element || !messageRevision && !activity) return;
    if (followLatest.current) element.scrollTo({ top: element.scrollHeight, behavior: 'auto' });
  }, [messageRevision, activity]);
  const suggestions = [
    { text: '探索并理解代码', icon: Telescope, color: 'explore' },
    { text: '构建新功能、应用或工具', icon: Hammer, color: 'build' },
    { text: '审查代码并提出修改建议', icon: RefreshCcw, color: 'review' },
    { text: '修复问题和失败', icon: Bug, color: 'fix' },
  ];
  return <div className={`chat-layout${workMode ? ' work-mode' : ''}${workMode && empty ? ' work-new-chat' : ''}`}>{active?.messages.length ? <div className="thread-view" ref={threadView}>{groupMessages(active.messages).map(group => {
    const message = group[0];
    return message.tool ? <ToolActivityGroup key={message.id} messages={group} /> : <div className={`message ${message.role}`} key={message.id}>{message.role === 'assistant' ? <><MarkdownMessage content={message.content} />{isFinalReply(active.messages, active.messages.indexOf(message)) && <MessageActions content={message.content} disabled={running || active.status === 'running' || status !== 'connected' || !active.remoteId} onFork={() => onForkMessage(message.id)} onError={toast} />}</> : <div className="user-text">{message.content}</div>}</div>;
  })}{activity && <div className={`activity${activity === '正在思考…' ? ' thinking' : ''}`}>{activity}</div>}</div> : !workMode && <div className="welcome">
    <div className="welcome-content">
      <div className="welcome-mark" role="img" aria-label="Felix" title="Felix" tabIndex={0}><Badge className="welcome-badge" aria-hidden="true" /><Terminal className="welcome-terminal" aria-hidden="true" /></div>
      <h1>{projectName ? <>你想让我们在 <span title={projectPath}>{projectName}</span> 中构建什么？</> : '你想让我们构建什么？'}</h1>
      <div className="cards">{suggestions.map(({ text, icon: Icon, color }) => <button key={text} onClick={() => { setInput(text); textarea.current?.focus(); }}><Icon className={`suggestion-icon ${color}`} aria-hidden="true" /><span>{text}</span></button>)}</div>
    </div>
  </div>}
  <div className="composer-dock">
    {workMode && empty && <h1 className="work-welcome-heading">我们要做什么？</h1>}
    <div className="project-strip">
      <button className="project" aria-expanded={showProjects} title={projectPath || projectName || '选择项目'} onClick={() => setShowProjects(!showProjects)}><FolderOpen aria-hidden="true" /><span>{projectName || '选择项目'}</span></button>
      {workMode ? <><ComposerPlugins connected={status === 'connected'} onBrowse={onOpenPlugins} onSelect={plugin => {
        if (!composerPlugins.some(item => item.id === plugin.id)) setComposerPlugins([...composerPlugins, plugin]);
        textarea.current?.focus();
      }} /><span className="work-environment" title={project?.environment === 'worktree' ? '工作树' : '本地'} aria-label={project?.environment === 'worktree' ? '工作树' : '本地'}><Laptop aria-hidden="true" /></span></> : <><span className="project-context"><Laptop aria-hidden="true" />{project?.environment === 'worktree' ? '工作树' : '本地'}</span>
      {project?.git?.branch && <span className="project-context project-branch" title={project.git.branch}><GitBranch aria-hidden="true" /><span>{project.git.branch}</span></span>}</>}
      {showProjects && <div className="floating-menu project-menu">{(projects.length ? projects : [{ id: workingDirectory || 'my-agent-plantform', name: projectName || 'my-agent-plantform' }]).map(item => <button key={item.id} onClick={() => { update(next => { next.activeProjectId = item.id; }); setShowProjects(false); }}>{projectLabel(item.name)}</button>)}</div>}
    </div>
    <div className="composer">
      {composerPlugins.length > 0 && <div className="composer-plugin-chips" aria-label="本次使用的插件">{composerPlugins.map(plugin => <span key={plugin.id}><ExtensionIcon item={plugin} /><span>{extensionName(plugin)}</span><button aria-label={`移除 ${extensionName(plugin)}`} onClick={() => setComposerPlugins(composerPlugins.filter(item => item.id !== plugin.id))}><X /></button></span>)}</div>}
      {attachments.length > 0 && <div className="attachment-list">{attachments.map(name => <span key={name} title={name}>{name.replace(/^.*[\\/]/, '')}</span>)}</div>}
      <textarea ref={textarea} aria-label="消息" value={input} onChange={event => setInput(event.target.value)}
        onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
        onKeyDown={event => {
          if (event.key !== 'Enter' || event.shiftKey || event.altKey || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          event.preventDefault();
          if (!event.repeat && canSend) send();
        }} placeholder={status === 'connected' ? '随心输入' : '等待 Codex app-server…'} />
      <div className="composer-footer">
        <div className="composer-left"><button className="icon-button" onClick={addAttachment} title="添加附件" aria-label="添加附件"><Plus aria-hidden="true" /></button><div className="permission-picker"><button className="permission-status" aria-expanded={permissionOpen} onClick={() => setPermissionOpen(value => !value)}><ShieldAlert aria-hidden="true" />{permissionOptions.find(item => item[0] === permission)?.[1]}</button>{permissionOpen && <div className="permission-menu"><h3>如何批准 Felix 操作？</h3>{permissionOptions.map(([value, label, description]) => <button key={value} className={permission === value ? 'selected' : ''} onClick={() => { update(next => { next.permission = value; }); setPermissionOpen(false); }}><ShieldAlert aria-hidden="true" /><span><b>{label}</b><small>{description}</small></span></button>)}</div>}</div><span className="connection-status" role="status" title={status === 'connected' ? '已连接' : status} aria-label={status === 'connected' ? '已连接' : status}><i className={`status-dot ${status}`} /></span></div>
        <div className="composer-right"><EffortPicker model={model} value={reasoningEffort} onChange={value => update(next => { next.reasoningEffort = value; })} /><ModelPicker catalog={catalog} selected={model} open={showModel} setOpen={setShowModel} onSelect={id => update(next => { next.model = id; })} />{running && <button className="send" title="停止生成" aria-label="停止生成" onClick={cancel}><Square aria-hidden="true" /></button>}<button className="send" title={running ? '追加指令' : '发送'} aria-label={running ? '追加指令' : '发送'} disabled={!canSend} onClick={send}><ArrowUp aria-hidden="true" /></button></div>
      </div>
    </div>
  </div></div>;
}

function Workspace({ page, state, models, update, toast, providerStatus, onBack }: { page: Page; state: DesktopState; models: string[]; update: (fn: (next: DesktopState) => void) => void; toast: (text: string) => void; providerStatus?: any; onBack: () => void }) {
  if (page === 'settings') return <SettingsWorkspace state={state} update={update} toast={toast} onBack={onBack} />;
  const title = page === 'scheduled' ? '已安排' : page === 'plugins' ? '插件' : '设置';
return <section className="page"><h1>{title}</h1><p>本地工作区演示页面，已准备好接入对应 connector。</p></section>;
}

function SettingsWorkspace({ state, update, toast, onBack }: { state: DesktopState; update: (fn: (next: DesktopState) => void) => void; toast: (text: string) => void; onBack: () => void }) {
  const [section, setSection] = useState('常规');
  const items = ['常规', '导入', '外观', '语音', '配置', '个性化', '宠物', '键盘快捷键', '账户', '电脑操控', '插件', '浏览器', '钩子', '连接', 'Git', '环境', 'Worktrees', '已归档的聊天'];
return <div className="settings-shell"><aside className="settings-sidebar"><button className="settings-back" onClick={onBack}>← <span>返回应用</span></button><input className="settings-search" placeholder="搜索设置..." />{items.map((item, i) => <button key={item} className={`settings-nav ${section === item ? 'active' : ''} ${i === 0 || i === 9 || i === 12 || i === 17 ? 'settings-group-start' : ''}`} onClick={() => setSection(item)}>{item}</button>)}</aside><main className="settings-content"><h1>{section}</h1>{section === '电脑操控' ? <RemoteDesktopPanel /> : section === '配置' ? <ProviderSettings state={state} update={update} toast={toast} /> : <><h2>权限</h2><div className="settings-card"><div className="settings-line"><b>默认权限</b><span className="toggle on" /></div><div className="settings-line"><b>完整访问权限</b><span className="toggle on" /></div></div><h2>常规</h2><div className="settings-card"><div className="settings-line"><div><b>主题</b><small>应用界面主题</small></div><select value={state.theme} onChange={e => update(next => { next.theme = e.target.value as DesktopState['theme']; })}><option value="light">浅色</option><option value="dark">深色</option></select></div><div className="settings-line"><div><b>默认模型</b><small>Agent 默认使用的模型</small></div><span>{state.model || '自动选择'}</span></div></div></>}</main></div>;
}

function ProviderSettings({ state, update, toast }: { state: DesktopState; update: (fn: (next: DesktopState) => void) => void; toast: (text: string) => void }) {
  type ProviderSummary = { id: string; name: string; baseUrl: string; model: string; enabled: boolean; keyConfigured: boolean };
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [draft, setDraft] = useState({ id: '', name: 'RVCompute', baseUrl: 'https://api.rvcompute.com:60000/v1', apiKey: '', model: '' });
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
      setDraft(current => ({ ...current, model: result.models.includes(current.model) ? current.model : '' }));
    } catch (error) { setConnectionError(error instanceof Error ? error.message : '连接失败'); }
    finally { setConnecting(false); }
  };
  const add = async (activate: boolean) => {
    if (saving) return;
    if (!draft.name.trim() || !models.includes(draft.model)) return toast('请连接服务并选择模型');
    setSaving(true);
    try {
      const result = await window.desktop?.saveProvider?.({ ...draft, activate });
      if (!result?.ok) throw new Error(result?.error || '请在桌面应用中配置 Provider');
      if (activate) { update(next => { next.model = draft.model; }); window.dispatchEvent(new Event('provider-changed')); }
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
  return <div className="provider-settings"><h2>Agent LLM Provider</h2>
    {providers.map(provider => <div className="provider-item" key={provider.id}>
      <div><b>{provider.name}{provider.enabled ? ' · 当前使用' : ''}</b><small>{provider.baseUrl}</small><small>{provider.model || '未选择默认模型'} · {provider.keyConfigured ? '密钥已配置' : '待配置密钥'}</small></div>
      <div><button disabled={saving || connecting} onClick={() => { setDraft({ id: provider.id, name: provider.name, baseUrl: provider.baseUrl, model: provider.model, apiKey: '' }); setModels([]); setConnectionError(''); }}>编辑</button>
      <button disabled={saving || connecting || provider.enabled || !provider.keyConfigured} onClick={() => void activate(provider)}>启用</button></div>
    </div>)}
    <button disabled={saving || connecting} onClick={() => { setDraft({ id: '', name: '', baseUrl: 'https://api.rvcompute.com:60000/v1', apiKey: '', model: '' }); setModels([]); setConnectionError(''); }}><Plus size={14} /> 新增渠道</button>
    <h3>{draft.id ? '编辑渠道' : '新增渠道'}</h3>
    <fieldset className="provider-form" disabled={saving || connecting} style={{ border: 0, padding: 0, minWidth: 0 }}>
      <input aria-label="Provider 名称" placeholder="Provider 名称" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
      <input aria-label="Base URL" value={draft.baseUrl} onChange={e => changeConnection('baseUrl', e.target.value)} />
      <input aria-label="API Key" placeholder="API Key（同一服务留空使用已保存密钥）" type="password" autoComplete="off" value={draft.apiKey} onChange={e => changeConnection('apiKey', e.target.value)} />
      <button type="button" onClick={() => void connect()}><RefreshCcw size={14} /> {connecting ? '正在连接…' : '连接并获取模型'}</button>
      {connectionError && <p role="alert" style={{ gridColumn: '1 / -1' }}>{connectionError}</p>}
      {models.length > 0 && <>
        <p role="status" style={{ gridColumn: '1 / -1' }}>连接成功 · 获取到 {models.length} 个模型</p>
        <label htmlFor="provider-model">模型</label>
        <select id="provider-model" value={draft.model} onChange={e => setDraft({ ...draft, model: e.target.value })} style={{ minWidth: 0, maxWidth: '100%' }}>
          <option value="" disabled>请选择模型</option>
          {models.map(model => <option key={model} value={model}>{model}</option>)}
        </select>
      </>}
      <button disabled={!models.includes(draft.model)} onClick={() => void add(false)}>保存渠道</button>
      <button className="primary-button" disabled={!models.includes(draft.model)} onClick={() => void add(true)}>{saving ? '保存中…' : '保存并启用模型'}</button>
    </fieldset>
  </div>;
}

declare global { interface Window { desktop?: WindowFrameBridge & { artifact?: (input: any) => Promise<any>; toggleMaximize: () => Promise<{ maximized?: boolean }>; minimize?: () => Promise<void>; close?: () => Promise<void>; providerStatus?: () => Promise<any>; saveProvider?: (input: { id?: string; activate?: boolean; name: string; baseUrl: string; apiKey: string; model: string }) => Promise<{ ok: boolean; id?: string; error?: string }>; listProviders?: () => Promise<any[]>; activateProvider?: (id: string) => Promise<{ ok: boolean; model?: string; error?: string }>; listModels?: (input?: { id?: string; baseUrl: string; apiKey: string }) => Promise<any>; getProjectRoot?: () => Promise<string>; pickFiles?: () => Promise<string[]>; readExtensionFile?: (path: string, kind: 'image' | 'skill') => Promise<any>; listTasks?: () => Promise<any>; saveTask?: (input: any) => Promise<any>; setTaskStatus?: (id: string, status: string) => Promise<any>; runTask?: (id: string) => Promise<any>; cancelTask?: (id: string) => Promise<any>; deleteTask?: (id: string) => Promise<any>; taskDetail?: (id: string) => Promise<any>; onTasksChanged?: (listener: (message?: { error?: string }) => void) => () => void }; codex?: any } }
createRoot(document.getElementById('root')!).render(<StrictMode><WindowFrame><App /></WindowFrame></StrictMode>);
