const test = require('node:test');
const assert = require('node:assert/strict');
const { validateFeedbackInput, readFeedbackUpload } = require('../src/feedback.ts');

test('feedback input trims safe fields and omits empty optional values', () => {
  assert.deepEqual(validateFeedbackInput({ classification: ' bug ', reason: '  details ', threadId: 'thread-1', includeLogs: true }), { classification: 'bug', reason: 'details', threadId: 'thread-1', includeLogs: true });
  assert.deepEqual(validateFeedbackInput({ classification: 'feature', reason: '  ' }), { classification: 'feature' });
});

test('feedback validation rejects malformed input and response', () => {
  for (const value of [null, {}, { classification: '' }, { classification: 'bug', reason: 'x'.repeat(10001) }, { classification: 'bug', threadId: 'bad id' }]) assert.throws(() => validateFeedbackInput(value), /反馈/);
  assert.deepEqual(readFeedbackUpload({ threadId: 'feedback-1' }), { threadId: 'feedback-1' });
  assert.throws(() => readFeedbackUpload({ threadId: '' }), /反馈响应/);
});
