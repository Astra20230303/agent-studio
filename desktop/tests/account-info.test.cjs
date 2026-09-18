const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readAccountInfo } = require('../src/accountInfo.ts');
test('account info validates supported account variants', () => {
  assert.deepEqual(readAccountInfo({ requiresOpenaiAuth: false, account: { type: 'chatgpt', email: 'a@b', planType: 'pro' } }), { kind: 'chatgpt', email: 'a@b', planType: 'pro', requiresOpenAiAuth: false });
  assert.deepEqual(readAccountInfo({ requiresOpenAIAuth: true, account: null }), { kind: 'apiKey', requiresOpenAiAuth: true });
  for (const value of [null, {}, { requiresOpenaiAuth: false, account: { type: 'chatgpt', planType: 4 } }, { requiresOpenaiAuth: false, account: { type: 'unknown' } }]) assert.throws(() => readAccountInfo(value));
});
