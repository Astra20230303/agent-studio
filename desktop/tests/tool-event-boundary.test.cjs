const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyToolEvent } = require('../src/toolActivity.ts');
const command = { id: 'cmd', type: 'commandExecution', command: 'echo hi', status: 'inProgress' };
test('bad tool increments cannot create records or append to a preceding tool', () => {
  const thread = { messages: [] };
  applyToolEvent(thread, 'item/started', { item: command, turnId: 'turn' });
  const original = structuredClone(thread);
  for (const itemId of [undefined, '', ' ', 123, {}, 'cmd\n']) applyToolEvent(thread, 'item/commandExecution/outputDelta', { itemId, delta: 'bad', turnId: 'turn' });
  for (const delta of [null, {}, 123]) applyToolEvent(thread, 'item/commandExecution/outputDelta', { itemId: 'new', delta, turnId: 'turn' });
  applyToolEvent(thread, 'item/fileChange/outputDelta', { itemId: 'cmd', delta: 'wrong type', turnId: 'turn' });
  applyToolEvent(thread, 'item/commandExecution/outputDelta', { itemId: 'cmd', delta: 'wrong turn', turnId: 'other' });
  applyToolEvent(thread, 'item/fileChange/patchUpdated', { itemId: 'patch', changes: {}, turnId: 'turn' });
  assert.deepEqual(thread, original);
});
test('final output survives late starts/deltas/patches while completion remains authoritative', () => {
  const thread = { messages: [] };
  applyToolEvent(thread, 'item/started', { item: command, turnId: 'turn' });
  applyToolEvent(thread, 'item/commandExecution/outputDelta', { itemId: 'cmd', delta: 'partial', turnId: 'turn' });
  applyToolEvent(thread, 'item/completed', { item: { ...command, status: 'completed', aggregatedOutput: 'final' }, turnId: 'turn' });
  const finished = structuredClone(thread);
  applyToolEvent(thread, 'item/started', { item: command, turnId: 'turn' });
  applyToolEvent(thread, 'item/commandExecution/outputDelta', { itemId: 'cmd', delta: 'late', turnId: 'turn' });
  assert.deepEqual(thread, finished);
  applyToolEvent(thread, 'item/completed', { item: { ...command, status: 'completed', aggregatedOutput: 'authoritative' }, turnId: 'turn' });
  assert.equal(thread.messages[0].tool.output, 'authoritative');
});
