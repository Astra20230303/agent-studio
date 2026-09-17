const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { workspaceGit } = require('../electron/workspace-git.cjs');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-paths-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, windowsHide: true, encoding: 'utf8', stdio: 'pipe' }).trim();
  git('init', '-b', 'main');
  git('config', 'core.autocrlf', 'false');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.invalid');
  await fs.writeFile(path.join(root, '.gitignore'), 'ignored/\n');
  for (const name of ['[ab].txt', 'a.txt', 'b.txt']) await fs.writeFile(path.join(root, name), 'base\n');
  git('add', '.'); git('commit', '-m', 'base');
  return { root, git };
}

test('stage, diff and unstage treat bracket filenames literally', async t => {
  const { root, git } = await fixture(t);
  for (const name of ['[ab].txt', 'a.txt', 'b.txt']) await fs.writeFile(path.join(root, name), `changed ${name}\n`);
  await workspaceGit({ root, action: 'stage', path: '[ab].txt' });
  assert.equal(git('diff', '--cached', '--name-only'), '[ab].txt');
  await workspaceGit({ root, action: 'stage', path: 'a.txt' });
  const { diff } = await workspaceGit({ root, action: 'diff', path: '[ab].txt', staged: true });
  assert.match(diff, /changed \[ab\]\.txt/);
  assert.doesNotMatch(diff, /changed a\.txt/);
  await workspaceGit({ root, action: 'unstage', path: '[ab].txt' });
  assert.equal(git('diff', '--cached', '--name-only'), 'a.txt');
});

test('stash removes untracked files but leaves ignored runtime files in place', async t => {
  const { root, git } = await fixture(t);
  await fs.mkdir(path.join(root, 'ignored'));
  await fs.writeFile(path.join(root, 'ignored', 'runtime.txt'), 'runtime data');
  await fs.writeFile(path.join(root, '[ab].txt'), 'changed\n');
  await fs.writeFile(path.join(root, 'new.txt'), 'new');
  const request = { root, expectedBranch: 'main', expectedHead: git('rev-parse', 'HEAD') };
  await workspaceGit({ ...request, action: 'stash' });
  assert.equal(await fs.readFile(path.join(root, 'ignored', 'runtime.txt'), 'utf8'), 'runtime data');
  await assert.rejects(fs.stat(path.join(root, 'new.txt')), { code: 'ENOENT' });
  assert.equal(git('status', '--porcelain'), '');
  await workspaceGit({ ...request, action: 'stash-pop' });
  assert.equal(await fs.readFile(path.join(root, '[ab].txt'), 'utf8'), 'changed\n');
  assert.equal(await fs.readFile(path.join(root, 'new.txt'), 'utf8'), 'new');
  assert.equal(await fs.readFile(path.join(root, 'ignored', 'runtime.txt'), 'utf8'), 'runtime data');
});
