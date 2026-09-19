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
