const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
const { readCodexModelPage } = require('../src/codexModelCatalog.ts');
test('real app-server model catalog is consumable across all pages', { timeout: 20000 }, async () => {
 const root = path.resolve(__dirname, '../..');
 const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
 const profile = fs.mkdtempSync(path.join(cache, 'model-catalog-live-'));
 const resolved = findCommand(root);
 const child = spawn(resolved.command, [...resolved.args, '-c', `model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, 'app-server', '--stdio'], { cwd: profile, windowsHide: true, env: { ...process.env, CODEX_HOME: profile } });
 const exited = once(child, 'exit'); const rpc = new CodexRpc(child); const timer = setTimeout(() => rpc.close(), 15000);
 try {
  await rpc.request('initialize', { clientInfo: { name: 'catalog_test', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
  const entries = []; let cursor; const seen = new Set();
  do {
   const page = readCodexModelPage(await rpc.request('model/list', { limit: 1, includeHidden: true, ...(cursor ? { cursor } : {}) }));
   entries.push(...page.data); cursor = page.nextCursor;
   if (cursor) { assert.ok(!seen.has(cursor)); seen.add(cursor); }
  } while (cursor);
  assert.ok(entries.length > 0);
  assert.equal(new Set(entries.map(item => item.id)).size, entries.length);
 } finally { clearTimeout(timer); rpc.close(); await exited; }
});
