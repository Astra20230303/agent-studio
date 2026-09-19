const test = require('node:test');
const assert = require('node:assert/strict');
const { readCodexProviderCapabilities } = require('../src/codexProviderCapabilities.ts');
test('Codex provider capability responses validate all flags', () => {
  assert.deepEqual(readCodexProviderCapabilities({ namespaceTools: true, imageGeneration: false, webSearch: true }), { namespaceTools: true, imageGeneration: false, webSearch: true });
  for (const value of [null, {}, { namespaceTools: true, imageGeneration: false, webSearch: 'yes' }]) assert.throws(() => readCodexProviderCapabilities(value));
});
