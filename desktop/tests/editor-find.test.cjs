const test=require('node:test');const assert=require('node:assert/strict');
const {editorMatches}=require('../src/editorSearchMatches.ts');
test('editor search is literal and preserves unicode offsets',()=>{
 assert.deepEqual(editorMatches('İ x [a.b] [A.B]','[a.b]',false),[{start:4,end:9},{start:10,end:15}]);
 assert.deepEqual(editorMatches('İ x [a.b] [A.B]','[a.b]',true),[{start:4,end:9}]);
 assert.deepEqual(editorMatches('aaa','aa',true),[{start:0,end:2}]);
 assert.deepEqual(editorMatches('abc','',false),[]);
});
