const test = require('node:test');
const assert = require('node:assert/strict');
const { readCodexModelPage } = require('../src/codexModelCatalog.ts');
test('Codex model pages validate rich catalog fields', () => {
  assert.equal(readCodexModelPage({ data: [{ id: 'm1', model: 'gpt', displayName: 'GPT', description: 'desc', hidden: false, supportedReasoningEfforts: [{ reasoningEffort: 'high', description: 'deep' }], multiAgentVersion: 'v2', serviceTiers: [{ id: 'fast', name: 'Fast', description: 'quick' }], defaultServiceTier: 'fast' }], nextCursor: 'next' }).data[0].multiAgentVersion, 'v2');
  assert.throws(() => readCodexModelPage({ data: [{ id: 'm1', model: 'gpt', displayName: 'GPT', description: 'desc', hidden: false, supportedReasoningEfforts: 'bad', serviceTiers: [] }] }));
  assert.throws(() => readCodexModelPage({ data: [{ id: 'm1', model: 'gpt', displayName: 'GPT', description: 'desc', hidden: false, supportedReasoningEfforts: [], serviceTiers: [] }], nextCursor: '' }));
});
test('catalog accepts empty descriptions and omitted defaulted service tiers', () => {
 const model = { id: 'm', model: 'm', displayName: 'Model', description: '', hidden: false, supportedReasoningEfforts: [{ reasoningEffort: 'high', description: '' }] };
 assert.deepEqual(readCodexModelPage({ data: [model] }).data[0].serviceTiers, []);
 assert.equal(readCodexModelPage({ data: [{ ...model, serviceTiers: [{ id: 'fast', name: 'Fast', description: '' }] }] }).data[0].serviceTiers[0].description, '');
 assert.throws(() => readCodexModelPage({ data: [{ ...model, serviceTiers: null }] }));
});
