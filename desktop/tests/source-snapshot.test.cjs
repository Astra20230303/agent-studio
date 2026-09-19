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

test('submodule untracked files remain modified even when local ignore configuration hides them',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'felix-source-submodule-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const run=(cwd,...args)=>execFileSync('git',['-C',cwd,...args],{windowsHide:true,stdio:'pipe'}).toString().trim();
 const parent=path.join(root,'parent'),child=path.join(root,'child');
 for(const directory of [parent,child]){fs.mkdirSync(directory);run(directory,'init');run(directory,'config','user.name','Fixture');run(directory,'config','user.email','fixture@example.invalid');fs.writeFileSync(path.join(directory,'tracked'),'initial');run(directory,'add','.');run(directory,'commit','-m','initial');}
 run(parent,'-c','protocol.file.allow=always','submodule','add',child,'nested');run(parent,'commit','-am','submodule');
 assert.equal(sourceSnapshot(parent).state,'clean');
 run(parent,'config','submodule.nested.ignore','all');fs.writeFileSync(path.join(parent,'nested','untracked-secret'),'content');
 assert.equal(run(parent,'status','--porcelain'),'');
 const snapshot=sourceSnapshot(parent);assert.equal(snapshot.state,'modified');assert.ok(!JSON.stringify(snapshot).includes('untracked-secret'));
});
test('unavailable Git reports unknown instead of clean',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'felix-source-no-git-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const script=path.resolve(__dirname,'../scripts/source-snapshot.cjs');
 const env={...process.env};for(const key of Object.keys(env))if(key.toLowerCase()==='path')delete env[key];env.PATH=root;
 const output=execFileSync(process.execPath,['-e',"console.log(JSON.stringify(require(process.argv[1]).sourceSnapshot(process.argv[2])))",script,root],{env,windowsHide:true,stdio:'pipe'});
 const snapshot=JSON.parse(output);assert.equal(snapshot.state,'unknown');assert.equal(snapshot.commit,null);
});
