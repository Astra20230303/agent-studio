const {test}=require('node:test');const assert=require('node:assert/strict');const {resourceDownload}=require('../src/resourceDownload.ts');
test('binary resources preserve encoded bytes and use attachment content type',()=>{
 const blob=Buffer.from([0,255,128,13,10]).toString('base64');const value=resourceDownload('fixture://files/report%20one.pdf',blob);
 assert.equal(value.filename,'report one.pdf');assert.equal(value.href,'data:application/octet-stream;base64,'+blob);
 assert.equal(resourceDownload('fixture://files/con.txt','').filename,'resource.bin');
 assert.equal(resourceDownload('fixture://files/..%2Fbad.txt','YQ==').filename,'.._bad.txt');
 for(const invalid of ['a','%%%%','a===','<script>'])assert.equal(resourceDownload('fixture://file',invalid),undefined);
});
