const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyToolEvent, restoreMessages } = require('../src/toolActivity.ts');
test('collaboration completion preserves task and independent child status', () => {
  const thread = { messages: [] };
  applyToolEvent(thread, 'item/started', { turnId: 't', item: { id: 'a', type: 'collabAgentToolCall', tool: 'spawnAgent', prompt: 'Review code', status: 'inProgress' } });
  applyToolEvent(thread, 'item/completed', { turnId: 't', item: { id: 'a', type: 'collabAgentToolCall', status: 'completed', receiverThreadIds: ['child'], agentsStates: { child: { status: 'running' } } } });
  assert.equal(thread.messages.length, 1);
  assert.equal(thread.messages[0].tool.collaboration.prompt, 'Review code');
  assert.equal(thread.messages[0].tool.collaboration.agentsStates.child.status, 'running');
  assert.equal(thread.messages[0].tool.status, 'completed');
});
test('history restores child results', () => {
  const restored = restoreMessages([{ type: 'collabAgentToolCall', id: 'wait', tool: 'wait', status: 'completed', receiverThreadIds: ['child'], agentsStates: { child: { status: 'completed', message: 'All tests pass' } } }], []);
  assert.equal(restored[0].tool.collaboration.agentsStates.child.message, 'All tests pass');
});
