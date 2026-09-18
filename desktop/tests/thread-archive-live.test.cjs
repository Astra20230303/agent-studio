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

test('real app-server archives, paginates and restores isolated conversations', { timeout: 30000 }, async () => {
  const root = path.resolve(__dirname, '../..');
  const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
  const profile = fs.mkdtempSync(path.join(cache, 'archive-live-'));
  const model = http.createServer((req, res) => {
    req.resume(); res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Archive test completed.' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const adapter = startMiniMaxAdapter({ port: 0, apiKey: 'local-test', upstream: `http://127.0.0.1:${model.address().port}` }); await once(adapter, 'listening');
  const settings = [`model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, 'model_providers.minimax.name="MiniMax"', 'model_providers.minimax.wire_api="responses"', `model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`, 'web_search="disabled"'];
  const child = spawn(findCommand(root).command, [...settings.flatMap(value => ['-c', value]), 'app-server', '--stdio'], { cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, CODEX_HOME: profile } });
  const rpc = new CodexRpc(child);
  const timer = setTimeout(() => rpc.close(), 25000);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'felix_archive_acceptance', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    const ids = [];
    for (let index = 0; index < 2; index++) {
      const result = await rpc.request('thread/start', { cwd: root, ephemeral: false, model: 'MiniMax-M2.1', modelProvider: 'minimax', approvalPolicy: 'never', sandbox: 'read-only' });
      ids.push(result.thread.id);
      const complete = new Promise((resolve, reject) => {
        const closed = error => { rpc.off('notification', listener); reject(error); };
        const listener = message => { if (message.method === 'turn/completed' && message.params.threadId === result.thread.id) { rpc.off('notification', listener); rpc.off('closed', closed); message.params.turn.status === 'completed' ? resolve() : reject(Error('Test conversation failed')); } };
        rpc.once('closed', closed);
        rpc.on('notification', listener);
      });
      complete.catch(() => {});
      await rpc.request('turn/start', { threadId: result.thread.id, input: [{ type: 'text', text: 'Return a brief test reply.' }] });
      await complete;
      await rpc.request('thread/name/set', { threadId: result.thread.id, name: `Archive acceptance ${index}` });
      await rpc.request('thread/archive', { threadId: result.thread.id });
    }
    const first = await rpc.request('thread/list', { modelProviders: [], archived: true, limit: 1, sortKey: 'recency_at', sortDirection: 'desc' });
    assert.equal(first.data.length, 1); assert.ok(first.nextCursor);
    const second = await rpc.request('thread/list', { modelProviders: [], archived: true, limit: 1, cursor: first.nextCursor, sortKey: 'recency_at', sortDirection: 'desc' });
    assert.deepEqual(new Set([...first.data, ...second.data].map(thread => thread.id)), new Set(ids));
    const restored = await rpc.request('thread/unarchive', { threadId: ids[0] });
    assert.equal(restored.thread.id, ids[0]);
    const archived = await rpc.request('thread/list', { modelProviders: [], archived: true, limit: 100 });
    assert.deepEqual(archived.data.map(thread => thread.id), [ids[1]]);
    const source = fs.readFileSync(path.resolve(__dirname, '../src/codexClient.ts'), 'utf8');
    const compiled = require('node:module').stripTypeScriptTypes(source).replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '') + '\nObject.assign(exports, { listThreads, searchThreads, listArchivedThreads, unarchiveThread, listThreadTurns, listThreadItems, forkThread });';
    const client = {};
    require('node:vm').runInNewContext(compiled, { exports: client, require: () => ({}), window: { codex: { request: async (method, params) => ({ ok: true, result: await rpc.request(method, params) }) } } });
    assert.deepEqual((await client.listArchivedThreads()).data.map(thread => thread.id), [ids[1]]);
    assert.ok((await client.listThreads()).data.some(thread => thread.id === ids[0]));
    assert.deepEqual((await client.listThreads(undefined, 'Archive acceptance 0')).data.map(thread => thread.id), [ids[0]]);
    assert.equal((await client.listThreads(undefined, 'unmatched-title-12345')).data.length, 0);
    const searched = await client.searchThreads('Archive test completed', undefined, true);
    assert.deepEqual(searched.data.map(item => item.thread.id), [ids[1]]);
    assert.match(searched.data[0].snippet, /Archive test completed/);
    const { createThreadMutations } = require('../src/threadMutations.ts');
    const localState = { threads: [], activeThreadId: 'current-selection' };
    const mutations = createThreadMutations({ restore: client.unarchiveThread }, mutate => mutate(localState));
    await mutations.restore({ id: 'restored-local', remoteId: ids[1], title: 'Archive acceptance 1', archived: true, messages: [] });
    assert.equal(localState.threads.length, 1);
    assert.equal(localState.threads[0].remoteId, ids[1]);
    assert.equal(localState.threads[0].archived, false);
    assert.equal(localState.activeThreadId, 'current-selection');
    assert.equal((await client.listArchivedThreads()).data.length, 0);
    const active = await rpc.request('thread/list', { modelProviders: [], archived: false, limit: 100 });
    assert.ok(active.data.some(thread => thread.id === ids[0]));
    assert.equal((await rpc.request('thread/resume', { threadId: ids[0] })).thread.id, ids[0]);
    const turns = await client.listThreadTurns(ids[0]);
    assert.equal(turns.data.length, 1);
    assert.ok(turns.data[0].items.some(item => item.type === 'agentMessage' && item.text.includes('Archive test completed.')));
    const items = await client.listThreadItems(ids[0]);
    assert.ok(items.data.some(entry => entry.item.type === 'userMessage'));
    assert.ok(items.data.some(entry => entry.item.type === 'agentMessage'));
    const paged = [];
    let cursor;
    do {
      const page = await rpc.request('thread/items/list', { threadId: ids[0], limit: 1, sortDirection: 'asc', ...(cursor ? { cursor } : {}) });
      paged.push(...page.data); assert.notEqual(page.nextCursor, cursor);
      cursor = page.nextCursor;
    } while (cursor);
    assert.deepEqual(paged.map(entry => entry.item.id), items.data.map(entry => entry.item.id));
    const fork = await client.forkThread(ids[0], turns.data[0].id);
    assert.ok(fork.thread.id); assert.notEqual(fork.thread.id, ids[0]);
    const branch = await client.listThreadItems(fork.thread.id);
    assert.ok(branch.data.some(entry => entry.item.type === 'agentMessage' && entry.item.text.includes('Archive test completed.')));
    assert.deepEqual((await client.listThreadItems(ids[0])).data.map(entry => entry.item.id), items.data.map(entry => entry.item.id));
  } finally {
    clearTimeout(timer);
    const exited = child.exitCode === null ? once(child, 'exit').catch(() => {}) : Promise.resolve();
    rpc.close(); await exited;
    adapter.closeAllConnections(); await new Promise(resolve => adapter.close(resolve));
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
  }
});
