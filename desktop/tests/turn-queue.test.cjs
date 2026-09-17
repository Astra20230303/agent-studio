const test = require('node:test');
const assert = require('node:assert/strict');
const { finishQueuedTurn, restoreQueue } = require('../src/turnQueue.ts');
const item = { id: 'q', localId: 'local', threadId: 'a', text: 'next', model: 'test', effort: 'low', plugins: [], waitingOn: 'one', status: 'waiting' };
test('only successful completion of the matching thread and turn releases work', () => {
  assert.equal(finishQueuedTurn([item], 'b', 'one', true)[0].status, 'waiting');
  assert.equal(finishQueuedTurn([item], 'a', 'old', true)[0].status, 'waiting');
  assert.equal(finishQueuedTurn([item], 'a', 'one', true)[0].status, 'ready');
  assert.equal(finishQueuedTurn([item], 'a', 'one', false)[0].status, 'paused');
});
test('restored messages never auto-replay, especially an unconfirmed send', () => {
  assert.equal(restoreQueue(JSON.stringify([item]))[0].status, 'paused');
  assert.match(restoreQueue(JSON.stringify([{ ...item, status: 'sending' }]))[0].error, /结果未知/);
  assert.deepEqual(restoreQueue('invalid'), []);
});
