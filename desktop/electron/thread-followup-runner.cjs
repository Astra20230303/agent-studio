// Runs on the desktop's existing RPC so progress and approvals belong to the same UI.
function createThreadFollowupRunner({ getRpc, request }) {
  const active = new Set();
  const run = async (task, { signal, onConversation, onProgress, onResolved }) => {
    const threadId = task.followupThreadId;
    if (active.has(threadId)) throw Error('此会话已有跟进任务运行中。');
    active.add(threadId);
    let rpc, turnId, timer, output = '', listener, closed, aborted, timeout, stopped = false;
    try {
      rpc = await getRpc();
      try { await rpc.request('initialize', { clientInfo: { name: 'felix_followup', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {}); }
      catch (error) { if (!/^already initialized\.?$/i.test(error.message.trim())) throw error; }
      const read = await rpc.request('thread/read', { threadId, includeTurns: false });
      if (read.thread?.id !== threadId || !read.thread.status?.type) throw Error('跟进会话数据无效。');
      if (read.thread.status.type === 'active') throw Error('会话正在执行，本次跟进未发送；下次安排会重试。');
      const resumed = await request(rpc, 'thread/resume', { threadId });
      await onConversation?.(threadId);
      await onResolved?.({ cwd: task.cwd || read.thread.cwd, providerId: resumed.providerId });
      const completions = new Map();
      let resolveDone, rejectDone;
      const done = new Promise((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
      done.catch(() => {});
      const finish = turn => turn.status === 'completed' ? resolveDone() : rejectDone(Error(turn.error?.message || '跟进未正常完成。'));
      listener = message => {
        const p = message.params || {};
        if (p.threadId !== threadId) return;
        if (message.method === 'item/agentMessage/delta' && (!turnId || p.turnId === turnId)) {
          output = (output + (typeof p.delta === 'string' ? p.delta : '')).slice(-200000); onProgress?.(output);
        }
        if (message.method === 'item/completed' && p.item?.type === 'agentMessage' && typeof p.item.text === 'string' && (!turnId || p.turnId === turnId)) {
          output = p.item.text.slice(-200000); onProgress?.(output);
        }
        if (message.method === 'turn/completed') {
          if (turnId === p.turn?.id) finish(p.turn); else if (!turnId) completions.set(p.turn?.id, p.turn);
        }
      };
      closed = error => rejectDone(error);
      aborted = () => { stopped = true; rejectDone(Error('跟进已取消。')); };
      timeout = () => { stopped = true; rejectDone(Error('跟进执行超时。')); };
      rpc.on('notification', listener); rpc.on('closed', closed);
      signal.addEventListener('abort', aborted, { once: true });
      timer = setTimeout(timeout, (task.timeoutMinutes || 10) * 60000);
      if (signal.aborted) throw Error('跟进已取消。');
      const prompt = `${task.prompt}\n\n这是本会话的定期跟进。仅在目标确实完成时，在最终回复末尾单独输出 [FELIX_FOLLOWUP_COMPLETE]；若没有需要通知的新变化，单独回复 [FELIX_FOLLOWUP_UNCHANGED]。否则报告进展或所需操作，不要声称未验证的完成。`;
      const result = await request(rpc, 'turn/start', { threadId, model: task.model, ...(task.reasoningEffort ? { effort: task.reasoningEffort } : {}), approvalPolicy: 'never', sandboxPolicy: task.permission === 'workspace-write' ? { type: 'workspaceWrite', writableRoots: [task.cwd || read.thread.cwd], networkAccess: false, excludeTmpdirEnvVar: false, excludeSlashTmp: false } : { type: 'readOnly', networkAccess: false }, input: [{ type: 'text', text: prompt }] });
      turnId = result.turn?.id;
      if (!turnId) throw Error('跟进没有返回回合 ID。');
      if (completions.has(turnId)) finish(completions.get(turnId));
      if (result.turn.status && result.turn.status !== 'inProgress') finish(result.turn);
      await done;
      return { threadId, output, followupComplete: /(?:^|\n)\[FELIX_FOLLOWUP_COMPLETE\]\s*$/.test(output), silent: output.trim() === '[FELIX_FOLLOWUP_UNCHANGED]' };
    } catch (error) { error.output = output; error.threadId = threadId; throw error; }
    finally {
      if ((stopped || signal.aborted) && turnId) await rpc?.request('turn/interrupt', { threadId, turnId }).catch(() => {});
      clearTimeout(timer); if (listener) rpc.off('notification', listener); if (closed) rpc.off('closed', closed); if (aborted) signal.removeEventListener('abort', aborted);
      active.delete(threadId);
    }
  };
  return { run, active };
}
module.exports = { createThreadFollowupRunner };
