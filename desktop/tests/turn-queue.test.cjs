const test = require('node:test');
const assert = require('node:assert/strict');
const { finishQueuedTurn, pauseThreadQueue, restoreQueue, moveQueuedTurn } = require('../src/turnQueue.ts');
const item = { id: 'q', localId: 'local', threadId: 'a', text: 'next', model: 'test', effort: 'low', plugins: [], waitingOn: 'one', status: 'waiting' };
test('reordering swaps paused neighbors within one thread, preserves other threads and stops at boundaries', () => {
  const first = { ...item, status: 'paused' }, other = { ...item, id: 'other', threadId: 'b' };
  const last = { ...first, id: 'last', attachments: ['D:/photo.png'] };
  const queue = [first, other, last];
  assert.deepEqual(moveQueuedTurn(queue, 'last', -1), [last, other, first]);
  assert.deepEqual(moveQueuedTurn(queue, 'q', 1), [last, other, first]);
  assert.equal(moveQueuedTurn(queue, 'q', -1), queue);
  assert.equal(moveQueuedTurn(queue, 'last', 1), queue);
  assert.equal(moveQueuedTurn(queue, 'missing', 1), queue);
  for (const status of ['sending', 'ready', 'waiting']) {
    const locked = [{ ...first, status }, last];
    assert.equal(moveQueuedTurn(locked, 'last', -1), locked);
    assert.equal(moveQueuedTurn(locked, 'q', 1), locked);
  }
  assert.deepEqual(queue, [first, other, last]);
  const moved = moveQueuedTurn(queue, 'last', -1);
  const restored = restoreQueue(JSON.stringify(moved));
  assert.deepEqual(restored.map(({ id, attachments }) => ({ id, attachments })), moved.map(({ id, attachments }) => ({ id, attachments })));
  assert.ok(restored.every(item => item.status === 'paused'));
  assert.deepEqual(moveQueuedTurn(moved, 'last', 1), queue);
});
test('manual pause is thread-scoped and does not reclassify an in-flight send', () => {
  const queue = [item, { ...item, id: 'sending', status: 'sending' }, { ...item, id: 'other', localId: 'elsewhere' }];
  const paused = pauseThreadQueue(queue, 'local');
  assert.deepEqual(paused.map(item => item.status), ['paused', 'sending', 'waiting']);
  assert.equal(finishQueuedTurn(paused, 'a', 'one', true)[0].status, 'paused');
  assert.equal(queue[0].status, 'waiting');
});
test('only successful completion of the matching thread and turn releases work', () => {
  assert.equal(finishQueuedTurn([item], 'b', 'one', true)[0].status, 'waiting');
  assert.equal(finishQueuedTurn([item], 'a', 'old', true)[0].status, 'waiting');
  assert.equal(finishQueuedTurn([item], 'a', 'one', true)[0].status, 'ready');
  assert.equal(finishQueuedTurn([item], 'a', 'one', false)[0].status, 'paused');
});
test('restored messages never auto-replay, especially an unconfirmed send', () => {
  assert.equal(restoreQueue(JSON.stringify([item]))[0].status, 'paused');
  assert.match(restoreQueue(JSON.stringify([{ ...item, status: 'sending' }]))[0].error, /结果未知/);
  assert.throws(() => restoreQueue('invalid'));
});

test('malformed queues fail as a whole without silently dropping records', () => {
  for (const raw of ['', '{}', 'null', JSON.stringify([item, null]), JSON.stringify([item, item])]) assert.throws(() => restoreQueue(raw));
  for (const changed of [{ id: '' }, { plugins: [null] }, { attachments: [1] }, { skills: [{ name: 'x' }] }, { cwd: {} }, { waitingOn: 5 }]) {
    assert.throws(() => restoreQueue(JSON.stringify([item, { ...item, id: 'other', ...changed }])));
  }
  assert.deepEqual(restoreQueue(null), []);
  assert.deepEqual(restoreQueue('[]'), []);
});
