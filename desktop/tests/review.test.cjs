const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readReviewStartResponse, readReviewTarget } = require('../src/review.ts');
test('review response requires the requested thread and a turn identity', () => {
  assert.deepEqual(readReviewStartResponse({ reviewThreadId: 'thread', turn: { id: 'turn' } }, 'thread'), { reviewThreadId: 'thread', turnId: 'turn' });
  for (const value of [null, {}, { reviewThreadId: 'other', turn: { id: 'turn' } }, { reviewThreadId: 'thread', turn: {} }, { reviewThreadId: 'thread', turn: { id: 'bad\n' } }]) assert.throws(() => readReviewStartResponse(value, 'thread'));
});
test('review targets preserve supported protocol variants and reject malformed input', () => {
  assert.deepEqual(readReviewTarget({ type: 'uncommittedChanges' }), { type: 'uncommittedChanges' });
  assert.deepEqual(readReviewTarget({ type: 'baseBranch', branch: 'main' }), { type: 'baseBranch', branch: 'main' });
  assert.deepEqual(readReviewTarget({ type: 'commit', sha: 'abc', title: 'Fix' }), { type: 'commit', sha: 'abc', title: 'Fix' });
  assert.deepEqual(readReviewTarget({ type: 'custom', instructions: 'check errors' }), { type: 'custom', instructions: 'check errors' });
  for (const target of [null, {}, { type: 'baseBranch', branch: '' }, { type: 'commit', sha: 'x\n' }, { type: 'custom', instructions: '' }]) assert.throws(() => readReviewTarget(target));
});
