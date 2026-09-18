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

test('errors require scoped identity, meaningful text and a boolean retry indicator', () => {
  const params = { threadId: 'thread', turnId: 'current', error: { message: 'offline' }, willRetry: false };
  assert.equal(acceptTurnNotification('error', params, read), true);
  for (const field of ['threadId', 'turnId']) for (const value of [undefined, 123, '', ' ']) assert.equal(acceptTurnNotification('error', { ...params, [field]: value }, read), false);
  for (const error of [undefined, {}, { message: {} }, '', ' ']) assert.equal(acceptTurnNotification('error', { ...params, error }, read), false);
  for (const willRetry of ['false', 0, {}]) assert.equal(acceptTurnNotification('error', { ...params, willRetry }, read), false);
});
test('successful and interrupted outcomes resist late errors, failed outcomes retain details', () => {
  const params = { threadId: 'thread', turnId: 'finished', error: { message: 'late' }, willRetry: false };
  for (const outcome of ['completed', 'interrupted']) assert.equal(acceptTurnNotification('error', params, () => ({ ...read(), outcomes: { finished: outcome } })), false);
  assert.equal(acceptTurnNotification('error', params, () => ({ ...read(), outcomes: { finished: 'failed' } })), true);
  assert.equal(acceptTurnNotification('error', { ...params, willRetry: true }, read), false);
  assert.equal(acceptTurnNotification('error', { ...params, turnId: 'other', willRetry: true }, read), false);
  assert.equal(acceptTurnNotification('error', { ...params, turnId: 'current', willRetry: true }, read), true);
});
