const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readReviewStartResponse } = require('../src/review.ts');
test('review response requires the requested thread and a turn identity', () => {
  assert.deepEqual(readReviewStartResponse({ reviewThreadId: 'thread', turn: { id: 'turn' } }, 'thread'), { reviewThreadId: 'thread', turnId: 'turn' });
  for (const value of [null, {}, { reviewThreadId: 'other', turn: { id: 'turn' } }, { reviewThreadId: 'thread', turn: {} }, { reviewThreadId: 'thread', turn: { id: 'bad\n' } }]) assert.throws(() => readReviewStartResponse(value, 'thread'));
});
