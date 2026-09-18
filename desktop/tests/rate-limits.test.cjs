const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readRateLimits } = require('../src/rateLimits.ts');
test('rate limit windows validate and clone supported fields', () => {
  const value = readRateLimits({ rateLimits: { limitName: 'Plan', primary: { usedPercent: 42, windowDurationMins: 60, resetsAt: 123 }, secondary: null } });
  assert.deepEqual(value, { limitName: 'Plan', primary: { usedPercent: 42, windowDurationMins: 60, resetsAt: 123 }, secondary: undefined });
  for (const value of [null, {}, { rateLimits: { primary: { usedPercent: 101 } } }, { rateLimits: { primary: { usedPercent: 1, resetsAt: -1 } } }, { rateLimits: { limitName: 4 } }]) assert.throws(() => readRateLimits(value));
});
