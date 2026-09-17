const test = require('node:test');
const assert = require('node:assert/strict');
const { collaborationMode, readPlan } = require('../src/planning.ts');
const { restoreMessages } = require('../src/toolActivity.ts');
test('mode uses built-in instructions and explicit default exits planning', () => {
  assert.deepEqual(collaborationMode('default', 'test', 'high'), { mode: 'default', settings: { model: 'test', reasoning_effort: 'high', developer_instructions: null } });
});
test('plan progress validates statuses and history preserves proposed plan', () => {
  assert.equal(readPlan({ turnId: 't', plan: [{ step: 'one', status: 'completed' }, { step: 'bad', status: 'oops' }] }).steps.length, 1);
  const messages = restoreMessages([{ turnId: 't', item: { id: 'p', type: 'plan', text: 'Proposed plan' } }], []);
  assert.equal(messages[0].role, 'assistant'); assert.equal(messages[0].content, 'Proposed plan'); assert.equal(messages[0].turnId, 't');
});
