const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs/promises'); const os=require('node:os');const path=require('node:path');const {readArtifact,undoArtifact}=require('../electron/artifacts.cjs');
async function workspace(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'felix-artifact-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
test('reads SVG as image data, rejects project escape',async t=>{const root=await workspace(t);await fs.writeFile(path.join(root,'drawing.svg'),'<svg xmlns="http://www.w3.org/2000/svg"/>');const result=await readArtifact(root,'drawing.svg');assert.equal(result.image,true);assert.match(result.data,/^data:image\/svg\+xml;base64,/);await assert.rejects(readArtifact(root,'../missing.svg'));});
test('undo new file only when current content matches',async t=>{const root=await workspace(t);const file=path.join(root,'new.txt');await fs.writeFile(file,'later\n');const change={path:'new.txt',kind:'add',diff:'+original\n'};await assert.rejects(undoArtifact(root,change),/后续修改/);assert.equal(await fs.readFile(file,'utf8'),'later\n');await fs.writeFile(file,'original\n');await undoArtifact(root,change);await assert.rejects(fs.stat(file));});
test('undo update preserves unrelated file and refuses conflicting edits',async t=>{const root=await workspace(t);const file=path.join(root,'edit.txt');await fs.writeFile(file,'new\n');await fs.writeFile(path.join(root,'other.txt'),'keep');const change={path:'edit.txt',kind:'update',diff:'@@ -1 +1 @@\n-old\n+new\n'};await undoArtifact(root,change);assert.equal(await fs.readFile(file,'utf8'),'old\n');assert.equal(await fs.readFile(path.join(root,'other.txt'),'utf8'),'keep');await fs.writeFile(file,'later\n');await assert.rejects(undoArtifact(root,change));assert.equal(await fs.readFile(file,'utf8'),'later\n');});

test('artifact IPC requests use the captured workspace for reads and undo',async t=>{
 const {artifactRequest}=require('../electron/artifacts.cjs');const first=await workspace(t);const second=await workspace(t);
 await fs.writeFile(path.join(first,'same.txt'),'first\n');await fs.writeFile(path.join(second,'same.txt'),'second\n');
 const read=await artifactRequest(first,{root:second,action:'read',path:'same.txt'});
 assert.equal(Buffer.from(read.data.split(',')[1],'base64').toString(),'second\n');
 await artifactRequest(first,{root:second,action:'undo',change:{path:'same.txt',kind:'add',diff:'+second\n'}});
 assert.equal(await fs.readFile(path.join(first,'same.txt'),'utf8'),'first\n');await assert.rejects(fs.stat(path.join(second,'same.txt')));
 await assert.rejects(artifactRequest(first,{root:'.',action:'read',path:'same.txt'}));
 await assert.rejects(artifactRequest(first,{root:second,action:'read',path:path.join(first,'same.txt')}));
});

test('file references resolve line suffixes without weakening project boundaries',async t=>{
 const {artifactRequest}=require('../electron/artifacts.cjs');const root=await workspace(t);
 await fs.writeFile(path.join(root,'notes.txt'),'first\nsecond');
 for(const suffix of [':2',':2:1','#L2']){
  const result=await artifactRequest(root,{action:'read',path:'notes.txt'+suffix});
  assert.equal(result.path,'notes.txt');assert.equal(result.line,2);assert.equal(result.root,await fs.realpath(root));
 }
 await fs.writeFile(path.join(root,'notes.txt#L3'),'literal filename');
 assert.equal((await artifactRequest(root,{action:'read',path:'notes.txt#L3'})).line,undefined);
 await assert.rejects(artifactRequest(root,{action:'read',path:'../outside.txt:2'}));
});
