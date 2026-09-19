const test = require('node:test');
const assert = require('node:assert/strict');
const { readRemoteQueuePage, remoteQueueIdentity } = require('../src/threadQueueRemote.ts');
test('remote thread queue validates pages and identities', () => {
  assert.deepEqual(remoteQueueIdentity('thread', 'submission'), { threadId: 'thread', queuedSubmissionId: 'submission' });
  assert.equal(readRemoteQueuePage({ data: [{ id: 'q1', input: [{ type: 'text', text: 'hello' }], clientUserMessageId: 'client' }] }).data[0].id, 'q1');
  assert.throws(() => remoteQueueIdentity('thread\n'));
  assert.throws(() => readRemoteQueuePage({ data: [{ id: 'q1', input: [], clientUserMessageId: 'client' }] }));
});
