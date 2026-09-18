const { test } = require('node:test');
const assert = require('node:assert/strict');
const { threadStatusLabel, threadStatusMark } = require('../src/threadStatusPresentation.ts');

test('maps thread states to concise accessible sidebar labels and marks', () => {
  assert.equal(threadStatusMark('running'), '…');
  assert.equal(threadStatusMark('needs_input'), '!');
  assert.equal(threadStatusMark('failed'), '×');
  assert.equal(threadStatusMark('completed'), undefined);
  assert.equal(threadStatusLabel.needs_input, '等待输入');
});
