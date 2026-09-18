const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createThreadHistory}=require('../src/threadHistory.ts');
test('history reader preserves ordered records and isolates concurrent cursors',async()=>{
 const calls=[];
 const service=createThreadHistory(async(id,cursor)=>{calls.push([id,cursor]);return {data:[{type:'futureTool',id,cursor}],nextCursor:cursor?null:'next'};});
 const [a,b]=await Promise.all([service.readAll('a'),service.readAll('b')]);
 assert.deepEqual(a.map(x=>x.id),['a','a']);assert.deepEqual(b.map(x=>x.id),['b','b']);
 assert.deepEqual(calls.filter(x=>x[0]==='a'),[['a',undefined],['a','next']]);
});
test('invalid pages and repeated cursors fail without returning partial history',async()=>{
 for(const next of [null,{}, {data:{}},...['', ' ',0, false,{},[]].map(nextCursor=>({data:[],nextCursor}))]){
  let count=0;
  await assert.rejects(createThreadHistory(async()=>++count===1?{data:[{id:'partial'}],nextCursor:'next'}:next).readAll('a'),/历史格式无效/);
  assert.equal(count,2);
 }
 let calls=0;
 await assert.rejects(createThreadHistory(async()=>({data:[],nextCursor:++calls%2?'one':'two'})).readAll('a'),/分页重复/);
 assert.equal(calls,3);
});
test('failed reads can retry from the first page',async()=>{
 let fail=true;const calls=[];
 const service=createThreadHistory(async(id,cursor)=>{calls.push(cursor);if(cursor&&fail)throw Error('offline');return {data:[cursor||'first'],nextCursor:cursor?null:'next'};});
 await assert.rejects(service.readAll('a'),/offline/);fail=false;
 assert.deepEqual(await service.readAll('a'),['first','next']);assert.deepEqual(calls,[undefined,'next',undefined,'next']);
});

test('cancel pending history immediately without reading subsequent pages or reporting late progress',async()=>{
 const controller=new AbortController();let release;let calls=0;const progress=[];
 const reader=createThreadHistory(async()=>{calls++;return new Promise(resolve=>{release=resolve;});});
 const pending=reader.readAll('a',{signal:controller.signal,onProgress:p=>progress.push(p)});
 await Promise.resolve();controller.abort();await assert.rejects(pending,{name:'AbortError'});
 release({data:['late'],nextCursor:'next'});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls,1);assert.deepEqual(progress,[]);
 await assert.rejects(reader.readAll('a',{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,1);
});
test('progress counts completed pages and cancellation leaves retry independent',async()=>{
 const controller=new AbortController();const progress=[];let calls=0;
 const reader=createThreadHistory(async(id,cursor)=>{calls++;return {data:[cursor||'first'],nextCursor:cursor?null:'next'};});
 await assert.rejects(reader.readAll('a',{signal:controller.signal,onProgress:p=>{progress.push(p);controller.abort();}}),{name:'AbortError'});
 assert.equal(calls,1);assert.deepEqual(progress,[{pages:1,items:1}]);
 const recovered=[];assert.deepEqual(await reader.readAll('a',{onProgress:p=>recovered.push(p)}),['first','next']);
 assert.deepEqual(recovered,[{pages:1,items:1},{pages:2,items:2}]);
});
