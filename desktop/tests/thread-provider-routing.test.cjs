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
        for await (const chunk of req) { /* drain */ }
        received.push({ id, key: req.headers.authorization });
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Reply from ' + id }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
      });
      servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening');
      providers[id] = { id, apiKey: id + '-key', baseUrl: `http://127.0.0.1:${server.address().port}` };
    }
    adapter = startMiniMaxAdapter({ port: 0, resolveProvider: read }); await once(adapter, 'listening');
    const url = () => `http://127.0.0.1:${adapter.address().port}`;
    const settings = ['model_providers.minimax.name="Felix"', 'model_providers.minimax.wire_api="responses"', 'model_providers.minimax.env_key="MINIMAX_API_KEY"', `model_providers.minimax.base_url="${url()}/v1"`, `model_catalog_json=${JSON.stringify(compatibilityCatalog(root, home))}`, 'web_search="disabled"'];
    rpc = new CodexRpc(spawn(findCommand(root).command, [...settings.flatMap(s => ['-c', s]), 'app-server', '--stdio'], { cwd: root, env: { ...process.env, CODEX_HOME: home, MINIMAX_API_KEY: 'adapter' }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }));
    await rpc.request('initialize', { clientInfo: { name: 'test', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    let router = new ThreadProviderRouter(path.join(home, 'bindings.json'), read, url);
    const start = () => router.request(rpc, 'thread/start', { cwd: home, model: 'MiniMax-M2.1', sandbox: 'read-only', approvalPolicy: 'never' });
    const turn = async threadId => {
      const done = new Promise((resolve, reject) => {
        const listener = message => {
          if (message.method === 'turn/completed' && message.params.threadId === threadId) {
            rpc.off('notification', listener);
            message.params.turn.status === 'completed' ? resolve() : reject(Error(JSON.stringify(message.params.turn)));
          }
        }; rpc.on('notification', listener);
      });
      await router.request(rpc, 'turn/start', { threadId, input: [{ type: 'text', text: 'Reply briefly' }] }); await done;
    };
    const a = (await start()).thread.id; active = 'b'; const b = (await start()).thread.id;
    await Promise.all([turn(a), turn(b)]);
    assert.deepEqual(received.map(r => r.id).sort(), ['a', 'b']);
    assert.ok(received.every(r => r.key === `Bearer ${r.id}-key`));
    router = new ThreadProviderRouter(path.join(home, 'bindings.json'), read, url);
    await router.request(rpc, 'thread/resume', { threadId: a }); await turn(a);
    const fork = await router.request(rpc, 'thread/fork', { threadId: a }); await turn(fork.thread.id);
    assert.deepEqual(received.slice(2).map(r => r.id), ['a', 'a']);
    delete providers.a;
    await assert.rejects(turn(a), /Provider missing/);
    assert.equal(received.length, 4);
  } finally {
    rpc?.close();
    for (const server of [adapter, ...servers].filter(Boolean)) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
});
