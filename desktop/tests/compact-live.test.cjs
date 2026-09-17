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
test('real manual compaction completes and supplies its summary to the next turn', { timeout: 30000 }, async () => {
  const root = path.resolve(__dirname, '../..');
  const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
  const profile = fs.mkdtempSync(path.join(cache, 'compact-live-'));
  const requests = [], events = [];
  const model = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    requests.push(JSON.parse(raw));
    const content = requests.length === 2 ? 'COMPACTION_SUMMARY_MARKER: user requested a test reply.' : 'Test reply complete.';
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end('data: ' + JSON.stringify({ choices: [{ delta: { content }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const adapter = startMiniMaxAdapter({ port: 0, apiKey: 'test', upstream: `http://127.0.0.1:${model.address().port}` }); await once(adapter, 'listening');
  const settings = [`model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, 'model_providers.minimax.name="MiniMax"', 'model_providers.minimax.wire_api="responses"', `model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`, 'web_search="disabled"'];
  const child = spawn(findCommand(root).command, [...settings.flatMap(value => ['-c', value]), 'app-server', '--stdio'], { cwd: profile, windowsHide: true, env: { ...process.env, CODEX_HOME: profile } });
  const exited = once(child, 'exit'); const rpc = new CodexRpc(child);
  const timer = setTimeout(() => rpc.close(), 25000);
  rpc.on('notification', event => events.push(event));
  try {
    await rpc.request('initialize', { clientInfo: { name: 'compact_test', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    const { thread } = await rpc.request('thread/start', { cwd: profile, model: 'MiniMax-M2.1', modelProvider: 'minimax', approvalPolicy: 'never', sandbox: 'read-only' });
    const run = async (method, params) => {
      const done = new Promise((resolve, reject) => {
        const closed = error => { rpc.off('notification', listener); reject(error); };
        const listener = event => {
          if (event.method !== 'turn/completed' || event.params.threadId !== thread.id) return;
          rpc.off('notification', listener); rpc.off('closed', closed);
          event.params.turn.status === 'completed' ? resolve() : reject(Error(JSON.stringify(event.params.turn)));
        };
        rpc.on('notification', listener); rpc.once('closed', closed);
      });
      done.catch(() => {}); await rpc.request(method, { threadId: thread.id, ...params }); await done;
    };
    await run('turn/start', { input: [{ type: 'text', text: 'Return a test reply.' }] });
    await run('thread/compact/start', {});
    assert.ok(events.some(event => event.method === 'item/started' && event.params.item.type === 'contextCompaction'));
    assert.ok(events.some(event => event.method === 'item/completed' && event.params.item.type === 'contextCompaction'));
    await run('turn/start', { input: [{ type: 'text', text: 'Continue from the summary.' }] });
    assert.equal(requests.length, 3);
    assert.ok(JSON.stringify(requests[2].messages).includes('COMPACTION_SUMMARY_MARKER'));
  } finally {
    clearTimeout(timer); rpc.close(); await exited;
    adapter.closeAllConnections(); await new Promise(resolve => adapter.close(resolve));
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
  }
});
