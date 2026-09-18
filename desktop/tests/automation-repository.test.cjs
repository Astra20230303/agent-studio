const {test}=require('node:test');const assert=require('node:assert/strict');
const {createAutomationRepository}=require('../src/automationRepository.ts');
const task={id:'a',name:'Task',prompt:'Test',kind:'agent',model:'test',notify:true,permission:'read-only',status:'active',nextRunAt:null,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},runs:[]};
test('automation repository rejects malformed lists atomically and permits repair',async()=>{
 let tasks=[task];const repo=createAutomationRepository(async()=>({tasks}));assert.deepEqual(await repo.list(),[task]);
 for(const broken of [{...task,runs:null},{...task,nextRunAt:'bad'},{...task,schedule:{kind:'once',at:'bad'}},{...task,runs:[{id:'r',status:'failed',startedAt:'bad'}]},{...task,name:{}},{...task,schedule:{kind:'daily',time:'99:99',timezone:'UTC'}}]){
  tasks=[task,broken];await assert.rejects(repo.list(),/任务列表格式无效/);
 }
 tasks=[task,task];await assert.rejects(repo.list(),/任务列表格式无效/);
 tasks=[task];assert.deepEqual(await repo.list(),[task]);
});
test('details must match the requested task and transport failures propagate',async()=>{
 const calls=[];const repo=createAutomationRepository(async(...args)=>{calls.push(args);return {task};});
 assert.deepEqual(await repo.detail('a'),task);await assert.rejects(repo.detail('b'),/任务详情格式无效/);
 assert.deepEqual(calls,[['taskDetail','a'],['taskDetail','b']]);
 await assert.rejects(createAutomationRepository(async()=>{throw Error('offline');}).list(),/offline/);
});
test('mutation methods preserve payloads, capture drafts and wait for transport',async()=>{
 const calls=[];let finish;
 const repo=createAutomationRepository((...args)=>{calls.push(args);return new Promise(resolve=>{finish=resolve;});});
 const draft=structuredClone(task);let done=false;
 const saving=repo.save(draft).then(()=>{done=true;});draft.schedule.time='11:00';
 await Promise.resolve();assert.equal(done,false);assert.equal(calls[0][1].schedule.time,'09:00');finish();await saving;
 for(const [method,args,operation] of [['run',['a'],'runTask'],['cancel',['a'],'cancelTask'],['remove',['a'],'deleteTask'],['setStatus',['a','paused'],'setTaskStatus']]){
  const pending=repo[method](...args);assert.deepEqual(calls.at(-1),[operation,...args]);finish();await pending;
 }
 await assert.rejects(createAutomationRepository(async()=>{throw Error('rejected');}).save(task),/rejected/);
});
