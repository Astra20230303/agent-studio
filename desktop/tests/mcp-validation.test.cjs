const test = require('node:test'); const assert = require('node:assert/strict');
const { validateMcpContent } = require('../src/mcpValidation.ts');
const schema = { type: 'object', required: ['count', 'enabled'], properties: { count: { type: 'integer', minimum: 1, maximum: 5 }, enabled: { type: 'boolean' }, when: { type: 'string', format: 'date-time' }, choice: { type: 'string', enum: ['a', 'b'] } } };
test('typed content accepts false and rejects out-of-range or fractional numbers', () => {
  assert.equal(validateMcpContent(schema, { count: 2, enabled: false }), undefined);
  for (const count of [0, 6, 1.5, Infinity]) assert.ok(validateMcpContent(schema, { count, enabled: false }));
});
test('required, enum and time constraints are checked independently of browser inputs', () => {
  assert.ok(validateMcpContent(schema, { count: 2 }));
  assert.ok(validateMcpContent(schema, { count: 2, enabled: true, when: 'tomorrow' }));
  assert.ok(validateMcpContent(schema, { count: 2, enabled: true, choice: 'c' }));
  assert.equal(validateMcpContent(schema, { count: 2, enabled: true, when: '2026-09-17T10:00:00Z' }), undefined);
});
test('invalid schemas fail without throwing and repeated schemas remain independent', () => {
  assert.ok(validateMcpContent({ type: 'object', properties: { value: { type: 'invalid-type' } } }, {}));
  for (let index = 0; index < 30; index++) {
    const form = { type: 'object', properties: { value: { type: 'integer', maximum: index } } };
    assert.equal(validateMcpContent(form, { value: index }), undefined);
    assert.ok(validateMcpContent(form, { value: index + 1 }));
  }
});
