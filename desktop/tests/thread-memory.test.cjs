const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateThreadMemoryInput } = require('../src/threadMemory.ts');
test('thread memory mode validates identity and supported values', () => {
  assert.equal(validateThreadMemoryInput('thread', 'enabled'), 'enabled');
  assert.equal(validateThreadMemoryInput('thread', 'disabled'), 'disabled');
  for (const pair of [['', 'enabled'], ['thread id', 'enabled'], ['thread', 'unknown']]) assert.throws(() => validateThreadMemoryInput(...pair));
});
