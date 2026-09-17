const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises'); const path = require('node:path'); const { execFileSync } = require('node:child_process');
const { workspaceGit } = require('../electron/workspace-git.cjs');
test('stage, unstage and commit use explicit paths and preserve current content', async t => {
  const base = path.resolve(__dirname, '../../.project-cache/tmp'); await fs.mkdir(base, { recursive: true }); const root = await fs.mkdtemp(path.join(base, 'git-write-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  const git = args => execFileSync('git', args, { cwd: root, windowsHide: true });
  git(['init']); git(['config', 'user.name', 'Test']); git(['config', 'user.email', 'test@example.invalid']); await fs.writeFile(path.join(root, 'a.txt'), 'base'); git(['add', '.']); git(['commit', '-m', 'base']); await fs.writeFile(path.join(root, 'a.txt'), 'change');
  await workspaceGit({ root, action: 'stage', path: 'a.txt' }); assert.match((await workspaceGit({ root, action: 'status' })).files[0].index, /M/);
  await workspaceGit({ root, action: 'unstage', path: 'a.txt' }); assert.equal((await workspaceGit({ root, action: 'status' })).files[0].index, ' ');
  await workspaceGit({ root, action: 'stage', path: 'a.txt' }); const result = await workspaceGit({ root, action: 'commit', message: 'safe change' }); assert.match(result.commit, /^[0-9a-f]{40}$/); assert.equal(await fs.readFile(path.join(root, 'a.txt'), 'utf8'), 'change');
  await assert.rejects(workspaceGit({ root, action: 'commit', message: '  ' }), /有效提交/);
});
test('unstage before the first commit preserves later working changes', async t => {
  const base = path.resolve(__dirname, '../../.project-cache/tmp'); await fs.mkdir(base, { recursive: true }); const root = await fs.mkdtemp(path.join(base, 'git-unborn-')); t.after(() => fs.rm(root, { recursive: true, force: true }));
  execFileSync('git', ['init'], { cwd: root, windowsHide: true });
  await fs.writeFile(path.join(root, 'new.txt'), 'staged');
  await workspaceGit({ root, action: 'stage', path: 'new.txt' });
  await fs.writeFile(path.join(root, 'new.txt'), 'newer edits');
  await workspaceGit({ root, action: 'unstage', path: 'new.txt' });
  assert.equal(await fs.readFile(path.join(root, 'new.txt'), 'utf8'), 'newer edits');
  assert.equal((await workspaceGit({ root, action: 'status' })).files[0].untracked, true);
});
