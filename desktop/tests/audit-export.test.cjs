const { test } = require('node:test');
const assert = require('node:assert/strict');
const { auditExport } = require('../src/auditExport.ts');
test('exports exact selected records with scope and safe code fences, without extra properties', () => {
  const entries = [{ id: 'one', at: '2026-09-19T00:00:00Z', action: '归档会话', detail: '```literal```', secret: 'not-a-field' }];
  const snapshot = auditExport(entries, ' 归档 ', 'now');
  entries[0].action = 'Changed';
  assert.equal(snapshot.count, 1);
  assert.match(snapshot.content, /搜索条件："归档"/);
  assert.match(snapshot.content, /最近 200 条/);
  assert.match(snapshot.content, /````json/);
  assert.match(snapshot.content, /归档会话/);
  assert.doesNotMatch(snapshot.content, /not-a-field|Changed/);
});
test('empty export is rejected and legacy project paths stay redacted', () => {
  assert.throws(() => auditExport([], ''), /没有可导出/);
  assert.doesNotMatch(auditExport([{ id: 'one', at: 'now', action: '切换项目', detail: 'D:/private' }], '').content, /private/);
});
