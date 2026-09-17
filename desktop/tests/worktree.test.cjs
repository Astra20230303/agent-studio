const test = require('node:test'); const assert = require('node:assert/strict');
const fs = require('node:fs/promises'); const path = require('node:path'); const { execFileSync } = require('node:child_process');
const { workspaceGit } = require('../electron/workspace-git.cjs');
test('worktree starts from HEAD and leaves dirty source unchanged', async t => {
  const base = path.resolve(__dirname, '../../.project-cache/tmp'); await fs.mkdir(base, { recursive: true });
  const fixture = await fs.mkdtemp(path.join(base, 'worktree-')); const root = path.join(fixture, 'repo'); await fs.mkdir(root);
  t.after(() => fs.rm(fixture, { recursive: true, force: true }));
  const git = (args, cwd = root) => execFileSync('git', args, { cwd, windowsHide: true, encoding: 'utf8' }).trim();
  git(['init']); git(['config', 'user.name', 'Test']); git(['config', 'user.email', 'test@example.invalid']); await fs.writeFile(path.join(root, 'file.txt'), 'committed'); git(['add', '.']); git(['commit', '-m', 'base']); await fs.writeFile(path.join(root, 'file.txt'), 'dirty');
  const project = await workspaceGit({ root, action: 'create-worktree', branch: 'codex/feature' });
  assert.equal(project.environment, 'worktree'); assert.equal(git(['branch', '--show-current'], project.path), 'codex/feature');
  assert.equal(await fs.readFile(path.join(project.path, 'file.txt'), 'utf8'), 'committed'); assert.equal(await fs.readFile(path.join(root, 'file.txt'), 'utf8'), 'dirty');
  await assert.rejects(workspaceGit({ root, action: 'create-worktree', branch: 'codex/feature' }), /already exists/);
  await assert.rejects(workspaceGit({ root, action: 'create-worktree', branch: '../invalid' }));
  await assert.rejects(workspaceGit({ root, action: 'create-worktree', branch: '@{-1}' }));
  await assert.rejects(workspaceGit({ root, action: 'create-worktree', branch: '--detach' }));
  assert.equal(git(['worktree', 'list', '--porcelain']).split('worktree ').length - 1, 2);
});
