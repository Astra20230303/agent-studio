const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

function fixture() {
  const listeners = new Set(); const closed = new Set(); const calls = [];
  const client = {}; let respond = () => Promise.resolve({ ok: true, result: {} });
  const source = stripTypeScriptTypes(fs.readFileSync(path.resolve(__dirname, '../src/codexClient.ts'), 'utf8')).replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '') + '\nObject.assign(exports, { updateThreadPermission });';
  vm.runInNewContext(source, { exports: client, setTimeout: fn => setTimeout(fn, 30), clearTimeout, window: { codex: {
    request: (method, params) => { calls.push({ method, params }); return respond(); },
    onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    onClosed: fn => { closed.add(fn); return () => closed.delete(fn); },
  } } });
  return { client, calls, listeners, closed, response: fn => { respond = fn; }, clean: () => { assert.equal(listeners.size, 0); assert.equal(closed.size, 0); } };
}

test('queued acknowledgement and unrelated notifications cannot confirm permission changes', async () => {
  const f = fixture();
  const pending = f.client.updateThreadPermission('a', 'on-request');
  for (const listener of f.listeners) listener({ method: 'thread/settings/updated', params: { threadId: 'b', threadSettings: {} } });
  await assert.rejects(pending, /权限变更尚未确认/);
  f.clean();
});

test('disconnect and rejected updates remove temporary listeners', async () => {
  const f = fixture();
  const pending = f.client.updateThreadPermission('a', 'workspace-write');
  for (const close of f.closed) close();
  await assert.rejects(pending, /连接已断开/); f.clean();
  f.response(() => Promise.resolve({ ok: false, error: 'policy denied' }));
  await assert.rejects(f.client.updateThreadPermission('a', 'danger-full-access'), /policy denied/); f.clean();
});

test('effective notification may precede RPC acknowledgement and resets reviewer to user', async () => {
  const f = fixture();
  let acknowledge;
  f.response(() => new Promise(resolve => { acknowledge = resolve; }));
  const pending = f.client.updateThreadPermission('a', 'on-request');
  const effective = { sandboxPolicy: { type: 'readOnly' }, approvalPolicy: 'on-request', approvalsReviewer: 'user' };
  for (const listener of f.listeners) listener({ method: 'thread/settings/updated', params: { threadId: 'a', threadSettings: effective } });
  acknowledge({ ok: true, result: {} });
  assert.deepEqual(await pending, effective);
  assert.equal(f.calls[0].params.approvalsReviewer, 'user'); f.clean();
});
