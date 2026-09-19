const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {execFileSync}=require('node:child_process');
const {sourceSnapshot}=require('../scripts/source-snapshot.cjs');
test('source snapshot records clean, modified, staged and untracked checkout without exposing content',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'felix-source-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('git',['-C',root,...args],{windowsHide:true,stdio:'pipe'}).toString().trim();
 git('init');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
 fs.writeFileSync(path.join(root,'file'),'initial');git('add','file');git('commit','-m','initial');
 const clean=sourceSnapshot(root);assert.equal(clean.commit,git('rev-parse','HEAD'));assert.equal(clean.state,'clean');assert.equal(clean.phase,'packaging');
 fs.writeFileSync(path.join(root,'file'),'private content');assert.equal(sourceSnapshot(root).state,'modified');
 git('add','file');assert.equal(sourceSnapshot(root).state,'modified');git('commit','-m','second');
 fs.writeFileSync(path.join(root,'secret-name'),'private');const untracked=sourceSnapshot(root);assert.equal(untracked.state,'modified');assert.ok(!JSON.stringify(untracked).includes('secret-name'));
});
test('missing repository remains explicitly unknown',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'felix-source-unknown-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 assert.equal(sourceSnapshot(root).state,'unknown');assert.equal(sourceSnapshot(root).commit,null);
});
