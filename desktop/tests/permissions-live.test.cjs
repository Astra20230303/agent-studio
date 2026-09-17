const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const { spawn } = require('node:child_process'); const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs'); const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
const http = require('node:http');
const { startMiniMaxAdapter } = require('../electron/minimax-adapter.cjs');
for (const windowsSandbox of process.platform === 'win32' ? [undefined, 'unelevated'] : [undefined]) {
test(`real permission configuration through Felix client (Windows sandbox: ${windowsSandbox || 'default'})`, { timeout: 30000 }, async () => {
  const root = path.resolve(__dirname, '../..');
  const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
  const profile = fs.mkdtempSync(path.join(cache, 'permissions-live-'));
  const model = http.createServer((req, res) => {
    req.resume(); res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Permission acceptance.' }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const adapter = startMiniMaxAdapter({ port: 0, apiKey: 'local-test', upstream: `http://127.0.0.1:${model.address().port}` }); await once(adapter, 'listening');
  const resolved = findCommand(root);
  const child = spawn(resolved.command, [...resolved.args, ...(windowsSandbox ? ['-c', `windows.sandbox="${windowsSandbox}"`] : []), '-c', `model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, '-c', 'model_providers.minimax.name="MiniMax"', '-c', 'model_providers.minimax.wire_api="responses"', '-c', `model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`, '-c', 'web_search="disabled"', 'app-server', '--stdio'], { cwd: profile, windowsHide: true, env: { ...process.env, CODEX_HOME: profile } });
  const exited = once(child, 'exit'); const rpc = new CodexRpc(child); const timer = setTimeout(() => rpc.close(), 25000);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'permissions_test', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    assert.equal((await rpc.request('windowsSandbox/readiness', {})).status, windowsSandbox === 'unelevated' ? 'ready' : 'notConfigured');
    const source = fs.readFileSync(path.resolve(__dirname, '../src/codexClient.ts'), 'utf8');
    const compiled = require('node:module').stripTypeScriptTypes(source).replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '') + '\nObject.assign(exports, { startThread, updateThreadPermission });';
    const client = {};
    require('node:vm').runInNewContext(compiled, { exports: client, setTimeout, clearTimeout, window: { codex: {
      request: async (method, params) => ({ ok: true, result: await rpc.request(method, params) }),
      onNotification: listener => { rpc.on('notification', listener); return () => rpc.off('notification', listener); },
      onClosed: listener => { rpc.on('closed', listener); return () => rpc.off('closed', listener); },
    } } });
    // Exercise the production client mapping, including workspace-write's reviewer.
    for (const [permission, sandboxType, approvalPolicy, reviewer] of [
      ['on-request', 'readOnly', 'on-request', 'user'],
      ['workspace-write', 'workspaceWrite', 'on-request', 'auto_review'],
      ['danger-full-access', 'dangerFullAccess', 'never', 'user'],
      [undefined, 'readOnly', 'on-request', 'user'],
    ]) {
      const result = await client.startThread({ cwd: profile, model: 'MiniMax-M2.1', permission });
      // Without Windows sandbox setup, app-server safely downgrades workspace write.
      const expectedSandbox = process.platform === 'win32' && !windowsSandbox && sandboxType === 'workspaceWrite' ? 'readOnly' : sandboxType;
      assert.equal(result.sandbox.type, expectedSandbox);
      assert.equal(result.approvalPolicy, approvalPolicy);
      assert.equal(result.approvalsReviewer, reviewer);
      assert.equal(result.cwd, profile);
      if (sandboxType !== 'dangerFullAccess') assert.equal(result.sandbox.networkAccess, false);
      const { thread } = result;
      assert.equal(thread.id.length > 0, true); assert.equal(thread.cwd, profile);
      const read = await rpc.request('thread/read', { threadId: thread.id });
      assert.equal(read.thread.id, thread.id);
      assert.equal(read.thread.cwd, profile);
    }
    const created = await client.startThread({ cwd: profile, model: 'MiniMax-M2.1', permission: 'on-request' });
    // Resume requires a persisted rollout; empty threads do not have one.
    const completed = new Promise((resolve, reject) => {
      const listener = message => {
        if (message.method === 'turn/completed' && message.params.threadId === created.thread.id) {
          rpc.off('notification', listener);
          message.params.turn.status === 'completed' ? resolve() : reject(Error('Fixture turn failed'));
        }
      };
      rpc.on('notification', listener);
    });
    await rpc.request('turn/start', { threadId: created.thread.id, input: [{ type: 'text', text: 'Reply briefly.' }] });
    await completed;
    const found = await rpc.request('thread/search', { searchTerm: 'Permission acceptance', limit: 100, sortKey: 'recency_at' });
    assert.ok(found.data.some(item => item.thread.id === created.thread.id && item.snippet.includes('Permission acceptance')));
    for (const [permission, sandbox, reviewer, approvalPolicy] of [
      ['danger-full-access', 'dangerFullAccess', 'user', 'never'],
      ['workspace-write', 'workspaceWrite', 'auto_review', 'on-request'],
      ['on-request', 'readOnly', 'user', 'on-request'],
    ]) {
      const settings = await client.updateThreadPermission(created.thread.id, permission);
      assert.equal(settings.sandboxPolicy.type, sandbox);
      assert.equal(settings.approvalsReviewer, reviewer);
      assert.equal(settings.approvalPolicy, approvalPolicy);
      assert.equal(settings.cwd, profile);
      assert.equal(rpc.listenerCount('notification'), 0);
      const resumed = await rpc.request('thread/resume', { threadId: created.thread.id });
      assert.equal(resumed.sandbox.type, sandbox);
      assert.equal(resumed.approvalPolicy, approvalPolicy);
      assert.equal(resumed.approvalsReviewer, reviewer);
    }
  } finally {
    clearTimeout(timer); rpc.close(); await exited;
    adapter.closeAllConnections(); await new Promise(resolve => adapter.close(resolve));
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
  }
});
}
