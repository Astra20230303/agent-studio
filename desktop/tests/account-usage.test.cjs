const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readAccountUsage } = require('../src/accountUsage.ts');
test('account token usage validates summary and bounds daily history', () => {
  const value = readAccountUsage({ summary: { lifetimeTokens: 10, currentStreakDays: null }, dailyUsageBuckets: Array.from({length: 20}, (_, i) => ({ startDate: `2026-09-${i + 1}`, tokens: i })) });
  assert.equal(value.summary.lifetimeTokens, 10); assert.equal(value.daily.length, 14); assert.equal(value.daily[0].tokens, 6);
  for (const bad of [null, {}, { summary: { lifetimeTokens: -1 } }, { summary: {}, dailyUsageBuckets: [{}] }, { summary: {}, dailyUsageBuckets: [{ startDate: 'x', tokens: -1 }] }]) assert.throws(() => readAccountUsage(bad));
});
