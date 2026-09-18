const test = require('node:test');
const assert = require('node:assert/strict');
const { readServerDiagnostics, formatBytes } = require('../src/serverDiagnostics.ts');

test('server diagnostics validates process and gauges', () => {
  assert.deepEqual(readServerDiagnostics({ process: { id: 12, residentMemoryBytes: 2048, physicalFootprintBytes: null }, gauges: [{ name: 'requests', value: 3 }] }), { process: { id: 12, residentMemoryBytes: 2048 }, gauges: [{ name: 'requests', value: 3 }] });
  for (const value of [null, {}, { process: { id: -1 }, gauges: [] }, { process: { id: 1 }, gauges: [{ name: '', value: 1 }] }, { process: { id: 1 }, gauges: [{ name: 'x', value: -1 }] }]) assert.throws(() => readServerDiagnostics(value), /服务诊断/);
});

test('diagnostic byte values are readable and preserve unknown values', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KiB');
  assert.equal(formatBytes(2 ** 20), '1.0 MiB');
  assert.equal(formatBytes(null), '未知');
});
