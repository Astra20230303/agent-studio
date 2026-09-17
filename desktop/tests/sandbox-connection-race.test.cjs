const test = require('node:test');
const assert = require('node:assert/strict');
const sandbox = require('../src/windowsSandbox.ts');

test('late readiness response cannot overwrite new connection state', async () => {
  let resolve;
  global.window = { codex: { request: () => new Promise(done => { resolve = done; }) } };
  try {
    const old = sandbox.checkWindowsSandbox();
    sandbox.invalidateWindowsSandbox();
    window.codex.request = async () => ({ ok: true, result: { status: 'notConfigured' } });
    await sandbox.checkWindowsSandbox();
    resolve({ ok: true, result: { status: 'ready' } });
    await old;
    assert.equal(sandbox.sandboxSnapshot().status, 'notConfigured');
    assert.equal(sandbox.sandboxSnapshot().busy, false);
  } finally { sandbox.invalidateWindowsSandbox(); delete global.window; }
});

test('disconnect removes setup subscriptions and ignores its late completion', async () => {
  const notifications = new Set(), closed = new Set();
  let resolve;
  global.window = { codex: {
    request: () => new Promise(done => { resolve = done; }),
    onNotification: fn => { notifications.add(fn); return () => notifications.delete(fn); },
    onClosed: fn => { closed.add(fn); return () => closed.delete(fn); },
  } };
  try {
    const pending = sandbox.setupWindowsSandbox('unelevated');
    const stale = [...notifications][0];
    sandbox.invalidateWindowsSandbox();
    assert.equal(notifications.size, 0); assert.equal(closed.size, 0);
    stale({ method: 'windowsSandbox/setupCompleted', params: { mode: 'unelevated', success: true } });
    resolve({ ok: true, result: { started: true } }); await pending;
    assert.equal(sandbox.sandboxSnapshot().status, 'unknown');
    assert.match(sandbox.sandboxSnapshot().error, /连接已断开/);
    assert.equal(sandbox.sandboxSnapshot().busy, false);
  } finally { sandbox.invalidateWindowsSandbox(); delete global.window; }
});
