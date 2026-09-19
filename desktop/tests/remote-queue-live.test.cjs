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
const { readRemoteQueuePage, remoteQueueReorderParams } = require('../src/threadQueueRemote.ts');

test('real server queue paginates, reorders, updates, deletes, notifies and starts the selected submission', { timeout: 35000 }, async () => {
  const root = path.resolve(__dirname, '../..');
  const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
  const profile = fs.mkdtempSync(path.join(cache, 'remote-queue-live-'));
  const requests = [], events = [];
  let entered; const modelEntered = new Promise(resolve => { entered = resolve; });
  const model = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    requests.push(JSON.parse(raw));
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    if (requests.length === 1) { res.flushHeaders(); entered(); return; }
    res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Queue test complete.' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const adapter = startMiniMaxAdapter({ port: 0, apiKey: 'test', upstream: `http://127.0.0.1:${model.address().port}` }); await once(adapter, 'listening');
  const settings = [`model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, 'model_providers.minimax.name="MiniMax"', 'model_providers.minimax.wire_api="responses"', `model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`, 'web_search="disabled"'];
  const command = findCommand(root);
  const child = spawn(command.command, [...command.args, ...settings.flatMap(value => ['-c', value]), 'app-server', '--stdio'], { cwd: profile, windowsHide: true, env: { ...process.env, CODEX_HOME: profile } });
  const exited = once(child, 'exit'); const rpc = new CodexRpc(child);
  const timer = setTimeout(() => rpc.close(), 30000);
  rpc.on('notification', event => events.push(event));
  try {
    await rpc.request('initialize', { clientInfo: { name: 'queue_test', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    const { thread } = await rpc.request('thread/start', { cwd: profile, model: 'MiniMax-M2.1', modelProvider: 'minimax', approvalPolicy: 'never', sandbox: 'read-only' });
    const { turn: initialTurn } = await rpc.request('turn/start', { threadId: thread.id, input: [{ type: 'text', text: 'INITIAL_HELD_TURN' }] });
    await Promise.race([modelEntered, exited.then(() => { throw new Error("Server exited before model request"); })]);
    const ids = [];
    for (const text of ['FIRST_QUEUE_MARKER', 'SECOND_QUEUE_MARKER', 'THIRD_QUEUE_MARKER']) {
      const result = await rpc.request('thread/queue/add', { threadId: thread.id, input: [{ type: 'text', text }], clientUserMessageId: text });
      ids.push(result.queuedSubmission.id);
    }
    const first = readRemoteQueuePage(await rpc.request('thread/queue/list', { threadId: thread.id, limit: 1 }));
    assert.equal(first.data[0].id, ids[0]); assert.ok(first.nextCursor);
    const rest = readRemoteQueuePage(await rpc.request('thread/queue/list', { threadId: thread.id, limit: 100, cursor: first.nextCursor }));
    assert.deepEqual(rest.data.map(item => item.id), ids.slice(1)); assert.equal(rest.nextCursor, undefined);
    const list = async () => readRemoteQueuePage(await rpc.request('thread/queue/list', { threadId: thread.id, limit: 100 })).data;
    await rpc.request('thread/queue/reorder', remoteQueueReorderParams(thread.id, [ids[2], ids[0], ids[1]]));
    assert.deepEqual((await list()).map(item => item.id), [ids[2], ids[0], ids[1]]);
    await assert.rejects(rpc.request('thread/queue/reorder', { threadId: thread.id, queuedSubmissionIds: [ids[0]] }));
    await rpc.request('thread/queue/update', { threadId: thread.id, queuedSubmissionId: ids[1], input: [{ type: 'text', text: 'UPDATED_QUEUE_MARKER' }] });
    const updated = (await list())[2]; assert.equal(updated.clientUserMessageId, 'SECOND_QUEUE_MARKER'); assert.equal(updated.input[0].text, 'UPDATED_QUEUE_MARKER');
    assert.equal((await rpc.request('thread/queue/delete', { threadId: thread.id, queuedSubmissionId: ids[0] })).deleted, true);
    assert.deepEqual((await list()).map(item => item.id), [ids[2], ids[1]]);
    await assert.rejects(rpc.request('thread/queue/start', { threadId: thread.id, queuedSubmissionId: ids[1] }), /active|pending/);
    const interrupted = new Promise((resolve, reject) => {
      rpc.once('closed', reject);
      rpc.on('notification', event => { if (event.method === 'turn/completed' && event.params.turn.id === initialTurn.id) resolve(event.params.turn); });
    });
    interrupted.catch(() => {});
    await rpc.request('turn/interrupt', { threadId: thread.id, turnId: initialTurn.id });
    assert.equal((await interrupted).status, 'interrupted');
    assert.deepEqual((await list()).map(item => item.id), [ids[2], ids[1]]);
    const completedTurns = [];
    const completed = new Promise((resolve, reject) => {
      rpc.once('closed', reject);
      rpc.on('notification', event => { if (event.method === 'turn/completed' && event.params.threadId === thread.id) { completedTurns.push(event.params.turn); if (completedTurns.length === 2) resolve(completedTurns[0]); } });
    });
    completed.catch(() => {});
    const { turn } = await rpc.request('thread/queue/start', { threadId: thread.id, queuedSubmissionId: ids[1] });
    const done = await completed; assert.equal(done.id, turn.id); assert.equal(done.status, 'completed');
    assert.deepEqual(await list(), []);
    assert.equal(completedTurns[1].status, 'completed');
    assert.equal(requests.length, 3); assert.ok(JSON.stringify(requests[1].messages).includes('UPDATED_QUEUE_MARKER'));
    assert.ok(JSON.stringify(requests[2].messages).includes('THIRD_QUEUE_MARKER'));
    assert.ok(events.some(event => event.method === 'thread/queue/changed' && event.params.threadId === thread.id));
  } finally {
    clearTimeout(timer); rpc.close(); await exited;
    adapter.closeAllConnections(); await new Promise(resolve => adapter.close(resolve));
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
  }
});
