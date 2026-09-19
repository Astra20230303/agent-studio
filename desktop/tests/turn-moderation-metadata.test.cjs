const test = require('node:test');
const assert = require('node:assert/strict');
const { readTurnModerationMetadata } = require('../src/turnModerationMetadata.ts');
test('turn moderation metadata validates identities and bounds JSON', () => {
  const value = readTurnModerationMetadata({ threadId: 'thread', turnId: 'turn', metadata: { risk: 'low' } });
  assert.deepEqual(value, { turnId: 'turn', metadata: { risk: 'low' } });
  assert.equal(readTurnModerationMetadata({ threadId: 'thread', turnId: 'turn' }), undefined);
  assert.equal(readTurnModerationMetadata({ threadId: 'thread\n', turnId: 'turn', metadata: {} }), undefined);
  assert.equal(readTurnModerationMetadata({ threadId: 'thread', turnId: 'turn', metadata: 'x'.repeat(128 * 1024) }), undefined);
});
test('moderation metadata rejects non-JSON, cycles and excessive depth without throwing', () => {
 const cycle = {}; cycle.self = cycle;
 let deep = {}; for (let i = 0; i < 80; i++) deep = { nested: deep };
 for (const metadata of [undefined, () => {}, Symbol('x'), 1n, NaN, Infinity, { fn: () => {} }, cycle, deep, new Map()]) {
  assert.equal(readTurnModerationMetadata({ threadId: 't', turnId: 'u', metadata }), undefined);
 }
 const metadata = { score: 0, values: [false, null, 'text'] };
 const parsed = readTurnModerationMetadata({ threadId: 't', turnId: 'u', metadata });
 metadata.values.push('later');
 assert.deepEqual(parsed.metadata, { score: 0, values: [false, null, 'text'] });
 assert.equal(readTurnModerationMetadata({ threadId: 't\0', turnId: 'u', metadata }), undefined);
});
