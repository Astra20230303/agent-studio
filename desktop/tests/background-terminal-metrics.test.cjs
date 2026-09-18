const { test } = require('node:test');
const assert = require('node:assert/strict');
const { backgroundTerminalMetrics } = require('../src/backgroundTerminalMetrics.ts');
test('formats process resource samples including zero and multicore CPU', () => {
  assert.equal(backgroundTerminalMetrics({ osPid: 42, cpuPercent: 125.25, rssKb: 2048 }), 'PID 42 · CPU 125.3% · 内存 2.0 MiB');
  assert.equal(backgroundTerminalMetrics({ osPid: 3, cpuPercent: 0, rssKb: 0 }), 'PID 3 · CPU 0.0% · 内存 0.0 MiB');
});
test('unavailable and malformed samples remain unknown rather than appearing idle', () => {
  for (const value of [undefined, null, -1, NaN, Infinity, '0', {}]) assert.equal(backgroundTerminalMetrics({ osPid: value, cpuPercent: value, rssKb: value }), 'PID 未知 · CPU 未知 · 内存 未知');
  assert.match(backgroundTerminalMetrics({ osPid: 0 }), /^PID 未知/);
});
