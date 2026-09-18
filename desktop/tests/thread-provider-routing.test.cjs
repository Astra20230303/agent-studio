const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
const { startMiniMaxAdapter } = require('../electron/minimax-adapter.cjs');
const { ThreadProviderRouter } = require('../electron/thread-provider-router.cjs');

test('real threads retain their provider through global switches, resume and fork', { timeout: 60000 }, async () => {
  const root = path.resolve(__dirname, '../..');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-thread-providers-'));
  const providers = {}, servers = [], received = [];
  let active = 'a', rpc, adapter;
  const read = id => { const result = providers[id === undefined ? active : id]; if (!result) throw Error('Provider missing'); return result; };
  try {
    for (const id of ['a', 'b']) {
      const server = http.createServer(async (req, res) => {
        let body = '';
        for await (const chunk of req) body += chunk;
        received.push({ id, key: req.headers.authorization, body: JSON.parse(body) });
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Reply from ' + id }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
      });
      servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
      providers[id] = { id, apiKey: id + '-key', baseUrl: `http://127.0.0.1:${server.address().port}` };
    }
    adapter = startMiniMaxAdapter({ port: 0, resolveProvider: read }); await once(adapter, 'listening');
    const url = () => `http://127.0.0.1:${adapter.address().port}`;
    const settings = ['model_providers.minimax.name="Felix"', 'model_providers.minimax.wire_api="responses"', 'model_providers.minimax.env_key="MINIMAX_API_KEY"', `model_providers.minimax.base_url="${url()}/v1"`, `model_catalog_json=${JSON.stringify(compatibilityCatalog(root, home))}`, 'web_search="disabled"'];
    const connect = async () => {
      rpc = new CodexRpc(spawn(findCommand(root).command, [...settings.flatMap(s => ['-c', s]), 'app-server', '--stdio'], { cwd: root, env: { ...process.env, CODEX_HOME: home, MINIMAX_API_KEY: 'adapter' }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }));
      await rpc.request('initialize', { clientInfo: { name: 'test', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    };
    await connect();
    let router = new ThreadProviderRouter(path.join(home, 'bindings.json'), read, url);
    const start = () => router.request(rpc, 'thread/start', { cwd: home, model: 'MiniMax-M2.1', sandbox: 'read-only', approvalPolicy: 'never' });
    rpc.on('notification', message => { const warning = router.observe(message); assert.equal(warning, undefined); });
    const turn = async (threadId, model) => {
      const done = new Promise((resolve, reject) => {
        const listener = message => {
          if (message.method === 'turn/completed' && message.params.threadId === threadId) {
            rpc.off('notification', listener);
            message.params.turn.status === 'completed' ? resolve() : reject(Error(JSON.stringify(message.params.turn)));
          }
        }; rpc.on('notification', listener);
      });
      await router.request(rpc, 'turn/start', { threadId, ...(model ? { model } : {}), input: [{ type: 'text', text: 'Reply briefly' }] }); await done;
    };
    const createdA = await start();
    assert.equal(createdA.providerId, 'a');
    const a = createdA.thread.id; active = 'b'; const b = (await start()).thread.id;
    await Promise.all([turn(a), turn(b)]);
    assert.deepEqual(received.map(r => r.id).sort(), ['a', 'b']);
    assert.ok(received.every(r => r.key === `Bearer ${r.id}-key`));
    router = new ThreadProviderRouter(path.join(home, 'bindings.json'), read, url);
    const resumed = await router.request(rpc, 'thread/resume', { threadId: a });
    assert.equal(resumed.providerId, 'a');
    await turn(a);
    const fork = await router.request(rpc, 'thread/fork', { threadId: a }); await turn(fork.thread.id);
    assert.equal(fork.providerId, 'a');
    assert.deepEqual(received.slice(2).map(r => r.id), ['a', 'a']);
    const migrated = await router.request(rpc, 'felix/thread/provider', { threadId: a, providerId: 'b', model: 'beta-model' });
    assert.equal(migrated.thread.id, a);
    assert.equal(migrated.providerId, 'b');
    assert.equal(migrated.modelProvider, 'felix_b');
    assert.equal(migrated.model, 'beta-model');
    assert.deepEqual(migrated.sandbox, createdA.sandbox);
    assert.equal(migrated.approvalPolicy, createdA.approvalPolicy);
    await turn(a);
    assert.equal(received.at(-1).id, 'b');
    assert.equal(received.at(-1).key, 'Bearer b-key');
    assert.equal(received.at(-1).body.model, 'beta-model');
    assert.match(JSON.stringify(received.at(-1).body.messages), /Reply from a/, 'migration retains previous assistant history in the actual model request');
    router = new ThreadProviderRouter(path.join(home, 'bindings.json'), read, url);
    assert.equal(router.get(a), 'b');
    assert.equal((await router.request(rpc, 'thread/resume', { threadId: a })).modelProvider, 'felix_b');
    const migratedFork = await router.request(rpc, 'thread/fork', { threadId: a });
    await turn(migratedFork.thread.id);
    assert.equal(received.at(-1).id, 'b');
    await turn(a, 'beta-second-model');
    assert.equal(received.at(-1).body.model, 'beta-second-model');
    assert.equal(new ThreadProviderRouter(path.join(home, 'bindings.json'), read, url).bindings[a].model, 'beta-second-model');
    const changedFork = await router.request(rpc, 'thread/fork', { threadId: a });
    assert.equal(changedFork.model, 'beta-second-model');
    await turn(changedFork.thread.id);
    assert.equal(received.at(-1).body.model, 'beta-second-model');
    const applied = new Promise(resolve => {
      const listener = message => {
        if (message.method === 'thread/settings/updated' && message.params.threadId === a && message.params.threadSettings.model === 'beta-settings-model') {
          rpc.off('notification', listener); resolve();
        }
      };
      rpc.on('notification', listener);
    });
    await router.request(rpc, 'thread/settings/update', { threadId: a, model: 'beta-settings-model' });
    await applied;
    assert.equal(new ThreadProviderRouter(path.join(home, 'bindings.json'), read, url).bindings[a].model, 'beta-settings-model');
    const exited = once(rpc.child, 'exit');
    rpc.close(); await exited;
    await connect();
    router = new ThreadProviderRouter(path.join(home, 'bindings.json'), read, url);
    const cold = await router.request(rpc, 'thread/resume', { threadId: a });
    assert.equal(cold.modelProvider, 'felix_b');
    assert.equal(cold.model, 'beta-settings-model');
    assert.equal(cold.thread.id, a);
    assert.deepEqual(cold.sandbox, createdA.sandbox);
    await turn(a);
    assert.equal(received.at(-1).id, 'b');
    assert.equal(received.at(-1).key, 'Bearer b-key');
    assert.match(JSON.stringify(received.at(-1).body.messages), /Reply from a/);
    assert.equal(received.at(-1).body.model, 'beta-settings-model');
    await router.request(rpc, 'felix/thread/provider', { threadId: a, providerId: 'a' });
    delete providers.b;
    await turn(a);
    assert.equal(received.at(-1).id, 'a', 'A bound thread remains usable when the active B provider is unavailable');
    delete providers.a;
    await assert.rejects(turn(a), /Provider missing/);
    assert.equal(received.length, 10);
  } finally {
    rpc?.close();
    for (const server of [adapter, ...servers].filter(Boolean)) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
});
