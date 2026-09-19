import type { Thread } from './domain';
export type AgentNode = { id: string; parentId: string; title: string; status: string; message: string; depth: number };
export function agentWorkspace(threads: Thread[], root?: Thread): AgentNode[] {
  if (!root?.remoteId) return [];
  const result: AgentNode[] = [], seen = new Set([root.remoteId]);
  const pending = [{ thread: root, depth: 0 }];
  while (pending.length && result.length < 200) {
    const { thread, depth } = pending.shift()!;
    const children = new Map<string, { status: string; message: string }>();
    for (const message of thread.messages) {
      const tool = message.tool;
      if (tool?.subAgent?.threadId) {
        const status = { started: 'running', interacted: 'running', completed: 'completed', interrupted: 'interrupted' }[tool.subAgent.kind] || 'unknown';
        children.set(tool.subAgent.threadId, { status, message: '' });
      }
      if (tool?.collaboration) for (const id of new Set([...tool.collaboration.receiverThreadIds, ...Object.keys(tool.collaboration.agentsStates)])) {
        const state = tool.collaboration.agentsStates[id];
        children.set(id, { status: state?.status || children.get(id)?.status || 'unknown', message: state?.message || children.get(id)?.message || '' });
      }
    }
    for (const [id, state] of children) {
      if (!id.trim() || seen.has(id) || result.length >= 200) continue;
      seen.add(id);
      const child = threads.find(item => item.remoteId === id);
      result.push({ id, parentId: thread.remoteId!, title: child?.title || id, ...state, depth: depth + 1 });
      if (child) pending.push({ thread: child, depth: depth + 1 });
    }
  }
  return result;
}

type Request = (method: string, params: any) => Promise<any>;
export async function readAgentSnapshot(request: Request, threadId: string) {
  const thread = (await request('thread/read', { threadId, includeTurns: false }))?.thread;
  if (thread?.id !== threadId || typeof thread.status?.type !== 'string') throw Error('子任务会话数据无效');
  const page = await request('thread/turns/list', { threadId, limit: 20, sortDirection: 'desc', itemsView: 'full' });
  if (!Array.isArray(page?.data) || page.data.some((turn: any) => typeof turn?.id !== 'string' || !turn.id || typeof turn.status !== 'string')) throw Error('子任务回合数据无效');
  const running = page.data.find((turn: any) => turn.status === 'inProgress');
  if (thread.status.type === 'active' && !running) throw Error('子任务状态正在变化，请刷新后重试');
  const latest = running || page.data[0];
  const items = Array.isArray(latest?.items) ? latest.items : [];
  return { status: latest?.status || thread.status.type, turnId: running?.id as string | undefined,
    message: typeof latest?.error?.message === 'string' ? latest.error.message : items.filter((item: any) => item.type === 'agentMessage' && typeof item.text === 'string').map((item: any) => item.text).join('\n') as string };
}
export async function commandAgent(request: Request, threadId: string, action: 'stop' | 'send', text = '') {
  if (!threadId.trim() || action === 'send' && !text.trim()) throw Error('子任务或追加指令不能为空');
  if (action === 'send') {
    const resumed = await request('thread/resume', { threadId });
    if (resumed?.thread?.id !== threadId) throw Error('子任务恢复身份不匹配');
  }
  const state = await readAgentSnapshot(request, threadId);
  if (action === 'stop') {
    if (!state.turnId) return '子任务已结束，无需停止';
    await request('turn/interrupt', { threadId, turnId: state.turnId });
    return '已请求停止子任务，请刷新核对';
  }
  const result = await request(state.turnId ? 'turn/steer' : 'turn/start', { threadId, ...(state.turnId ? { expectedTurnId: state.turnId } : {}), input: [{ type: 'text', text: text.trim() }] });
  if (typeof (state.turnId ? result?.turnId : result?.turn?.id) !== 'string') throw Error('追加指令未获有效确认，请核对会话后再试');
  return state.turnId ? '已追加到运行中的子任务' : '已启动子任务后续回合';
}
