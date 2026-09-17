const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const { spawn } = require('node:child_process'); const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs'); const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
test('real app-server accepts all Felix permission profiles and returns the selection', { timeout: 30000 }, async () => {
  const root = path.resolve(__dirname, '../..'); const profile = fs.mkdtempSync(path.join(root, '.project-cache/tmp/permissions-live-'));
  const child = spawn(findCommand(root).command, ['-c', `model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, '-c', 'model_providers.minimax.name="MiniMax"', '-c', 'model_providers.minimax.wire_api="responses"', '-c', 'model_providers.minimax.base_url="http://127.0.0.1:1/v1"', 'app-server', '--stdio'], { cwd: profile, windowsHide: true, env: { ...process.env, CODEX_HOME: profile } });
  const exited = once(child, 'exit'); const rpc = new CodexRpc(child); const timer = setTimeout(() => rpc.close(), 25000);
  try {
    await rpc.request('initialize', { clientInfo: { name: 'permissions_test', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    for (const [sandbox, approvalPolicy] of [['read-only', 'on-request'], ['workspace-write', 'on-request'], ['danger-full-access', 'never']]) {
      const { thread } = await rpc.request('thread/start', { cwd: profile, model: 'MiniMax-M2.1', modelProvider: 'minimax', sandbox, approvalPolicy });
      assert.equal(thread.id.length > 0, true); assert.equal(thread.cwd, profile);
      const read = await rpc.request('thread/read', { threadId: thread.id });
      assert.equal(read.thread.id, thread.id);
      assert.equal(read.thread.cwd, profile);
    }
  } finally { clearTimeout(timer); rpc.close(); await exited; }
});
