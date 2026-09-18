const test=require('node:test');const assert=require('node:assert/strict');
const {readThreadSearchOccurrences}=require('../src/threadSearchOccurrences.ts');
test('search occurrences validate identities, cursors and UTF-16 match bounds',()=>{
 const item={turnId:'t',itemId:'i',snippet:'😀needle',snippetMatchRange:{start:2,end:8},turnCursor:'c'};
 const result=readThreadSearchOccurrences({data:[item],nextCursor:null});
 assert.equal(result.data[0].snippet.slice(result.data[0].matchStart,result.data[0].matchEnd),'needle');
 for(const value of [null,{}, {data:[{...item,itemId:''}]},{data:[{...item,snippetMatchRange:{start:-1,end:8}}]},{data:[{...item,snippetMatchRange:{start:2,end:9}}]},{data:[],nextCursor:{}}])assert.throws(()=>readThreadSearchOccurrences(value),/搜索/);
});
