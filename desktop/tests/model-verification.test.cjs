const test = require('node:test');
const assert = require('node:assert/strict');
const { readModelVerification } = require('../src/modelVerification.ts');
test('model verification notifications validate and deduplicate verification names', () => {
  assert.deepEqual(readModelVerification({ threadId: 't', turnId: 'u', verifications: ['trustedAccessForCyber', 'trustedAccessForCyber'] }), { threadId: 't', turnId: 'u', verifications: ['trustedAccessForCyber'] });
  for (const value of [null, {}, { threadId: 't', turnId: 'u', verifications: ['bad\nvalue'] }, { threadId: 't', turnId: 'u', verifications: [1] }]) assert.equal(readModelVerification(value), undefined);
});
