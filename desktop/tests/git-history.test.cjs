const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { workspaceGit } = require('../electron/workspace-git.cjs');
test('history paginates a fixed snapshot and shows patches without changing working tree', async () => {
 const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-history-'));
 const git = (...args) => execFileSync('git', args, {cwd:root,encoding:'utf8',windowsHide:true});
 const read = input => workspaceGit({root,...input});
 try {
  git('init'); git('config','user.name','History Test'); git('config','user.email','history@example.invalid');
  assert.deepEqual((await read({action:'history'})).commits, []);
  await fs.writeFile(path.join(root,'file.txt'),'first line\n'); git('add','.'); git('commit','-m','初始提交');
  for(let i=1;i<32;i++) git('commit','--allow-empty','-m',`commit ${i}`);
  const first = await read({action:'history'});
  assert.equal(first.commits.length,30); assert.equal(first.hasMore,true); assert.equal(first.commits[0].subject,'commit 31');
  git('commit','--allow-empty','-m','new head');
  const second = await read({action:'history',anchor:first.anchor,offset:30});
  assert.equal(second.commits.length,2); assert.equal(second.hasMore,false); assert.equal(second.commits[1].subject,'初始提交');
  const detail = await read({action:'commit-detail',commit:second.commits[1].id});
  assert.match(detail.detail,/\+first line/); assert.match(detail.detail,/History Test/);
  const before = git('rev-parse','HEAD');
  git('branch','feature/history',second.commits[1].id);
  git('update-ref','refs/remotes/origin/review',second.commits[1].id);
  for (const ref of ['refs/heads/feature/history','refs/remotes/origin/review']) {
   const branch = await read({action:'history',ref});
   assert.ok(branch.refs.includes(ref));
   assert.equal(branch.commits.length,1);
   assert.equal(branch.commits[0].subject,'初始提交');
  }
  await assert.rejects(read({action:'history',ref:'HEAD~1'}));
  await assert.rejects(read({action:'history',ref:'--all'}));
  assert.equal(git('rev-parse','HEAD'),before);
  assert.equal(git('status','--porcelain'),'');
  await assert.rejects(read({action:'commit-detail',commit:'--output=bad'}));
  await assert.rejects(read({action:'history',offset:-1}));
 } finally { await fs.rm(root,{recursive:true,force:true}); }
});
