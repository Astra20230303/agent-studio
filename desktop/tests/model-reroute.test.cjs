const test = require('node:test');
const assert = require('node:assert/strict');
const { readModelReroute } = require('../src/modelReroute.ts');
test('model reroute notifications validate all identities and reason', () => {
  assert.deepEqual(readModelReroute({ threadId: 't', turnId: 'u', fromModel: 'a', toModel: 'b', reason: 'fallback' }), { threadId: 't', turnId: 'u', fromModel: 'a', toModel: 'b', reason: 'fallback' });
  for (const value of [null, {}, { threadId: 't', turnId: 'u', fromModel: 'a', toModel: 'b', reason: '' }, { threadId: 't', turnId: 'u', fromModel: 'a', toModel: 'b', reason: 'bad\nreason' }, { threadId: 't', turnId: 'u', fromModel: 'a', toModel: 'b', reason: 1 }]) assert.equal(readModelReroute(value), undefined);
});
