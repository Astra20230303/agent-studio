const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { workspaceGit } = require('../electron/workspace-git.cjs');
test('remove registered clean worktree retains branch and protects local data', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-remove-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const root = path.join(dir, 'main'), child = path.join(dir, 'child'); await fs.mkdir(root);
  const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8', stdio: 'pipe' }).trim();
  git('init', '-b', 'main'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
  await fs.writeFile(path.join(root, '.gitignore'), '*.cache'); git('add', '.'); git('commit', '-m', 'base');
  git('worktree', 'add', '-b', 'feature', child);
  const entries = (await workspaceGit({ root, action: 'worktrees' })).worktrees;
  const entry = entries.find(e => e.branch === 'feature');
  const childEntries = (await workspaceGit({ root: child, action: 'worktrees' })).worktrees;
  assert.equal(childEntries.find(e => e.branch === 'main').primary, true);
  assert.equal(childEntries.find(e => e.branch === 'feature').current, true);
  assert.equal(childEntries.find(e => e.branch === 'feature').primary, false);
  const remove = extra => workspaceGit({ root, action: 'remove-worktree', path: entry.path, expectedHead: entry.head, ...extra });
  await assert.rejects(remove({ path: entries.find(e => e.branch === 'main').path }), /主工作树/);
  await assert.rejects(remove({ root: child }), /当前/);
  await assert.rejects(remove({ expectedHead: 'stale' }), /变化/);
  git('worktree', 'lock', child); await assert.rejects(remove(), /锁定/); git('worktree', 'unlock', child);
  for (const name of ['data.cache', 'untracked.txt', '.gitignore']) {
    await fs.writeFile(path.join(child, name), 'keep'); await assert.rejects(remove(), /包含/);
    assert.equal(await fs.readFile(path.join(child, name), 'utf8'), 'keep');
    if (name === '.gitignore') await fs.writeFile(path.join(child, name), '*.cache'); else await fs.unlink(path.join(child, name));
  }
  await remove(); await assert.rejects(fs.stat(child), { code: 'ENOENT' });
  assert.equal(git('rev-parse', 'feature'), entry.head);
  assert.equal((await workspaceGit({ root, action: 'worktrees' })).worktrees.length, 1);
});
