const {test}=require('node:test');const assert=require('node:assert/strict');const{readThreadFork}=require('../src/threadFork.ts');const{createThreadStore}=require('../src/threadStore.ts');
test('fork requires a distinct valid identity and normalized provider/permissions',()=>{
 for(const value of [null,{}, {thread:{id:9}},{thread:{id:'source'}},{thread:{id:'new'},providerId:{}}])assert.throws(()=>readThreadFork(value,'source'),/分叉数据无效/);
 const result=readThreadFork({thread:{id:'new'},providerId:'p',sandboxPolicy:{type:'readOnly'},approvalPolicy:'on-request'},'source');
 assert.equal(result.id,'new');assert.equal(result.providerId,'p');assert.equal(result.permissions.sandbox,'readOnly');
});
test('fork shares mutation lock across aliases, snapshots identity and allows explicit retry',async()=>{
 let resolve;const calls=[];const source={id:'local',remoteId:'source'};
 const store=createThreadStore({fork:(...args)=>{calls.push(args);return new Promise(done=>resolve=done)},rename:async()=>{},remove:async()=>{}},()=>{throw Error('fork must not apply local state before caller accepts it')});
 const pending=store.fork(source,'turn');source.remoteId='changed';
 await assert.rejects(store.fork({id:'alias',remoteId:'source'}),/操作尚未完成/);
 await assert.rejects(store.remove({id:'local',remoteId:'source'}),/操作尚未完成/);
 assert.deepEqual(calls,[['source','turn']]);const failed=assert.rejects(pending,/分叉数据无效/);resolve({thread:{id:'source'}});await failed;
 const retry=store.fork({id:'local',remoteId:'source'});resolve({thread:{id:'new'}});assert.equal((await retry).id,'new');
});
