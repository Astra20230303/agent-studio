const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {bundlePortable}=require('../scripts/bundle-portable.cjs');
test('release refuses existing or nested destinations without changing them',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'felix-portable-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source=path.join(root,'desktop');fs.mkdirSync(source);fs.writeFileSync(path.join(source,'keep'),'preserve');
 const output=path.join(root,'existing');fs.mkdirSync(output);fs.writeFileSync(path.join(output,'keep'),'existing');
 assert.throws(()=>bundlePortable({source,output}),/already exists/);
 assert.throws(()=>bundlePortable({source,output:path.join(source,'nested')}),/outside/);
 assert.throws(()=>bundlePortable({source,output:source}),/outside/);
 assert.equal(fs.readFileSync(path.join(source,'keep'),'utf8'),'preserve');assert.equal(fs.readFileSync(path.join(output,'keep'),'utf8'),'existing');
 assert.throws(()=>bundlePortable({source,output:path.join(root,'new')}));assert.equal(fs.existsSync(path.join(root,'new')),false);
});
