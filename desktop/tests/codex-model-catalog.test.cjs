const test = require('node:test');
const assert = require('node:assert/strict');
const { readCodexModelPage } = require('../src/codexModelCatalog.ts');
test('Codex model pages validate rich catalog fields', () => {
  assert.equal(readCodexModelPage({ data: [{ id: 'm1', model: 'gpt', displayName: 'GPT', description: 'desc', hidden: false, supportedReasoningEfforts: [{ reasoningEffort: 'high', description: 'deep' }], multiAgentVersion: 'v2', serviceTiers: [{ id: 'fast', name: 'Fast', description: 'quick' }], defaultServiceTier: 'fast' }], nextCursor: 'next' }).data[0].multiAgentVersion, 'v2');
  assert.throws(() => readCodexModelPage({ data: [{ id: 'm1', model: 'gpt', displayName: 'GPT', description: 'desc', hidden: false, supportedReasoningEfforts: 'bad', serviceTiers: [] }] }));
  assert.throws(() => readCodexModelPage({ data: [{ id: 'm1', model: 'gpt', displayName: 'GPT', description: 'desc', hidden: false, supportedReasoningEfforts: [], serviceTiers: [] }], nextCursor: '' }));
});
