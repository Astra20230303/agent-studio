import type { ToolActivity } from './domain';
const operations: Record<string, string> = { spawnAgent: '创建子 Agent', sendInput: '发送任务', sendMessage: '发送消息', followupTask: '追加任务', wait: '等待 Agent', closeAgent: '关闭 Agent', resumeAgent: '恢复 Agent', interruptAgent: '中断 Agent', listAgents: '查看 Agent' };
const statuses: Record<string, string> = { inProgress: '进行中', completed: '已完成', failed: '失败', interrupted: '已中断', pendingInit: '初始化中', running: '运行中', errored: '出错', shutdown: '已关闭', notFound: '未找到' };
export function AgentActivity({ tool, onOpenAgent }: { tool: ToolActivity; onOpenAgent?: (id: string) => void }) {
  const call = tool.collaboration;
  if (!call) return null;
  const ids = [...new Set([...call.receiverThreadIds, ...Object.keys(call.agentsStates)])];
  return <details className="tool-row" open><summary>{operations[call.tool] || call.tool} · 调用{statuses[tool.status] || tool.status}</summary><div className="tool-detail">
    {call.model && <small>模型：{call.model}</small>}{call.prompt && <pre className="tool-output">{call.prompt}</pre>}
    {ids.map(id => <section key={id} aria-label={`Agent ${id}`}><button disabled={!onOpenAgent} onClick={() => onOpenAgent?.(id)}>打开 Agent {id}</button><p>最近状态：{statuses[call.agentsStates[id]?.status] || call.agentsStates[id]?.status || '未知'}</p>{call.agentsStates[id]?.message && <pre className="tool-output">{call.agentsStates[id].message}</pre>}</section>)}
  </div></details>;
}
