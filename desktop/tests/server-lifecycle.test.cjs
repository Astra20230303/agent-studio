const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { once } = require('node:events');
const { CodexServer } = require('../electron/codex-server.cjs');

test('independent servers share no port and start is cancellable and restartable', { timeout: 30000 }, async () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-lifecycle-'));
  const root = path.resolve(__dirname, '../..');
  const original = Module._load;
  Module._load = function(name, ...args) {
    if (name === './provider-config.cjs') return { readProvider: () => ({ apiKey: '', baseUrl: 'https://example.invalid/v1' }) };
    return original.call(this, name, ...args);
  };
  const first = new CodexServer(root, { dataRoot: path.join(scratch, 'a') });
  const second = new CodexServer(root, { dataRoot: path.join(scratch, 'b') });
  const children = [];
  try {
    const cancelled = first.start(); first.stop();
    await assert.rejects(cancelled, /abort/i);
    assert.equal(first.child, null);
    const starting = first.start();
    assert.equal(first.start(), starting);
    const [a, b] = await Promise.all([starting, second.start()]);
    children.push(first.child, second.child);
    assert.notEqual(first.adapter.address().port, second.adapter.address().port);
    for (const rpc of [a, b]) {
      await rpc.request('initialize', { clientInfo: { name: 'lifecycle-test', version: '1' } });
      rpc.notify('initialized', {});
      assert.ok((await rpc.request('model/list', {})).data.length);
    }
    const old = first.child; const exited = once(old, 'exit'); first.stop(); await exited;
    const restarted = await first.start(); children.push(first.child);
    assert.notEqual(restarted, a);
    await restarted.request('initialize', { clientInfo: { name: 'restart-test', version: '1' } });
    assert.ok(second.adapter.listening);
  } finally {
    const exits = children.filter(child => child.exitCode === null && child.signalCode === null).map(child => once(child, 'exit'));
    first.stop(); second.stop(); await Promise.all(exits);
    Module._load = original;
    fs.rmSync(scratch, { recursive: true, force: true });
  }
});
