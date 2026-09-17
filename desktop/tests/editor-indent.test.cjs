const test = require('node:test');
const assert = require('node:assert/strict');
const { indentSelection } = require('../src/editorIndent.ts');
test('indent respects selection line boundaries and keeps cursor within unindented text', () => {
  assert.deepEqual(indentSelection('a\nb\nc', 0, 2, false), { text: '  a\nb\nc', start: 2, end: 4 });
  assert.deepEqual(indentSelection('\nrest', 0, 0, true), { text: '\nrest', start: 0, end: 0 });
  assert.deepEqual(indentSelection('\tvalue', 0, 0, true), { text: 'value', start: 0, end: 0 });
  assert.deepEqual(indentSelection(' value', 1, 1, true), { text: 'value', start: 0, end: 0 });
  assert.deepEqual(indentSelection('ab', 1, 1, false), { text: 'a  b', start: 3, end: 3 });
  const original = 'alpha\nbeta';
  const indented = indentSelection(original, 0, original.length, false);
  assert.equal(indentSelection(indented.text, indented.start, indented.end, true).text, original);
});
