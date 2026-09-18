const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {workspaceGit} = require('../electron/workspace-git.cjs');
async function fixture(t, commit = true) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-create-branch-'));
  t.after(() => fs.rm(root, {recursive:true, force:true}));
  const git = (...args) => execFileSync('git', args, {cwd:root, windowsHide:true, encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim();
  git('init','-b','main'); git('config','user.name','Test'); git('config','user.email','test@example.invalid');
  await fs.writeFile(path.join(root,'file.txt'), 'base');
  if (commit) { git('add','.'); git('commit','-m','base'); }
  const read = () => workspaceGit({root, action:'branches'});
  const create = async (branch, snapshot) => {
    snapshot ||= await read();
    return workspaceGit({root, action:'create-branch', branch, expectedBranch:snapshot.current, expectedHead:snapshot.head});
  };
  return {root, git, read, create};
}
test('creates at current commit and preserves index, working changes and untracked files', async t => {
  const f = await fixture(t); const head = f.git('rev-parse','HEAD');
  await fs.writeFile(path.join(f.root,'file.txt'),'staged'); f.git('add','.');
  await fs.writeFile(path.join(f.root,'file.txt'),'working');
  await fs.writeFile(path.join(f.root,'untracked.txt'),'keep');
  assert.deepEqual(await f.create('codex/new'), {branch:'codex/new'});
  assert.equal(f.git('branch','--show-current'),'codex/new'); assert.equal(f.git('rev-parse','HEAD'),head);
  assert.equal(f.git('show',':file.txt'),'staged');
  assert.equal(await fs.readFile(path.join(f.root,'file.txt'),'utf8'),'working');
  assert.equal(await fs.readFile(path.join(f.root,'untracked.txt'),'utf8'),'keep');
});
test('rejects duplicates, invalid names and stale snapshots without creating branches', async t => {
  const f = await fixture(t);
  for (const name of ['main','--force','bad name','@{-1}','x..y',' name']) await assert.rejects(f.create(name));
  const old = await f.read(); f.git('commit','--allow-empty','-m','next');
  await assert.rejects(f.create('stale',old), /已变化/);
  assert.deepEqual((await f.read()).branches,['main']); assert.equal(f.git('branch','--show-current'),'main');
});
test('creates from detached HEAD and rejects unborn repository', async t => {
  const f = await fixture(t); f.git('switch','--detach');
  await f.create('rescued'); assert.equal(f.git('branch','--show-current'),'rescued');
  const empty = await fixture(t,false);
  await assert.rejects(empty.create('new'), /首个提交/);
  assert.equal(empty.git('branch','--show-current'),'main');
  assert.equal(await fs.readFile(path.join(empty.root,'file.txt'),'utf8'),'base');
});
