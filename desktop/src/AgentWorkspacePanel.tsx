import { useEffect, useRef, useState } from 'react';
import type { Thread } from './domain';
import { agentWorkspace, commandAgent, readAgentSnapshot, type AgentNode } from './agentWorkspace';
const labels: Record<string, string> = { running: '运行中', inProgress: '运行中', active: '运行中', completed: '已完成', failed: '失败', errored: '出错', interrupted: '已中断', shutdown: '已关闭', pendingInit: '初始化中', idle: '空闲', unknown: '未知' };
const request = async (method: string, params: unknown) => {
  const response = await window.codex?.request(method, params);
  if (!response?.ok) throw Error(response?.error?.message || response?.error || '子任务服务不可用');
  return response.result;
};
function AgentCard({ node, connected, onOpen }: { node: AgentNode; connected: boolean; onOpen: (id: string) => void }) {
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof readAgentSnapshot>>>();
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const lock = useRef(false), epoch = useRef(0);
  useEffect(() => { epoch.current++; setSnapshot(undefined); return () => { epoch.current++; }; }, [node.id, node.status, node.message, connected]);
  const act = async (action: 'refresh' | 'stop' | 'send') => {
    if (!connected || lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    const version = epoch.current, submitted = text;
    try {
      if (action === 'refresh') { const state = await readAgentSnapshot(request, node.id); if (epoch.current === version) setSnapshot(state); }
      else { const message = await commandAgent(request, node.id, action, submitted); if (epoch.current === version) setNotice(message); if (action === 'send') setText(current => current === submitted ? '' : current); }
    } catch (error) { if (epoch.current === version) setError(error instanceof Error ? error.message : String(error)); }
    finally { lock.current = false; setBusy(false); }
  };
  const state = snapshot || node;
  return <article className="agent-workspace-card" aria-label={`协作子任务 ${node.id}`}>
    <strong>{node.title}</strong><small>层级 {node.depth} · 来源 {node.parentId}</small>
    <p>状态：{labels[state.status] || state.status}</p>
    {state.message && <pre>{state.message}</pre>}
    <div><button onClick={() => onOpen(node.id)}>打开子会话</button><button disabled={!connected || busy} onClick={() => void act('refresh')}>刷新状态与结果</button><button disabled={!connected || busy} onClick={() => void act('stop')}>停止子任务</button></div>
    <textarea aria-label={`追加指令 ${node.id}`} value={text} onChange={event => setText(event.target.value)} placeholder="向此子任务追加指令" />
    <button disabled={!connected || busy || !text.trim()} onClick={() => void act('send')}>发送追加指令</button>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
  </article>;
}
export function AgentWorkspacePanel({ threads, active, connected, onOpen, onClose }: { threads: Thread[]; active?: Thread; connected: boolean; onOpen: (id: string) => void; onClose: () => void }) {
  const nodes = agentWorkspace(threads, active);
  return <aside className="artifact-side-panel agent-workspace" aria-label="多 Agent 协作">
    <header><strong>多 Agent 协作</strong><button onClick={onClose} aria-label="关闭协作面板">×</button></header>
    <p>主任务：{active?.title || '新对话'}</p><p>已知子任务 {nodes.length} 个 · 来源于已加载协作记录</p>
    {!connected && <p role="status">连接已断开，显示最近记录；重连后可刷新状态。</p>}
    {!nodes.length && <p>当前会话尚无已加载的子任务记录。</p>}
    {nodes.map(node => <AgentCard key={node.id} node={node} connected={connected} onOpen={onOpen} />)}
  </aside>;
}
