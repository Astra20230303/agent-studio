const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyAssistantMessage } = require('../src/assistantMessages.ts');
const delta = (text, turnId = 'turn') => ({ threadId: 'remote', turnId, itemId: 'reply', delta: text });
const final = text => ({ threadId: 'remote', turnId: 'turn', item: { id: 'reply', type: 'agentMessage', text } });
test('final reply replaces partial text, deduplicates completion and ignores late increments', () => {
  const thread = { remoteId: 'remote', messages: [], status: 'running' };
  applyAssistantMessage(thread, 'item/agentMessage/delta', delta('Partial'));
  const timestamp = thread.messages[0].createdAt;
  applyAssistantMessage(thread, 'item/completed', final('Complete answer'));
  applyAssistantMessage(thread, 'item/completed', final('Complete answer'));
  assert.equal(applyAssistantMessage(thread, 'item/agentMessage/delta', delta(' late')), false);
  assert.equal(thread.messages.length, 1);
  assert.equal(thread.messages[0].content, 'Complete answer');
  assert.equal(thread.messages[0].createdAt, timestamp);
  assert.equal(thread.status, 'running');
});
test('completion without deltas restores reply without reopening a finished turn; invalid events preserve it', () => {
  const thread = { remoteId: 'remote', messages: [], status: 'completed' };
  applyAssistantMessage(thread, 'item/completed', final('Recovered'));
  const snapshot = structuredClone(thread);
  for (const params of [{ ...final('bad'), threadId: 'other' }, { ...final('bad'), turnId: 'different' }, final({}), { ...final('bad'), item: { id: '', type: 'agentMessage', text: 'bad' } }]) assert.equal(applyAssistantMessage(thread, 'item/completed', params), false);
  assert.deepEqual(thread, snapshot);
  applyAssistantMessage(thread, 'item/completed', final(''));
  assert.equal(thread.messages[0].content, '');
});
