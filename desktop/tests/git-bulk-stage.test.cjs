const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {workspaceGit} = require('../electron/workspace-git.cjs');
async function fixture(t, commit = true) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'felix-bulk-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const git = (...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,encoding:'utf8',stdio:'pipe'}).trim();
  git('init','-b','main'); git('config','user.name','Test'); git('config','user.email','test@example.invalid');
  await fs.writeFile(path.join(root,'a.txt'),'base');
  await fs.writeFile(path.join(root,'deleted.txt'),'delete me');
  await fs.writeFile(path.join(root,'.gitignore'),'ignored.txt\n');
  if (commit) { git('add','.'); git('commit','-m','base'); }
  const status = ()=>workspaceGit({root,action:'status'});
  const run = async (action,snapshot)=>{snapshot ||= await status();return workspaceGit({root,action,expectedBranch:snapshot.branch,expectedHead:snapshot.head});};
  return {root,git,status,run};
}
test('bulk staging covers modified, deleted and special-name additions without ignored files',async t=>{
  const f=await fixture(t);
  await fs.writeFile(path.join(f.root,'a.txt'),'modified');
  await fs.unlink(path.join(f.root,'deleted.txt'));
  await fs.writeFile(path.join(f.root,'[new].txt'),'new');
  await fs.writeFile(path.join(f.root,'ignored.txt'),'ignored');
  await f.run('stage-all');
  const staged=await f.status();assert.equal(staged.files.length,3);
  assert.ok(staged.files.every(file=>file.index!==' ' && file.working===' '));
  assert.equal(f.git('show',':[new].txt'),'new');
  await fs.writeFile(path.join(f.root,'a.txt'),'later edits');
  await f.run('unstage-all');assert.equal(f.git('diff','--cached','--name-only'),'');
  assert.equal(await fs.readFile(path.join(f.root,'a.txt'),'utf8'),'later edits');
  assert.equal(await fs.readFile(path.join(f.root,'[new].txt'),'utf8'),'new');
  assert.equal(await fs.readFile(path.join(f.root,'ignored.txt'),'utf8'),'ignored');
  await assert.rejects(fs.stat(path.join(f.root,'deleted.txt')),{code:'ENOENT'});
});
test('bulk unstage works before first commit and preserves later changes',async t=>{
  const f=await fixture(t,false);await f.run('stage-all');
  await fs.writeFile(path.join(f.root,'a.txt'),'later edits');await f.run('unstage-all');
  assert.equal(f.git('ls-files'),'');assert.equal(await fs.readFile(path.join(f.root,'a.txt'),'utf8'),'later edits');
  assert.ok((await f.status()).files.every(file=>file.untracked));
});
test('stale HEAD rejects both bulk operations without changing index',async t=>{
  const f=await fixture(t);const old=await f.status();f.git('commit','--allow-empty','-m','advance');
  await fs.writeFile(path.join(f.root,'a.txt'),'changed');
  for(const action of ['stage-all','unstage-all'])await assert.rejects(f.run(action,old),/已变化/);
  assert.equal(f.git('diff','--cached','--name-only'),'');
});
test('bulk operations preserve unresolved conflict stages',async t=>{
  const f=await fixture(t);f.git('switch','-c','feature');
  await fs.writeFile(path.join(f.root,'a.txt'),'feature');f.git('commit','-am','feature');f.git('switch','main');
  await fs.writeFile(path.join(f.root,'a.txt'),'main');f.git('commit','-am','main');
  assert.throws(()=>f.git('merge','feature'));
  const stages=f.git('ls-files','--unmerged');const content=await fs.readFile(path.join(f.root,'a.txt'),'utf8');
  for(const action of ['stage-all','unstage-all'])await assert.rejects(f.run(action),/逐个解决冲突/);
  assert.equal(f.git('ls-files','--unmerged'),stages);assert.equal(await fs.readFile(path.join(f.root,'a.txt'),'utf8'),content);
});
