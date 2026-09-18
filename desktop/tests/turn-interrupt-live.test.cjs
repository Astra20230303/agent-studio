const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
const { startMiniMaxAdapter } = require('../electron/minimax-adapter.cjs');
const http = require('node:http');

test('real app-server interrupts a streaming turn and continues the same conversation', { timeout: 30000 }, async () => {
  const root = path.resolve(__dirname, '../..');
  const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
  const profile = fs.mkdtempSync(path.join(cache, 'interrupt-live-'));
  let completeModel = false;
  let modelRequests = 0;
  const model = http.createServer((req, res) => {
    req.resume(); modelRequests++;
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    if (completeModel) res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Resumed successfully.' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
    else res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Partial response before interruption.' }, finish_reason: null }] }) + '\n\n');
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const adapter = startMiniMaxAdapter({ port: 0, apiKey: 'local-test', upstream: `http://127.0.0.1:${model.address().port}` }); await once(adapter, 'listening');
  const settings = [`model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, 'model_providers.minimax.name="MiniMax"', 'model_providers.minimax.wire_api="responses"', `model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`, 'web_search="disabled"'];
  const child = spawn(findCommand(root).command, [...settings.flatMap(value => ['-c', value]), 'app-server', '--stdio'], { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, CODEX_HOME: profile } });
  const rpc = new CodexRpc(child);
  const waitFor = predicate => {
    const promise = new Promise((resolve, reject) => {
      const cleanup = () => { clearTimeout(deadline); rpc.off('notification', listener); rpc.off('closed', closed); };
      const listener = message => { if (predicate(message)) { cleanup(); resolve(message); } };
      const closed = error => { cleanup(); reject(error); };
      const deadline = setTimeout(() => { cleanup(); reject(Error('Timed out waiting for turn notification')); }, 15000);
      rpc.on('notification', listener); rpc.once('closed', closed);
    });
    promise.catch(() => {});
    return promise;
  };
  const timer = setTimeout(() => rpc.close(), 25000);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'felix_interrupt_acceptance', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    const { thread } = await rpc.request('thread/start', { cwd: root, ephemeral: false, model: 'MiniMax-M2.1', modelProvider: 'minimax', approvalPolicy: 'never', sandbox: 'read-only' });
    const firstDelta = waitFor(message => message.method === 'item/agentMessage/delta' && message.params.threadId === thread.id);
    const firstCompletion = waitFor(message => message.method === 'turn/completed' && message.params.threadId === thread.id);
    const first = await rpc.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'Stream until interrupted.' }] });
    await firstDelta;
    await rpc.request('turn/interrupt', { threadId: thread.id, turnId: first.turn.id });
    const interrupted = await firstCompletion;
    assert.equal(interrupted.params.turn.id, first.turn.id);
    assert.equal(interrupted.params.turn.status, 'interrupted');
    assert.equal(modelRequests, 1);
    completeModel = true;
    const secondCompletion = waitFor(message => message.method === 'turn/completed' && message.params.threadId === thread.id);
    const second = await rpc.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'Continue after the interruption.' }] });
    const completed = await secondCompletion;
    assert.notEqual(second.turn.id, first.turn.id);
    assert.equal(completed.params.turn.id, second.turn.id);
    assert.equal(completed.params.turn.status, 'completed');
    assert.equal(modelRequests, 2);
    const history = await rpc.request('thread/turns/list', { threadId: thread.id, limit: 100 });
    assert.equal(history.data.find(turn => turn.id === first.turn.id).status, 'interrupted');
    assert.equal(history.data.find(turn => turn.id === second.turn.id).status, 'completed');
  } finally {
    clearTimeout(timer);
    const exited = child.exitCode === null ? once(child, 'exit').catch(() => {}) : Promise.resolve();
    rpc.close(); await exited;
    adapter.closeAllConnections(); await new Promise(resolve => adapter.close(resolve));
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
  }
});
