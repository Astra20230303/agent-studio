const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createThreadStore}=require('../src/threadStore.ts');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
function setup(overrides={}){
 const state={threads:[{id:'a',remoteId:'remote-a',title:'A',messages:[]},{id:'b',remoteId:'remote-b',title:'B',messages:[]}],activeThreadId:'a'};
 const calls=[];
 const backend={list:async()=>({data:[{id:'remote-a'}]}),archived:async()=>({data:[]}),search:async()=>({data:[]}),...Object.fromEntries(['rename','archive','remove','restore'].map(method=>[method,async(...args)=>{calls.push([method,...args])}])),...overrides};
 return{state,calls,backend,store:createThreadStore(backend,fn=>fn(state))};
}
test('shared store routes queries and acknowledged mutations to the same application state',async()=>{
 const f=setup();assert.equal((await f.store.query()).data[0].id,'remote-a');
 await f.store.rename(f.state.threads[0],'Renamed');assert.equal(f.state.threads[0].title,'Renamed');
 await f.store.archive(f.state.threads[0]);assert.equal(f.state.activeThreadId,undefined);
 await f.store.restore(f.state.threads[0]);assert.equal(f.state.threads[0].archived,false);
 await f.store.remove(f.state.threads[0]);assert.equal(f.state.threads.length,1);
 assert.deepEqual(f.calls,[['rename','remote-a','Renamed'],['archive','remote-a'],['restore','remote-a'],['remove','remote-a']]);
});
test('every mutation excludes every other operation on local or remote aliases while other threads and queries proceed',async()=>{
 for(const first of ['rename','archive','remove','restore']){
  const wait=deferred();const f=setup({[first]:()=>wait.promise});const original=f.state.threads[0];
  const pending=f.store[first](original,'Changed');
  for(const target of [original,{...original,id:'remote-alias'},{...original,remoteId:'changed-remote'}]){
   for(const second of ['rename','archive','remove','restore'])await assert.rejects(f.store[second](target,'Rejected'),/操作尚未完成/);
  }
  assert.equal((await f.store.query()).data.length,1);
  const different=first==='rename'?'archive':'rename';await f.store[different](f.state.threads[1],'B changed');
  wait.resolve();await pending;
  await f.store.restore({...original,archived:true});
 }
});
test('failure releases identities and independent stores do not block each other',async()=>{
 const wait=deferred();const f=setup({archive:()=>wait.promise});const original=f.state.threads[0];
 const pending=assert.rejects(f.store.archive(original),/offline/);
 const independent=setup();await independent.store.remove(independent.state.threads[0]);
 wait.reject(Error('offline'));await pending;assert.equal(original.archived,undefined);
 await f.store.rename(original,'Retry');assert.equal(original.title,'Retry');
});
test('local-only mutations avoid transport and synchronous failures release the lock',async()=>{
 let fail=true;const local={id:'local',title:'Local',messages:[]};
 const backend=setup().backend;backend.rename=()=>{throw Error('unexpected remote')};
 const state={threads:[local]};
 const store=createThreadStore(backend,fn=>{if(fail)throw Error('state unavailable');fn(state)});
 await assert.rejects(store.rename(local,'First'),/state unavailable/);fail=false;
 await store.rename(local,'Retry');assert.equal(local.title,'Retry');
});
