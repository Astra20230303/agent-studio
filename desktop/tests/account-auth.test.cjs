const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readAccountLoginStart, readAccountLoginCompleted } = require('../src/accountAuth.ts');

test('validates browser and device login responses', () => {
  assert.deepEqual(readAccountLoginStart({ type: 'chatgpt', loginId: 'login-1', authUrl: 'https://example.test/login' }), { kind: 'chatgpt', loginId: 'login-1', authUrl: 'https://example.test/login' });
  assert.deepEqual(readAccountLoginStart({ type: 'chatgptDeviceCode', loginId: 'login-2', verificationUrl: 'https://example.test/device', userCode: 'ABCD-EFGH' }), { kind: 'chatgptDeviceCode', loginId: 'login-2', verificationUrl: 'https://example.test/device', userCode: 'ABCD-EFGH' });
  assert.deepEqual(readAccountLoginStart({ type: 'apiKey' }), { kind: 'apiKey' });
  assert.throws(() => readAccountLoginStart({ type: 'chatgpt', loginId: 'login', authUrl: 'javascript:alert(1)' }), /登录响应无效/);
});

test('isolates completion identities and preserves safe errors', () => {
  assert.deepEqual(readAccountLoginCompleted({ success: true, loginId: 'login-1' }), { success: true, loginId: 'login-1', error: undefined });
  assert.deepEqual(readAccountLoginCompleted({ success: false, loginId: 'login-1', error: '取消' }), { success: false, loginId: 'login-1', error: '取消' });
  assert.equal(readAccountLoginCompleted({ success: 'yes', loginId: 'login-1' }), undefined);
  assert.equal(readAccountLoginCompleted({ success: true, loginId: 'bad\nid' }), undefined);
});
