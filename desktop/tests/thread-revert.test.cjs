const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readThreadRevertResponse } = require('../src/threadRevert.ts');
test('thread revert response is tied to the requested thread', () => {
  assert.deepEqual(readThreadRevertResponse({ thread: { id: 'a' }, turnsBackwardsCursor: 't', itemsBackwardsCursor: null }, 'a'), { threadId: 'a', turnsBackwardsCursor: 't', itemsBackwardsCursor: null });
  for (const value of [null, {}, { thread: { id: 'b' } }, { thread: { id: 'a' }, turnsBackwardsCursor: 4 }, { thread: { id: 'a' }, itemsBackwardsCursor: {} }]) assert.throws(() => readThreadRevertResponse(value, 'a'));
});
