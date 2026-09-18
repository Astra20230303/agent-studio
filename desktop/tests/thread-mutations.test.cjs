const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createThreadMutations}=require('../src/threadMutations.ts');
const {defaultState}=require('../src/store.ts');
for(const method of ['rename','archive','remove'])test(`${method} waits for remote success and applies only to latest target state`,async()=>{
 let state={...defaultState(),activeThreadId:'a',threads:[{id:'a',remoteId:'remote-a',title:'A',messages:[]},{id:'b',title:'B',messages:[]}]};
 let resolve,reject;const calls=[];
 const remote=Object.fromEntries(['rename','archive','remove'].map(key=>[key,(...args)=>{calls.push([key,...args]);return new Promise((yes,no)=>{resolve=yes;reject=no;});}]));
 const service=createThreadMutations(remote,fn=>{const next=structuredClone(state);fn(next);state=next;});
 const original=structuredClone(state);
 const failed=assert.rejects(service[method](state.threads[0],'Renamed'),/offline/);
 assert.deepEqual(state,original);reject(Error('offline'));await failed;assert.deepEqual(state,original);
 const pending=service[method](state.threads[0],'Renamed');
 state.activeThreadId='b';state.threads[1].title='New B';
 resolve();await pending;
 assert.equal(state.activeThreadId,'b');assert.equal(state.threads.find(t=>t.id==='b').title,'New B');
 if(method==='rename'){assert.equal(state.threads[0].title,'Renamed');assert.equal(state.threads[0].titleSource,'manual');}
 if(method==='archive'){assert.equal(state.threads[0].archived,true);assert.equal(state.threads[0].status,'completed');}
 if(method==='remove')assert.equal(state.threads.length,1);
 assert.deepEqual(calls[0],method==='rename'?[method,'remote-a','Renamed']:[method,'remote-a']);
});
