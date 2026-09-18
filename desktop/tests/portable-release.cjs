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
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,[path.join(__dirname,'packaged-desktop.cjs'),extracted],{windowsHide:true,stdio:'inherit'});
   child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Packaged acceptance exited ${code}`)));
  });
 }finally{fs.rmSync(extracted,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
})().catch(error=>{console.error(error);process.exitCode=1});
