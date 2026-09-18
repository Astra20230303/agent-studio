const test=require('node:test');const assert=require('node:assert/strict');
const {editorMatches}=require('../src/editorSearchMatches.ts');
test('editor search is literal and preserves unicode offsets',()=>{
 assert.deepEqual(editorMatches('İ x [a.b] [A.B]','[a.b]',false),[{start:4,end:9},{start:10,end:15}]);
 assert.deepEqual(editorMatches('İ x [a.b] [A.B]','[a.b]',true),[{start:4,end:9}]);
 assert.deepEqual(editorMatches('aaa','aa',true),[{start:0,end:2}]);
 assert.deepEqual(editorMatches('abc','',false),[]);
});

test('whole-word search protects Unicode identifiers and keeps literal offsets',()=>{
 const text='foo foobar foo_bar Foo foo1 中文foo foo中文 e\u0301 foo.';
 assert.deepEqual(editorMatches(text,'foo',false,true).map(range=>text.slice(range.start,range.end)),['foo','Foo','foo']);
 assert.equal(editorMatches(text,'foo',true,true).length,2);
 assert.deepEqual(editorMatches('e\u0301 e','e',true,true),[{start:3,end:4}]);
 assert.deepEqual(editorMatches('中文 中文字','中文',true,true),[{start:0,end:2}]);
 assert.deepEqual(editorMatches('x [a.b] y','[a.b]',true,true),[{start:2,end:7}]);
});
