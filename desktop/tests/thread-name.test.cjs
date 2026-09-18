const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readThreadName } = require('../src/threadName.ts');
test('thread name notification validates optional name', () => {
  assert.deepEqual(readThreadName({ threadId: 'a', threadName: 'Remote title' }), { threadId: 'a', name: 'Remote title' });
  assert.deepEqual(readThreadName({ threadId: 'a' }), { threadId: 'a' });
  for (const value of [null, {}, { threadId: '' }, { threadId: 'a', threadName: '' }, { threadId: 'a', threadName: ' bad' }, { threadId: 'a', threadName: 'bad\nname' }]) assert.equal(readThreadName(value), undefined);
});
