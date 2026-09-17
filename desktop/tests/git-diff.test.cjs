const { test } = require('node:test');
const assert = require('node:assert/strict');
const { diffRows } = require('../src/gitDiff.ts');
test('references track old/new lines across hunks including empty ranges', () => {
  const rows = diffRows('@@ -10,2 +10,2 @@\n-old\n+new\n context\n@@ -20,0 +21 @@\n+inserted');
  assert.deepEqual(rows.filter(row => row.line).map(({ line, side }) => [line, side]), [[10, 'old'], [10, 'new'], [11, 'new'], [21, 'new']]);
});
test('file metadata and truncated tails never become reviewable source lines', () => {
  const rows = diffRows('@@ -1 +1 @@\n-old\n+new\ndiff --git a/b b/b\n--- a/b\n+++ b/b\n@@ -5,2 +5,2 @@\n context\n...truncated\n+not source');
  assert.deepEqual(rows.filter(row => row.line).map(row => row.text), ['-old', '+new', ' context']);
});
test('no-newline markers preserve coordinates of the following change', () => {
  const rows = diffRows('@@ -1 +1 @@\n-old\n\\ No newline at end of file\n+new');
  assert.equal(rows[3].line, 1);
  assert.equal(rows[3].side, 'new');
});
