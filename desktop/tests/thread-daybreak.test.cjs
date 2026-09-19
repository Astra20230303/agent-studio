const test = require('node:test');
const assert = require('node:assert/strict');
const { updateThreadDaybreakParams } = require('../src/threadMetadata.ts');
const { readThreadResume } = require('../src/threadResume.ts');
test('thread Daybreak metadata is validated and restored', () => {
  assert.deepEqual(updateThreadDaybreakParams('thread-1', true), { threadId: 'thread-1', daybreakEnabled: true });
  assert.equal(readThreadResume({ thread: { id: 'thread-1', turns: [], daybreakEnabled: false } }, 'thread-1').daybreakEnabled, false);
  assert.throws(() => updateThreadDaybreakParams('thread-1', 'true'));
  assert.throws(() => readThreadResume({ thread: { id: 'thread-1', turns: [], daybreakEnabled: 'yes' } }, 'thread-1'));
});
