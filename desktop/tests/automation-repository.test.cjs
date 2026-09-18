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

test('run configuration accepts legacy records and rejects malformed snapshots before rendering',async()=>{
 const run={id:'r',status:'completed',startedAt:'2026-09-18T00:00:00Z'};
 let value={...task,runs:[run]};const repo=createAutomationRepository(async()=>({task:value}));
 await repo.detail('a');
 const valid={name:'Before',prompt:'Old prompt',kind:'agent',model:'old',permission:'read-only',reasoningEffort:'high'};
 value.runs=[{...run,configuration:valid}];await repo.detail('a');
 for(const config of [[],{}, {...valid,prompt:{}},{...valid,providerId:1},{...valid,reasoningEffort:'invalid'},{...valid,permission:'unknown'}]){
  value.runs=[{...run,configuration:config}];await assert.rejects(repo.detail('a'),/任务详情格式无效/);
 }
 value.runs=[run];await repo.detail('a');
});

test('resolved environment is optional for old records and validated when present',async()=>{
 const run={id:'r',status:'failed',startedAt:'2026-09-18T00:00:00Z'};
 let value={...task,runs:[run]};const repo=createAutomationRepository(async()=>({task:value}));
 for(const environment of [{cwd:'D:/work',providerId:'p'},{cwd:'D:/work'}]) {value.runs=[{...run,environment}];await repo.detail('a');}
 for(const environment of [{cwd:{}},{cwd:''},{cwd:'D:/work',providerId:2},[]]){value.runs=[{...run,environment}];await assert.rejects(repo.detail('a'),/任务详情格式无效/);}
});

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
test('all writes share task identity exclusion while independent tasks and reads proceed',async()=>{
 const actions=[repo=>repo.save(task),repo=>repo.run('a'),repo=>repo.cancel('a'),repo=>repo.remove('a'),repo=>repo.setStatus('a','paused')];
 for(const first of actions){
  const hold=deferred();const calls=[];
  const repo=createAutomationRepository(async(operation,arg)=>{
   calls.push(operation);
   if(operation==='listTasks')return{tasks:[task]};if(operation==='taskDetail')return{task};
   if(arg==='a'||arg?.id==='a')return hold.promise;
  });
  const pending=first(repo);
  for(const attempt of actions)await assert.rejects(attempt(repo),/操作尚未完成/);
  assert.equal(calls.length,1);
  await repo.setStatus('b','paused');assert.equal((await repo.list()).length,1);await repo.detail('a');
  hold.resolve();await pending;await repo.setStatus('a','active');
 }
});
test('creation excludes duplicate requests, captures input, and failure releases the lock',async()=>{
 const hold=deferred();const calls=[];let first=true;
 const repo=createAutomationRepository((...args)=>{calls.push(args);if(first){first=false;return hold.promise;}return Promise.resolve();});
 const draft={...task,id:undefined,schedule:{kind:'interval',minutes:5}};
 const pending=assert.rejects(repo.save(draft),/save failed/);draft.schedule.minutes=10;
 await assert.rejects(repo.save(draft),/操作尚未完成/);assert.equal(calls[0][1].schedule.minutes,5);
 hold.reject(Error('save failed'));await pending;await repo.save(draft);assert.equal(calls.length,2);
});
test('independent repositories and synchronous transport failures do not retain locks',async()=>{
 const repo=createAutomationRepository(()=>{throw Error('offline')});
 await assert.rejects(repo.run('a'),/offline/);await assert.rejects(repo.cancel('a'),/offline/);
 const hold=deferred();const pending=createAutomationRepository(()=>hold.promise).run('a');
 await createAutomationRepository(async()=>{}).run('a');hold.resolve();await pending;
});
