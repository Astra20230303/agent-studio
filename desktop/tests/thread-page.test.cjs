const { test } = require('node:test');
const assert = require('node:assert/strict');
const { threadPage } = require('../src/threadPage.ts');
test('reject invalid envelopes and cursors instead of accepting empty pages', () => {
  for (const input of [null, {}, { data: {} }, { data: [], nextCursor: {} }, { data: [], nextCursor: 12 }]) assert.throws(() => threadPage(input), /列表格式无效/);
});
test('retain valid records while removing invalid IDs and unsafe display/workspace fields', () => {
  const input = { data: [null, 7, { id: ' ' }, { id: 'a', name: {}, preview: 'Safe preview', cwd: { secret: true }, updatedAt: {}, status: { type: [] } }, { id: 'b', name: 'Valid', cwd: 'D:/repo', snippet: 'match', updatedAt: 12, status: { type: 'active' } }], nextCursor: 'next' };
  const original = structuredClone(input);
  const page = threadPage(input);
  assert.deepEqual(input, original);
  assert.equal(page.nextCursor, 'next');
  assert.deepEqual(page.data.map(item => item.id), ['a', 'b']);
  assert.equal(page.data[0].name, undefined); assert.equal(page.data[0].cwd, undefined);
  assert.equal(page.data[0].updatedAt, 0); assert.equal(page.data[1].cwd, 'D:/repo');
  assert.equal(page.data[1].snippet, 'match'); assert.equal(page.data[1].status.type, 'active');
});
test('legacy threads envelope and terminal page remain supported', () => {
  assert.equal(threadPage({ threads: [{ id: 'legacy' }], nextCursor: null }).data[0].id, 'legacy');
  assert.equal(threadPage({ data: [], nextCursor: '' }).nextCursor, undefined);
});
test('preserves valid thread sections and rejects malformed section identities', () => {
  const page = threadPage({ data: [{ id: 'grouped', section: { id: 'sec-1', name: '工作' } }] });
  assert.deepEqual(page.data[0].section, { id: 'sec-1', name: '工作' });
  assert.throws(() => threadPage({ data: [{ id: 'bad', section: { id: 'sec-1' } }] }), /分组信息无效/);
});
