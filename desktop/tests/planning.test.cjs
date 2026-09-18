const test = require('node:test');
const assert = require('node:assert/strict');
const { collaborationMode, readPlan, readPlanMessage } = require('../src/planning.ts');
const { restoreMessages } = require('../src/toolActivity.ts');
test('mode uses built-in instructions and explicit default exits planning', () => {
  assert.deepEqual(collaborationMode('default', 'test', 'high'), { mode: 'default', settings: { model: 'test', reasoning_effort: 'high', developer_instructions: null } });
});
test('plan progress validates statuses and history preserves proposed plan', () => {
  assert.equal(readPlan({ turnId: 't', plan: [{ step: 'one', status: 'completed' }, { step: 'bad', status: 'oops' }] }), undefined);
  const messages = restoreMessages([{ turnId: 't', item: { id: 'p', type: 'plan', text: 'Proposed plan' } }], []);
  assert.equal(messages[0].role, 'assistant'); assert.equal(messages[0].content, 'Proposed plan'); assert.equal(messages[0].turnId, 't');
});

test('model default explicitly clears collaboration effort in both modes', () => {
  for (const mode of ['default', 'plan']) assert.equal(collaborationMode(mode, 'test', 'default').settings.reasoning_effort, null);
});

test('progress snapshots steps and rejects invalid identity or partial invalid plans', () => {
  const params = { turnId: 'turn', plan: [{ step: 'Inspect', status: 'pending' }] };
  const snapshot = readPlan(params);
  params.plan[0].step = 'Mutated';
  assert.equal(snapshot.steps[0].step, 'Inspect');
  for (const turnId of [123, '', ' ', 'bad\n']) assert.equal(readPlan({ ...params, turnId }), undefined);
  for (const item of [null, {}, { step: '', status: 'pending' }, { step: 'text', status: 'invalid' }]) assert.equal(readPlan({ turnId: 'turn', plan: [params.plan[0], item] }), undefined);
  assert.deepEqual(readPlan({ turnId: 'turn', plan: [] }).steps, []);
});
test('plan completion requires scoped identities and string text', () => {
  const params = { threadId: 'thread', turnId: 'turn', item: { type: 'plan', id: 'proposal', text: 'Design' } };
  assert.deepEqual(readPlanMessage(params), { id: 'plan-proposal', turnId: 'turn', content: 'Design' });
  for (const field of ['threadId', 'turnId']) for (const value of [undefined, '', 123, {}]) assert.equal(readPlanMessage({ ...params, [field]: value }), undefined);
  for (const item of [{ ...params.item, id: '' }, { ...params.item, text: {} }, { ...params.item, type: 'agentMessage' }]) assert.equal(readPlanMessage({ ...params, item }), undefined);
});
