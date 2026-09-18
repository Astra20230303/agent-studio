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
test('local conversations require no remote service and removing current selection clears it',async()=>{
 let state={...defaultState(),activeThreadId:'local',threads:[{id:'local',title:'Local',messages:[]}]};
 const unexpected=async()=>{throw Error('local operation called remote');};
 const service=createThreadMutations({rename:unexpected,archive:unexpected,remove:unexpected},fn=>fn(state));
 await service.rename(state.threads[0],'Local renamed');assert.equal(state.threads[0].title,'Local renamed');
 await service.archive(state.threads[0]);assert.equal(state.activeThreadId,undefined);assert.equal(state.threads[0].archived,true);
 state.activeThreadId='local';await service.remove(state.threads[0]);assert.equal(state.activeThreadId,undefined);assert.deepEqual(state.threads,[]);
});
test('late rename cannot resurrect a removed conversation',async()=>{
 let state={...defaultState(),threads:[{id:'a',remoteId:'remote',title:'A',messages:[]}]};let resolve;
 const service=createThreadMutations({rename:()=>new Promise(done=>{resolve=done;}),archive:async()=>{},remove:async()=>{}},fn=>fn(state));
 const pending=service.rename(state.threads[0],'Late name');state.threads=[];resolve();await pending;
 assert.deepEqual(state.threads,[]);
});
test('restore waits for acknowledgement and preserves newer local history and selection',async()=>{
 const state={...defaultState(),activeThreadId:'b',threads:[{id:'local-a',remoteId:'remote-a',title:'Latest title',archived:true,messages:[{content:'Retained message'}]}]};
 let resolve,reject;const calls=[];
 const service=createThreadMutations({restore:id=>{calls.push(id);return new Promise((yes,no)=>{resolve=yes;reject=no;});}},fn=>fn(state));
 const remoteThread={id:'remote-remote-a',remoteId:'remote-a',title:'Stale title',messages:[],archived:true};
 const failed=assert.rejects(service.restore(remoteThread),/unavailable/);reject(Error('unavailable'));await failed;
 assert.equal(state.threads[0].archived,true);
 const pending=service.restore(remoteThread);assert.equal(state.threads[0].archived,true);resolve();await pending;
 assert.equal(state.threads.length,1);assert.equal(state.threads[0].title,'Latest title');assert.equal(state.threads[0].messages[0].content,'Retained message');
 assert.equal(state.threads[0].archived,false);assert.equal(state.activeThreadId,'b');assert.deepEqual(calls,['remote-a','remote-a']);
});
test('first restore captures input before awaiting and local restore works offline',async()=>{
 const state={...defaultState(),threads:[]};let resolve;
 const service=createThreadMutations({restore:()=>new Promise(done=>{resolve=done;})},fn=>fn(state));
 const input={id:'a',remoteId:'remote',title:'Captured',messages:[{content:'Original'}],archived:true};
 const pending=service.restore(input);input.title='Changed';input.messages[0].content='Changed';resolve();await pending;
 assert.equal(state.threads[0].title,'Captured');assert.equal(state.threads[0].messages[0].content,'Original');
 await service.restore({id:'local',title:'Offline',messages:[],archived:true});
 assert.equal(state.threads[1].archived,false);
});
