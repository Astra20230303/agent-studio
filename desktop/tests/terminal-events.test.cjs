const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readTerminalEvent } = require('../src/terminalEvents.ts');
test('terminal event gate keeps exact output and snapshots known fields', () => {
  const input = { id: 'terminal-1', type: 'data', data: '\x1b[31m中文\r\n', extra: 1 };
  const event = readTerminalEvent(input); input.data = 'changed';
  assert.deepEqual(event, { id: 'terminal-1', type: 'data', data: '\x1b[31m中文\r\n' });
  assert.deepEqual(readTerminalEvent({ id: 'x', type: 'data', data: '' }), { id: 'x', type: 'data', data: '' });
  for (const code of [0, 1, -1, 4294967295]) assert.equal(readTerminalEvent({ id: 'x', type: 'exit', code }).code, code);
});
test('terminal event gate rejects malformed identities, output, status and unknown types', () => {
  for (const event of [null, [], {}, { id: 'x', type: 'resize', code: 0 }, { id: 'x', type: 'data' }, { id: 'x', type: 'data', data: 5 }, ...['', ' ', ' x', 'x\n', 'x\0'].map(id => ({ id, type: 'exit', code: 0 })), ...[undefined, '0', NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1].map(code => ({ id: 'x', type: 'exit', code }))]) assert.equal(readTerminalEvent(event), undefined);
});
