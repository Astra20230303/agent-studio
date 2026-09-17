const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
const { startMiniMaxAdapter } = require('../electron/minimax-adapter.cjs');
const { restoreMessages } = require('../src/toolActivity.ts');

for (const interrupt of [false, true]) test(interrupt ? 'real child can be read and interrupted without interrupting parent' : 'real app-server spawns a child and preserves its lifecycle and result', { timeout: 45000 }, async () => {
  const root = path.resolve(__dirname, '../..');
  const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
  const profile = fs.mkdtempSync(path.join(cache, 'agent-live-'));
  const events = []; let upstreamError; let childRequests = 0;
  let childEntered;
  const childWaiting = new Promise(resolve => { childEntered = resolve; });
  let deliverResult;
  const delivered = new Promise(resolve => { deliverResult = resolve; });
  const model = http.createServer(async (req, res) => {
    try {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      const child = body.messages.some(message => message.role === 'user' && JSON.stringify(message.content).includes('CHILD_ACCEPTANCE_TASK'));
      if (!child) {
        const result = body.messages.find(message => message.role === 'user' && JSON.stringify(message.content).includes('CHILD_ACCEPTANCE_RESULT'));
        if (result) deliverResult(result.content);
      }
      const spawned = body.messages.some(message => message.role === 'tool' && message.tool_call_id === 'spawn-acceptance');
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      let delta; let finish_reason = 'stop';
      if (child) {
        childRequests++;
        if (interrupt) { res.flushHeaders(); childEntered(); return; }
        delta = { content: 'CHILD_ACCEPTANCE_RESULT' };
      }
      else if (!spawned) {
        const tool = body.tools.find(tool => /(^|__)spawn_agent$/.test(tool.function.name));
        assert.ok(tool, 'Spawn tool must be available');
        delta = { tool_calls: [{ index: 0, id: 'spawn-acceptance', type: 'function', function: { name: tool.function.name, arguments: JSON.stringify({ task_name: 'acceptance', message: 'CHILD_ACCEPTANCE_TASK: return a brief result.', fork_turns: 'none' }) } }] };
        finish_reason = 'tool_calls';
      } else if (!body.messages.some(message => message.role === 'tool' && message.tool_call_id === 'wait-acceptance')) {
        const tool = body.tools.find(tool => /(^|__)wait_agent$/.test(tool.function.name));
        assert.ok(tool, 'Wait tool must be available');
        delta = { tool_calls: [{ index: 0, id: 'wait-acceptance', type: 'function', function: { name: tool.function.name, arguments: JSON.stringify({ timeout_ms: 10000 }) } }] };
        finish_reason = 'tool_calls';
      } else delta = { content: 'PARENT_ACCEPTANCE_RESULT' };
      res.end('data: ' + JSON.stringify({ choices: [{ delta, finish_reason }] }) + '\n\ndata: [DONE]\n\n');
    } catch (error) { upstreamError = error; res.end('data: [DONE]\n\n'); }
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const adapter = startMiniMaxAdapter({ port: 0, apiKey: 'local-test', upstream: `http://127.0.0.1:${model.address().port}` }); await once(adapter, 'listening');
  const settings = [`model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, 'model_providers.minimax.name="MiniMax"', 'model_providers.minimax.wire_api="responses"', `model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`, 'web_search="disabled"', 'features.multi_agent_v2.enabled=true'];
  const processChild = spawn(findCommand(root).command, [...settings.flatMap(value => ['-c', value]), 'app-server', '--stdio'], { cwd: profile, windowsHide: true, env: { ...process.env, CODEX_HOME: profile } });
  const exited = once(processChild, 'exit');
  const rpc = new CodexRpc(processChild);
  const timer = setTimeout(() => rpc.close(), 35000);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'felix_agent_acceptance', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    const { thread } = await rpc.request('thread/start', { cwd: profile, model: 'MiniMax-M2.1', modelProvider: 'minimax', approvalPolicy: 'never', sandbox: 'read-only' });
    let finishParent;
    const parentCompleted = new Promise(resolve => { finishParent = resolve; });
    const completed = new Promise((resolve, reject) => {
      rpc.once('closed', reject);
      rpc.on('notification', message => {
        events.push(message);
        if (message.method === 'turn/completed' && message.params.threadId === thread.id) finishParent(message.params.turn);
        if (message.method === 'item/completed' && message.params.threadId === thread.id && message.params.item.type === 'subAgentActivity' && message.params.item.kind === (interrupt ? 'started' : 'completed')) resolve(message.params.item);
      });
    });
    completed.catch(() => {});
    await rpc.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'Create one child task for the acceptance check.' }] });
    const activity = await completed;
    if (interrupt) {
      await Promise.race([childWaiting, new Promise((_, reject) => rpc.once('closed', reject))]);
      const childId = activity.agentThreadId;
      assert.notEqual(childId, thread.id);
      const before = await rpc.request('thread/read', { threadId: childId, includeTurns: true });
      assert.equal(before.thread.id, childId);
      const running = before.thread.turns.find(turn => turn.status === 'inProgress');
      assert.ok(running, 'thread/read must expose a running child turn');
      await rpc.request('turn/interrupt', { threadId: childId, turnId: running.id });
      let after;
      for (let attempt = 0; attempt < 50; attempt++) {
        after = await rpc.request('thread/read', { threadId: childId, includeTurns: true });
        if (after.thread.turns.find(turn => turn.id === running.id)?.status === 'interrupted') break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(after.thread.turns.find(turn => turn.id === running.id).status, 'interrupted');
      assert.ok(!events.some(event => event.method === 'turn/completed' && event.params.threadId === thread.id && event.params.turn.status === 'interrupted'));
      if (upstreamError) throw upstreamError;
      return;
    }
    const parentResult = await Promise.race([delivered, new Promise((_, reject) => rpc.once('closed', reject))]);
    assert.match(parentResult, /Agent message from "\/root\/acceptance" to "\/root"/);
    assert.match(parentResult, /CHILD_ACCEPTANCE_RESULT/);
    const parentTurn = await Promise.race([parentCompleted, new Promise((_, reject) => rpc.once('closed', reject))]);
    assert.equal(parentTurn.status, 'completed');
    if (upstreamError) throw upstreamError;
    assert.ok(childRequests > 0);
    assert.ok(activity.agentThreadId && activity.agentThreadId !== thread.id);
    assert.match(activity.agentPath, /acceptance$/);
    const child = await rpc.request('thread/resume', { threadId: activity.agentThreadId });
    assert.ok(child.thread.turns.some(turn => turn.items.some(item => item.type === 'agentMessage' && item.text.includes('CHILD_ACCEPTANCE_RESULT'))));
    const history = await rpc.request('thread/items/list', { threadId: thread.id, sortDirection: 'asc', limit: 100 });
    const restored = restoreMessages(history.data, []);
    assert.ok(restored.some(message => message.role === 'assistant' && message.content === 'PARENT_ACCEPTANCE_RESULT'));
    assert.ok(restored.some(message => message.tool?.subAgent?.kind === 'completed' && message.tool.subAgent.threadId === activity.agentThreadId));
    assert.ok(events.some(event => event.params?.item?.type === 'subAgentActivity' && event.params.item.kind === 'started'));
  } catch (error) { console.error('Child requests:', childRequests, 'Items:', JSON.stringify(events.filter(event => event.method === 'item/completed' || event.method === 'error').map(event => event.params))); throw upstreamError || error; }
  finally {
    clearTimeout(timer); rpc.close(); await exited;
    adapter.closeAllConnections(); await new Promise(resolve => adapter.close(resolve));
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
  }
});
