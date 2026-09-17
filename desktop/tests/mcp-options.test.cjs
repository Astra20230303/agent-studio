const test = require('node:test'); const assert = require('node:assert/strict');
const { mcpOptions, supportedMcpField } = require('../src/mcpOptions.ts');
const { validateMcpContent } = require('../src/mcpValidation.ts');
test('titled single and multiple choices retain wire values', () => {
  assert.deepEqual(mcpOptions({ oneOf: [{ const: 'a', title: 'Label A' }] }), [{ value: 'a', label: 'Label A' }]);
  assert.equal(supportedMcpField({ type: 'array', items: { anyOf: [{ const: 'a', title: 'A' }] } }), true);
  assert.equal(supportedMcpField({ type: 'array', items: { type: 'object' } }), false);
});
test('array choice constraints reject too few, too many and unknown values', () => {
  const schema = { type: 'object', required: ['choices'], properties: { choices: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'string', enum: ['a', 'b', 'c'] } } } };
  for (const choices of [[], ['a', 'b', 'c'], ['unknown']]) assert.ok(validateMcpContent(schema, { choices }));
  assert.equal(validateMcpContent(schema, { choices: ['a', 'b'] }), undefined);
});
