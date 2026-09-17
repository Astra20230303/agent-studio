const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyToolEvent, restoreMessages } = require('../src/toolActivity.ts');
test('MCP completion updates one record preserving parameters and result', () => {
  const thread = { messages: [] };
  applyToolEvent(thread, 'item/started', { turnId: 't', item: { id: 'm', type: 'mcpToolCall', server: 'search', tool: 'query', arguments: { q: 'test' }, status: 'inProgress' } });
  applyToolEvent(thread, 'item/completed', { turnId: 't', item: { id: 'm', type: 'mcpToolCall', status: 'completed', result: { content: [{ type: 'text', text: 'Found' }] }, durationMs: 500 } });
  assert.equal(thread.messages.length, 1);
  assert.deepEqual(thread.messages[0].tool.invocation.arguments, { q: 'test' });
  assert.equal(thread.messages[0].tool.invocation.result.content[0].text, 'Found');
});
test('dynamic tool failure and MCP errors survive history restore', () => {
  const messages = restoreMessages([{ id: 'd', type: 'dynamicToolCall', tool: 'test', status: 'completed', success: false, contentItems: [{ type: 'inputText', text: 'Failed' }] }, { id: 'e', type: 'mcpToolCall', tool: 'read', status: 'failed', error: { message: 'Disconnected' } }], []);
  assert.equal(messages[0].tool.invocation.success, false);
  assert.equal(messages[1].tool.invocation.error.message, 'Disconnected');
});
test('explicit null clears old error/result and preserves null arguments', () => {
  const thread = { messages: [] };
  applyToolEvent(thread, 'item/started', { item: { id: 'retry', type: 'mcpToolCall', tool: 'read', arguments: {}, result: { isError: true }, error: { message: 'old failure' } } });
  applyToolEvent(thread, 'item/completed', { item: { id: 'retry', type: 'mcpToolCall', status: 'completed', arguments: null, result: null, error: null } });
  const call = thread.messages[0].tool.invocation;
  assert.equal(call.error, null); assert.equal(call.result, null); assert.equal(call.arguments, null);
});
