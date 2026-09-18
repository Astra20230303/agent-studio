const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createThreadRepository}=require('../src/threadRepository.ts');
const thread={id:'one',name:'Title',cwd:'D:/work',updatedAt:10,status:{type:'active'}};

test('browsing and content search route scopes and cursors through one page interface',async()=>{
 const calls=[];
 const source=Object.fromEntries(['list','archived','search'].map(method=>[method,async(...args)=>{calls.push([method,...args]);return {data:method==='search'?[{thread,snippet:'matched content'}]:[thread],nextCursor:'next'};}]));
 const repo=createThreadRepository(source);
 assert.equal((await repo.query()).data[0].id,'one');
 assert.equal((await repo.query({archived:true,cursor:'older',search:'  '})).nextCursor,'next');
 assert.equal((await repo.query({search:' needle ',cursor:'matches'})).data[0].snippet,'matched content');
 await repo.query({archived:true,search:'needle'});
 assert.deepEqual(calls,[['list',undefined],['archived','older'],['search','needle','matches',false],['search','needle',undefined,true]]);
});

test('both search scopes reject malformed results and allow retry without retaining failed state',async()=>{
 for(const archived of [false,true]){
  let response;
  const repo=createThreadRepository({list:async()=>response,archived:async()=>response,search:async()=>response});
  for(const item of [null,{}, {thread:{id:7},snippet:'x'},{thread:{id:' '},snippet:'x'},{thread,snippet:null}]){
   response={data:[{thread,snippet:'valid'},item]};
   await assert.rejects(repo.query({search:'x',archived}),/搜索结果无效/);
  }
  response={data:[{thread,snippet:'x'}],nextCursor:{}};
  await assert.rejects(repo.query({search:'x',archived}),/列表格式无效/);
  response={data:[{thread,snippet:'restored'}]};
  assert.equal((await repo.query({search:'x',archived})).data[0].snippet,'restored');
  response={data:{}};await assert.rejects(repo.query({archived}),/列表格式无效/);
 }
});

test('concurrent queries retain their scopes, surface transport errors, and return independent pages',async()=>{
 const pending=[];
 const repo=createThreadRepository({list:async()=>{throw Error('Offline');},archived:async()=>({threads:[thread]}),search:(...args)=>new Promise(resolve=>pending.push({args,resolve}))});
 const options={search:'first',archived:false,cursor:'a'};
 const first=repo.query(options); options.search='changed';options.archived=true;
 const second=repo.query({search:'second',archived:true,cursor:'b'});
 pending[1].resolve({data:[{thread:{...thread,id:'second'},snippet:'two'}]});
 assert.equal((await second).data[0].id,'second');
 pending[0].resolve({data:[{thread,snippet:'one'}]});
 const page=await first;page.data[0].status.type='changed';
 assert.equal(thread.status.type,'active');
 assert.deepEqual(pending.map(p=>p.args),[['first','a',false],['second','b',true]]);
 await assert.rejects(repo.query(),/Offline/);
 assert.equal((await repo.query({archived:true})).data[0].id,'one');
});
