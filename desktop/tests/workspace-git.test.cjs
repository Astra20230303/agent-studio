const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { workspaceGit, parseStatus } = require('../electron/workspace-git.cjs');
test('status parser preserves rename paths and spaces', () => {
  assert.deepEqual(parseStatus('R  new name\0old name\0?? extra\0'), [{ path: 'new name', original: 'old name', index: 'R', working: ' ', untracked: false }, { path: 'extra', original: undefined, index: '?', working: '?', untracked: true }]);
});
test('real repository separates staged, unstaged and untracked content', async t => {
  const base = path.resolve(__dirname, '../../.project-cache/tmp'); await fs.mkdir(base, { recursive: true });
  const root = await fs.mkdtemp(path.join(base, 'git-review-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const git = args => execFileSync('git', args, { cwd: root, windowsHide: true, stdio: 'pipe' });
  git(['init']); git(['config', 'user.name', 'Test']); git(['config', 'user.email', 'test@example.invalid']);
  await fs.writeFile(path.join(root, 'a.txt'), 'base\n'); git(['add', '.']); git(['commit', '-m', 'base']);
  await fs.writeFile(path.join(root, 'a.txt'), 'staged\n'); git(['add', '.']);
  await fs.writeFile(path.join(root, 'a.txt'), 'working\n');
  await fs.writeFile(path.join(root, 'new file.txt'), 'untracked\n');
  const status = await workspaceGit({ root, action: 'status' });
  assert.equal(status.files.find(file => file.path === 'a.txt').index, 'M');
  assert.match((await workspaceGit({ root, action: 'diff', path: 'a.txt', staged: true })).diff, /\+staged/);
  assert.match((await workspaceGit({ root, action: 'diff', path: 'a.txt', staged: false })).diff, /\+working/);
  assert.match((await workspaceGit({ root, action: 'diff', path: 'new file.txt' })).diff, /\+untracked/);
  await assert.rejects(workspaceGit({ root, action: 'diff', path: '../outside' }), /刷新/);
});
