const { test } = require('node:test');
const assert = require('node:assert/strict');
const { acceptTurnNotification } = require('../src/turnNotifications.ts');
const read = () => ({ turnId: 'current', completed: ['finished'], revision: 1 });
const delta = { threadId: 'thread', turnId: 'current', itemId: 'reply', delta: 'hello' };

test('lifecycle and text events require explicit valid identities and known terminal status', () => {
  for (const id of [undefined, null, 0, {}, '', ' ', ' bad', 'bad\n']) {
    assert.equal(acceptTurnNotification('item/agentMessage/delta', { ...delta, threadId: id }, read), false);
    assert.equal(acceptTurnNotification('item/agentMessage/delta', { ...delta, turnId: id }, read), false);
    assert.equal(acceptTurnNotification('item/agentMessage/delta', { ...delta, itemId: id }, read), false);
    assert.equal(acceptTurnNotification('turn/started', { threadId: 'thread', turn: { id } }, read), false);
  }
  for (const text of [null, {}, 123]) assert.equal(acceptTurnNotification('item/agentMessage/delta', { ...delta, delta: text }, read), false);
  for (const status of [undefined, 'inProgress', 'unexpected']) assert.equal(acceptTurnNotification('turn/completed', { threadId: 'thread', turn: { id: 'current', status } }, read), false);
  assert.equal(acceptTurnNotification('turn/started', { threadId: 'thread', turn: { id: 'current', status: 'completed' } }, read), false);
});

test('completed turns cannot restart, append late text, or apply completion twice', () => {
  for (const method of ['turn/started', 'turn/completed', 'item/agentMessage/delta']) assert.equal(acceptTurnNotification(method, { ...delta, turnId: 'finished', turn: { id: 'finished', status: method === 'turn/started' ? 'inProgress' : 'completed' } }, read), false);
  assert.equal(acceptTurnNotification('item/agentMessage/delta', { ...delta, turnId: 'older' }, read), false);
  assert.equal(acceptTurnNotification('item/agentMessage/delta', delta, read), true);
  assert.equal(acceptTurnNotification('item/agentMessage/delta', delta, () => undefined), true);
  for (const status of ['completed', 'failed', 'interrupted']) assert.equal(acceptTurnNotification('turn/completed', { threadId: 'thread', turn: { id: 'older', status } }, read), true);
  assert.equal(acceptTurnNotification('thread/settings/updated', {}, read), true);
});
