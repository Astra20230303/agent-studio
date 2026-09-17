const test=require('node:test');const assert=require('node:assert/strict');const {messageLinkKind,headingSlug}=require('../src/messageLink.ts');
test('message link classification distinguishes file paths and safe web links',()=>{
 for(const path of ['C:/repo/a.ts','D:\\repo\\b.md','/tmp/a','src/a.ts'])assert.equal(messageLinkKind(path),'file');
 for(const value of ['javascript:alert(1)','data:text/html,hi','mailto:a@example.com','https://user:pass@example.com','//example.com','https://example.com\n'])assert.equal(messageLinkKind(value),'unsupported');
 assert.equal(messageLinkKind('https://example.com/path'),'web');assert.equal(messageLinkKind('#section'),'anchor');assert.equal(headingSlug('中文 Details!'),'中文-details');
});
