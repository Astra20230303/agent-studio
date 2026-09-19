const test = require('node:test');
const assert = require('node:assert/strict');
const { readModelSafetyBuffering } = require('../src/modelSafetyBuffering.ts');
test('model safety buffering notifications validate bounded arrays and flags', () => {
  assert.deepEqual(readModelSafetyBuffering({ threadId: 't', turnId: 'u', model: 'm', useCases: ['chat'], reasons: ['review', 'review'], showBufferingUi: true, fasterModel: 'fast' }), { threadId: 't', turnId: 'u', model: 'm', useCases: ['chat'], reasons: ['review'], showBufferingUi: true, fasterModel: 'fast' });
  for (const value of [null, {}, { threadId: 't', turnId: 'u', model: 'm', useCases: [], reasons: [], showBufferingUi: 1 }, { threadId: 't', turnId: 'u', model: 'm', useCases: ['bad\nvalue'], reasons: [], showBufferingUi: false }]) assert.equal(readModelSafetyBuffering(value), undefined);
});
