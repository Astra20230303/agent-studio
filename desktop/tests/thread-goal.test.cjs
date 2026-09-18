const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readThreadGoal, readThreadGoalResponse, readThreadGoalClearResponse, validateThreadGoalInput } = require('../src/threadGoal.ts');
test('thread goal validates status, identity, budget and usage', () => {
  const value = readThreadGoal({ threadId: 'a', goal: { threadId: 'a', objective: 'Ship feature', status: 'active', tokenBudget: 100, tokensUsed: 4, timeUsedSeconds: 2 } });
  assert.deepEqual(value.goal, { objective: 'Ship feature', status: 'active', tokenBudget: 100, tokensUsed: 4, timeUsedSeconds: 2 });
  for (const bad of [{ status: 'future' }, { status: 'active', objective: '' }, { status: 'active', objective: 'x', tokensUsed: -1 }, { status: 'active', objective: 'x', tokensUsed: 1, timeUsedSeconds: 0, threadId: 'other' }]) assert.equal(readThreadGoal({ threadId: 'a', goal: { threadId: 'a', ...bad } }), undefined);
});
test('goal commands validate params and strict responses', () => {
  assert.deepEqual(validateThreadGoalInput('a', { objective: ' Ship ', status: 'paused', tokenBudget: null }), { threadId: 'a', objective: 'Ship', status: 'paused', tokenBudget: null });
  for (const input of [{ objective: '' }, { status: 'future' }, { tokenBudget: -1 }, { tokenBudget: 1.2 }]) assert.throws(() => validateThreadGoalInput('a', input));
  assert.throws(() => readThreadGoalResponse({ goal: { threadId: 'b', objective: 'x', status: 'active', tokensUsed: 0, timeUsedSeconds: 0 } }, 'a'));
  assert.equal(readThreadGoalResponse({ goal: null }, 'a'), undefined);
  assert.equal(readThreadGoalClearResponse({ cleared: true }), true);
  assert.throws(() => readThreadGoalClearResponse({ cleared: false }));
});
