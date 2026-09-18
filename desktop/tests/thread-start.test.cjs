const {test}=require('node:test');const assert=require('node:assert/strict');const {readThreadStart}=require('../src/threadStart.ts');const{createThreadStore}=require('../src/threadStore.ts');
test('created thread identity is validated before exposing a narrow configuration snapshot',()=>{
 for(const value of [null,{}, {thread:{id:42}},{thread:{id:' '}},{thread:{id:' remote '}},{thread:{id:'a\nb'}},{thread:{id:'a'},providerId:{}}])assert.throws(()=>readThreadStart(value),/创建数据无效/);
 const result=readThreadStart({thread:{id:'a'},providerId:'p',sandboxPolicy:{type:'readOnly'},approvalPolicy:'on-request',apiKey:'private'});
 assert.deepEqual(result,{id:'a',providerId:'p',permissions:{sandbox:'readOnly',approvalPolicy:'on-request',reviewer:'unknown'}});
});
test('creation captures parameters, blocks duplicate local identity and permits other threads and retries',async()=>{
 const pending=[];const store=createThreadStore({start:options=>new Promise((resolve,reject)=>pending.push({options,resolve,reject}))},()=>{throw Error('start must not mutate application state')});
 const options={cwd:'D:/original',model:'model'};const a=store.start('a',options);options.cwd='D:/changed';
 await assert.rejects(store.start('a',options),/正在创建/);assert.equal(pending.length,1);assert.equal(pending[0].options.cwd,'D:/original');
 const b=store.start('b',options);pending[1].resolve({thread:{id:'remote-b'}});assert.equal((await b).id,'remote-b');
 const failed=assert.rejects(a,/offline/);pending[0].reject(Error('offline'));await failed;
 const retry=store.start('a',options);pending[2].resolve({thread:{id:'remote-a'}});assert.equal((await retry).id,'remote-a');
});
test('invalid responses release creation guard for explicit retry',async()=>{
 let valid=false;const store=createThreadStore({start:async()=>({thread:{id:valid?'remote':7}})},()=>{});
 await assert.rejects(store.start('a',{}),/创建数据无效/);valid=true;assert.equal((await store.start('a',{})).id,'remote');
});
