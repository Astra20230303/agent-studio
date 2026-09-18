const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recordGitAction } = require('../src/gitAudit.ts');
test('only known write actions produce fixed audit labels without details', () => {
  const calls = [];
  for (const action of ['stage','unstage','stage-all','unstage-all','commit','fetch','pull','pull-merge','push','publish','stash','stash-pop','merge-branch','create-branch','delete-branch','track-branch','switch-branch','create-worktree','remove-worktree']) recordGitAction(action, (...args) => calls.push(args));
  assert.equal(calls.length, 19);
  assert.ok(calls.every(args => args.length === 1 && args[0].startsWith('Git ')));
  assert.equal(new Set(calls.map(args => args[0])).size, 19);
  for (const action of ['status','diff','history','open-worktree','D:/secret','toString','constructor']) recordGitAction(action, (...args) => calls.push(args));
  assert.equal(calls.length, 19);
});
