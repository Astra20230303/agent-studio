const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readThreadSections, readThreadSection } = require('../src/threadSections.ts');
test('thread sections validate identities and duplicates', () => {
  assert.deepEqual(readThreadSections({ data: [{ id: 'a', name: 'Work' }] }), [{ id: 'a', name: 'Work' }]);
  assert.deepEqual(readThreadSection({ section: { id: 'a', name: 'Work' } }), { id: 'a', name: 'Work' });
  for (const value of [null, {}, { data: [{ id: 'a', name: 'x' }, { id: 'a', name: 'y' }] }, { section: { id: '', name: 'x' } }]) assert.throws(() => value?.section ? readThreadSection(value) : readThreadSections(value));
});
