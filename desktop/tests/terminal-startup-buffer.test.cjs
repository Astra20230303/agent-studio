const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTerminalStartupBuffer } = require('../src/terminalStartupBuffer.ts');
test('bounded output retains first exit even when event capacity is exhausted', () => {
  const buffer = createTerminalStartupBuffer();
  for (let i = 0; i < 1100; i++) buffer.push({ id: 'a', type: 'data', data: String(i) });
  buffer.push({ id: 'a', type: 'exit', code: 7 });
  buffer.push({ id: 'a', type: 'exit', code: 99 });
  buffer.push({ id: 'a', type: 'data', data: 'late' });
  const result = buffer.drain('a');
  assert.equal(result.truncated, true); assert.equal(result.events.length, 1001);
  assert.deepEqual(result.events.at(-1), { id: 'a', type: 'exit', code: 7 });
  assert.deepEqual(buffer.drain('a'), { events: [], truncated: false });
});
test('oversized chunks are dropped whole and sessions stay isolated', () => {
  const buffer = createTerminalStartupBuffer();
  buffer.push({ id: 'a', type: 'data', data: 'x'.repeat(1024 * 1024 + 1) });
  buffer.push({ id: 'a', type: 'exit', code: 1 });
  const input = { id: 'b', type: 'data', data: '中文' }; buffer.push(input); input.data = 'changed';
  assert.deepEqual(buffer.drain('b'), { events: [{ id: 'b', type: 'data', data: '中文' }], truncated: false });
  assert.deepEqual(buffer.drain('a'), { events: [], truncated: false });
});
test('session inventory is bounded and reports overflow', () => {
  const buffer = createTerminalStartupBuffer();
  for (let i = 0; i < 65; i++) buffer.push({ id: String(i), type: 'exit', code: i });
  assert.deepEqual(buffer.drain('64'), { events: [], truncated: true });
});
