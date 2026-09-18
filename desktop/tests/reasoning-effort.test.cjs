const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeState } = require('../src/store.ts');
const { readThreadResume } = require('../src/threadResume.ts');
test('all known upstream efforts survive settings and resume without conflating none and default', () => {
  for (const effort of ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra', 'persistent']) {
    assert.equal(decodeState(JSON.stringify({ reasoningEffort: effort })).reasoningEffort, effort);
    assert.equal(readThreadResume({ reasoningEffort: effort, thread: { id: 'a', turns: [] } }, 'a').reasoningEffort, effort);
  }
  assert.equal(decodeState('{"reasoningEffort":"default"}').reasoningEffort, 'default');
  assert.equal(readThreadResume({ reasoningEffort: null, thread: { id: 'a', turns: [] } }, 'a').reasoningEffort, 'default');
  assert.equal(decodeState('{"reasoningEffort":"unknown"}').reasoningEffort, 'low');
});
