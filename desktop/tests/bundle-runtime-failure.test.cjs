const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { bundleRuntime } = require('../scripts/bundle-runtime.cjs');

test('license fetch failure leaves no output and preserves adjacent files', async t => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-bundle-failure-'));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const output = path.join(scratch, 'output');
  const keep = path.join(scratch, 'keep'); fs.writeFileSync(keep, 'untouched');
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 503 }));
  await assert.rejects(bundleRuntime({ output }), /license download failed: 503/);
  assert.equal(fs.existsSync(output), false);
  assert.equal(fs.readFileSync(keep, 'utf8'), 'untouched');
});

test('copy failure removes only its newly created output', async t => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'felix-bundle-copy-'));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const output = path.join(scratch, 'output');
  const keep = path.join(scratch, 'keep'); fs.writeFileSync(keep, 'untouched');
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => 'Node.js\nPermission is hereby granted' }));
  const copy = fs.copyFileSync; let copies = 0;
  t.mock.method(fs, 'copyFileSync', (...args) => {
    if (++copies === 2) throw new Error('simulated disk failure');
    return copy(...args);
  });
  await assert.rejects(bundleRuntime({ output }), /simulated disk failure/);
  assert.equal(copies, 2);
  assert.equal(fs.existsSync(output), false);
  assert.equal(fs.readFileSync(keep, 'utf8'), 'untouched');
});
