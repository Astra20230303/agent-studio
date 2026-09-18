const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readThreadResume } = require('../src/threadResume.ts');
const { restoreMessages } = require('../src/toolActivity.ts');
const { applyAssistantMessage } = require('../src/assistantMessages.ts');
const item = { id: 'reply', type: 'agentMessage', text: 'Restored' };
const delta = { threadId: 'remote', turnId: 'turn', itemId: 'reply', delta: ' appended' };
test('restored terminal replies resist late deltas while running and unknown histories can continue', () => {
  for (const status of ['completed', 'failed', 'interrupted', 'inProgress', undefined]) {
    const snapshot = readThreadResume({ thread: { id: 'remote', turns: [{ id: 'turn', status, items: [item] }] } }, 'remote');
    const thread = { remoteId: 'remote', status: 'completed', messages: restoreMessages(snapshot.items, []) };
    const terminal = ['completed', 'failed', 'interrupted'].includes(status);
    assert.equal(applyAssistantMessage(thread, 'item/agentMessage/delta', delta), !terminal);
    assert.equal(thread.messages[0].content, terminal ? 'Restored' : 'Restored appended');
  }
});
test('plain history reload preserves previous final evidence only for the same reply identity', () => {
  const previous = [{ id: 'live-reply', role: 'assistant', content: 'Final', turnId: 'turn', streamCompleted: true }];
  for (const entries of [[{ item, turnId: 'turn' }], [item], [{ item, turnId: 'turn' }, { item, turnId: 'turn' }]]) {
    const thread = { remoteId: 'remote', messages: restoreMessages(entries, previous) };
    assert.equal(thread.messages.length, 1);
    assert.equal(applyAssistantMessage(thread, 'item/agentMessage/delta', delta), false);
  }
  assert.equal(restoreMessages([{ item, turnId: 'other' }], previous)[0].streamCompleted, undefined);
});
