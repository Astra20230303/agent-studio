const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseWorkspaceResult}=require('../src/workspaceResponse.ts');
test('validates workspace list/search entries and clones bridge data',()=>{
 const input={entries:[{name:'a.txt',path:'a.txt',directory:false,symlink:false,line:2,column:3,matchLength:4,snippet:'text',revision:'r'}],truncated:false,skipped:0};const value=parseWorkspaceResult(input,'search-content');value.entries[0].name='changed';assert.equal(input.entries[0].name,'a.txt');
 assert.deepEqual(parseWorkspaceResult({entries:[]},'list'),{entries:[]});
});
test('validates file previews and rejects malformed responses',()=>{
 assert.equal(parseWorkspaceResult({text:'ok',revision:'r',size:2},'read').text,'ok');
 for(const bad of [null,{}, {entries:{}},{entries:[null]},{entries:[{name:'a',path:1,directory:false,symlink:false}]},{entries:[{name:'a',path:'a',directory:false,symlink:false,line:0}]},{entries:[],truncated:'no'},{entries:[],skipped:-1}]) assert.throws(()=>parseWorkspaceResult(bad,'list'),/工作区文件响应格式无效/);
 for(const bad of [{},{text:2},{revision:3},{size:-1},{image:2},{binary:'no'}]) assert.throws(()=>parseWorkspaceResult(bad,'read'),/工作区文件响应格式无效/);
});
