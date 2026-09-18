const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readThreadGoal } = require('../src/threadGoal.ts');
test('thread goal validates status, identity, budget and usage', () => {
  const value = readThreadGoal({ threadId: 'a', goal: { threadId: 'a', objective: 'Ship feature', status: 'active', tokenBudget: 100, tokensUsed: 4, timeUsedSeconds: 2 } });
  assert.deepEqual(value.goal, { objective: 'Ship feature', status: 'active', tokenBudget: 100, tokensUsed: 4, timeUsedSeconds: 2 });
  for (const bad of [{ status: 'future' }, { status: 'active', objective: '' }, { status: 'active', objective: 'x', tokensUsed: -1 }, { status: 'active', objective: 'x', tokensUsed: 1, timeUsedSeconds: 0, threadId: 'other' }]) assert.equal(readThreadGoal({ threadId: 'a', goal: { threadId: 'a', ...bad } }), undefined);
});
