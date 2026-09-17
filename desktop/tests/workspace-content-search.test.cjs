const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {workspaceFile}=require('../electron/workspace-files.cjs');
test('content search returns literal matches with lines, skips binary/large/git, and caps results',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'felix-search-'));
 try{
  await fs.mkdir(path.join(root,'.git'));
  await fs.writeFile(path.join(root,'.git','hidden'),'needle');
  await fs.writeFile(path.join(root,'source.txt'),'first\r\nNeedle here\r\nthird needle\r\n[a.b] literal');
  await fs.writeFile(path.join(root,'binary'),Buffer.from([0,110,101,101,100,108,101]));
  await fs.writeFile(path.join(root,'large'),'needle'.repeat(50000));
  const result=await workspaceFile(root,'.','search-content','needle');
  assert.deepEqual(result.entries.map(x=>[x.path,x.line,x.column]),[['source.txt',2,1],['source.txt',3,7]]);
  assert.equal(result.entries[0].revision,(await workspaceFile(root,'source.txt','read')).revision);
  assert.equal(result.skipped,2);assert.equal(result.truncated,false);
  assert.equal((await workspaceFile(root,'.','search-content','[a.b]')).entries[0].line,4);
  await fs.writeFile(path.join(root,'unicode.txt'),'İ needle');
  assert.equal((await workspaceFile(root,'.','search-content','needle')).entries.find(x=>x.path==='unicode.txt').column,3);
  await fs.writeFile(path.join(root,'many.txt'),'needle\n'.repeat(250));
  const capped=await workspaceFile(root,'.','search-content','needle');
  assert.equal(capped.entries.length,200);assert.equal(capped.truncated,true);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
