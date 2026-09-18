const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const {writeDesktopManifest,verifyDesktop}=require('../scripts/verify-desktop.cjs');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'felix-manifest-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const name of ['Felix.exe','desktop-manifest.json','resources/app/package.json','resources/app/dist/index.html','resources/app/electron/main.cjs','resources/felix-runtime/manifest.json','resources/app/assets/中文 space.txt']){
  const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`content: ${name}`);
 }
 return root;
}
test('complete desktop inventory survives relocation and rejects changed, missing or injected files',t=>{
 const root=fixture(t);const manifest=writeDesktopManifest(root);assert.equal(Object.keys(verifyDesktop(root).files).length,7);
 const other=fs.mkdtempSync(path.join(os.tmpdir(),'felix-relocated-'));t.after(()=>fs.rmSync(other,{recursive:true,force:true}));
 fs.cpSync(root,other,{recursive:true});assert.deepEqual(verifyDesktop(other),manifest);
 fs.writeFileSync(path.join(root,'Felix.exe'),'tampered');assert.throws(()=>verifyDesktop(root),/integrity/);
 fs.writeFileSync(path.join(root,'Felix.exe'),'content: Felix.exe');
 fs.writeFileSync(path.join(root,'extra.cjs'),'injected');assert.throws(()=>verifyDesktop(root),/inventory/);fs.unlinkSync(path.join(root,'extra.cjs'));
 fs.unlinkSync(path.join(root,'Felix.exe'));assert.throws(()=>verifyDesktop(root),/inventory/);
});
test('malformed manifest paths and hash entries fail before verification reads',t=>{
 const root=fixture(t);const original=writeDesktopManifest(root);
 for(const key of ['../outside','/absolute','C:/absolute','a\\b','a//b','release-manifest.json']){
  fs.writeFileSync(path.join(root,'release-manifest.json'),JSON.stringify({...original,files:{...original.files,[key]:{size:1,sha256:'a'.repeat(64)}}}));
  assert.throws(()=>verifyDesktop(root),/Invalid desktop manifest entry/);
 }
 for(const entry of [{size:-1,sha256:'a'.repeat(64)},{size:1,sha256:'short'},null]){
  fs.writeFileSync(path.join(root,'release-manifest.json'),JSON.stringify({...original,files:{...original.files,'Felix.exe':entry}}));assert.throws(()=>verifyDesktop(root),/Invalid/);
 }
});
test('incomplete directories and existing manifests cannot be silently sealed',t=>{
 const root=fixture(t);writeDesktopManifest(root);assert.throws(()=>writeDesktopManifest(root),/EEXIST/);
 fs.unlinkSync(path.join(root,'Felix.exe'));assert.throws(()=>writeDesktopManifest(root),/incomplete/);
});
