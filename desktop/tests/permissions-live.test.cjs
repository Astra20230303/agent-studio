const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const { spawn } = require('node:child_process'); const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs'); const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
for (const windowsSandbox of process.platform === 'win32' ? [undefined, 'unelevated'] : [undefined]) {
test(`real permission configuration through Felix client (Windows sandbox: ${windowsSandbox || 'default'})`, { timeout: 30000 }, async () => {
  const root = path.resolve(__dirname, '../..');
  const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
  const profile = fs.mkdtempSync(path.join(cache, 'permissions-live-'));
  const resolved = findCommand(root);
  const child = spawn(resolved.command, [...resolved.args, ...(windowsSandbox ? ['-c', `windows.sandbox="${windowsSandbox}"`] : []), '-c', `model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, '-c', 'model_providers.minimax.name="MiniMax"', '-c', 'model_providers.minimax.wire_api="responses"', '-c', 'model_providers.minimax.base_url="http://127.0.0.1:1/v1"', 'app-server', '--stdio'], { cwd: profile, windowsHide: true, env: { ...process.env, CODEX_HOME: profile } });
  const exited = once(child, 'exit'); const rpc = new CodexRpc(child); const timer = setTimeout(() => rpc.close(), 25000);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'permissions_test', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    const source = fs.readFileSync(path.resolve(__dirname, '../src/codexClient.ts'), 'utf8');
    const compiled = require('node:module').stripTypeScriptTypes(source).replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '') + '\nObject.assign(exports, { startThread });';
    const client = {};
    require('node:vm').runInNewContext(compiled, { exports: client, window: { codex: { request: async (method, params) => ({ ok: true, result: await rpc.request(method, params) }) } } });
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
  } finally { clearTimeout(timer); rpc.close(); await exited; }
});
}
