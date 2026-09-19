const test = require('node:test');
const assert = require('node:assert/strict');
const { readRemoteQueuePage, remoteQueueIdentity } = require('../src/threadQueueRemote.ts');
test('remote thread queue validates pages and identities', () => {
  assert.deepEqual(remoteQueueIdentity('thread', 'submission'), { threadId: 'thread', queuedSubmissionId: 'submission' });
  assert.equal(readRemoteQueuePage({ data: [{ id: 'q1', input: [{ type: 'text', text: 'hello' }], clientUserMessageId: 'client' }] }).data[0].id, 'q1');
  assert.throws(() => remoteQueueIdentity('thread\n'));
  assert.throws(() => readRemoteQueuePage({ data: [{ id: 'q1', input: [], clientUserMessageId: 'client' }] }));
});
const { moveRemoteQueue, remoteQueueReorderParams } = require('../src/threadQueueRemote.ts');
test('remote reorder preserves the complete queue and rejects ambiguous identities', () => {
  const items = ['a','b','c'].map(id => ({ id }));
  assert.deepEqual(moveRemoteQueue(items, 'b', -1), ['b','a','c']);
  assert.deepEqual(moveRemoteQueue(items, 'b', 1), ['a','c','b']);
  assert.deepEqual(items.map(item => item.id), ['a','b','c']);
  assert.throws(() => moveRemoteQueue(items, 'a', -1));
  assert.throws(() => moveRemoteQueue(items, 'missing', 1));
  assert.throws(() => remoteQueueReorderParams('thread', ['a','a']));
  assert.throws(() => remoteQueueReorderParams('thread', ['a','bad id']));
  assert.deepEqual(remoteQueueReorderParams('thread', ['b','a']), { threadId: 'thread', queuedSubmissionIds: ['b','a'] });
});
const { replaceQueueText } = require('../src/threadQueueRemote.ts');
test('editing queue text preserves rich input and resets only changed text spans', () => {
  const input = [{ type: 'text', text: 'first', text_elements: [{ start: 1 }] }, { type: 'localImage', path: 'C:/image.png' }, { type: 'skill', name: 'test', path: 'C:/skill' }, { type: 'text', text: 'second', text_elements: [{ start: 2 }] }];
  const saved = replaceQueueText(input, ['changed', 'second']);
  assert.deepEqual(saved, [{ type: 'text', text: 'changed', text_elements: [] }, ...input.slice(1)]);
  assert.equal(input[0].text, 'first');
  assert.throws(() => replaceQueueText(input, ['only one']));
  assert.throws(() => replaceQueueText(input, ['', 'second']));
});
