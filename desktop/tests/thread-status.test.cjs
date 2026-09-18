const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readThreadStatus } = require('../src/threadStatus.ts');

test('thread status maps active flags and terminal states', () => {
  assert.deepEqual(readThreadStatus({ threadId: 'a', status: { type: 'active', activeFlags: [] } }), { status: 'running' });
  assert.deepEqual(readThreadStatus({ threadId: 'a', status: { type: 'active', activeFlags: ['waitingOnApproval'] } }), { status: 'needs_input' });
  assert.deepEqual(readThreadStatus({ threadId: 'a', status: { type: 'active', activeFlags: ['waitingOnUserInput', 'waitingOnApproval'] } }), { status: 'needs_input' });
  assert.deepEqual(readThreadStatus({ threadId: 'a', status: { type: 'idle' } }), { status: 'idle' });
  assert.deepEqual(readThreadStatus({ threadId: 'a', status: { type: 'systemError' } }), { status: 'failed' });
  assert.deepEqual(readThreadStatus({ threadId: 'a', status: { type: 'notLoaded' } }), { status: 'idle' });
});

test('malformed thread status never creates a usable state', () => {
  for (const value of [null, {}, { threadId: '' }, { threadId: 'a', status: null }, { threadId: 'a', status: { type: 'active' } }, { threadId: 'a', status: { type: 'active', activeFlags: ['unknown'] } }, { threadId: 'a\n', status: { type: 'idle' } }]) assert.equal(readThreadStatus(value), undefined);
});
