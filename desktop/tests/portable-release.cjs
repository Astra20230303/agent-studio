const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const {execFileSync, spawn} = require('node:child_process');
const {digest, verifyDesktop} = require('../scripts/verify-desktop.cjs');
(async()=>{
 if(!process.argv[2]) throw Error('Usage: node portable-release.cjs <release directory>');
 const release=path.resolve(process.argv[2]);
 const checksum=fs.readFileSync(path.join(release,'SHA256SUMS.txt'),'utf8').trim();
 assert.match(checksum,/^[a-f0-9]{64}  Felix-portable\.zip$/);
 const archive=path.join(release,'Felix-portable.zip');assert.equal(digest(archive).sha256,checksum.slice(0,64));
 const extracted=fs.mkdtempSync(path.join(os.tmpdir(),'felix-zip acceptance-'));
 try{
  execFileSync('tar.exe',['-xf',archive,'-C',extracted],{windowsHide:true,stdio:'pipe'});
  verifyDesktop(extracted);console.log('PASS: release ZIP checksum and extracted desktop inventory');
  const report=JSON.parse(fs.readFileSync(path.join(extracted,'THIRD-PARTY-COMPONENTS.json'),'utf8'));
  const desktop=JSON.parse(fs.readFileSync(path.join(extracted,'desktop-manifest.json'),'utf8'));
  const frontend=JSON.parse(fs.readFileSync(path.join(extracted,'resources/app/dist/third-party-licenses.json'),'utf8'));
  assert.equal(report.format,1);
  assert.deepEqual(report.components.filter(item=>item.scope==='desktop').map(item=>[item.name,item.version]).sort(),Object.entries(desktop.dependencies).sort());
  assert.deepEqual(report.components.filter(item=>item.scope==='frontend').map(item=>[item.name,item.version]).sort(),frontend.components.map(item=>[item.name,item.version]).sort());
  assert.ok(report.components.some(item=>item.name==='react' && item.notices.length));
  for(const item of report.externalNotices)for(const file of item.files)assert.ok(fs.statSync(path.join(extracted,file)).isFile());
  assert.ok(report.reviewRequired.some(item=>item.includes('Rust')));
  const notices=fs.readFileSync(path.join(extracted,'THIRD-PARTY-NOTICES.txt'),'utf8');
  for(const item of report.components)for(const notice of item.notices)assert.ok(notices.includes(notice.text));
  console.log(`PASS: extracted license inventory for ${report.components.length} components and external notices`);
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[path.join(__dirname,'packaged-desktop.cjs'),extracted],{windowsHide:true,stdio:'inherit'});
   child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Packaged acceptance exited ${code}`)));
  });
 }finally{fs.rmSync(extracted,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
})().catch(error=>{console.error(error);process.exitCode=1});
