const test = require('node:test');
const assert = require('node:assert/strict');
const { reduceTurn } = require('../src/turnRuntime.ts');

test('late start response cannot resurrect an already completed turn', () => {
  const done = reduceTurn(undefined, { type: 'finish', turnId: 'one' });
  assert.equal(reduceTurn(done, { type: 'start', turnId: 'one' }).turnId, undefined);
});
test('completion of an older turn does not clear the current turn', () => {
  const running = reduceTurn(undefined, { type: 'start', turnId: 'new' });
  assert.equal(reduceTurn(running, { type: 'finish', turnId: 'old' }).turnId, 'new');
});
test('stale restore cannot erase a newer live notification', () => {
  const running = reduceTurn(undefined, { type: 'start', turnId: 'live' });
  assert.equal(reduceTurn(running, { type: 'restore', revision: 0 }).turnId, 'live');
  assert.equal(reduceTurn(running, { type: 'restore', revision: running.revision }).turnId, undefined);
});
test('activity for another turn does not replace current progress', () => {
  const running = reduceTurn(undefined, { type: 'start', turnId: 'live' });
  assert.equal(reduceTurn(running, { type: 'activity', turnId: 'old', activity: 'retrying' }).activity, running.activity);
});
