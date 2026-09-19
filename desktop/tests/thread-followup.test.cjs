const {test}=require('node:test');const assert=require('node:assert/strict');const {EventEmitter}=require('node:events');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createThreadFollowupRunner}=require('../electron/thread-followup-runner.cjs');
const {TaskScheduler,validateTask}=require('../electron/task-scheduler.cjs');
const {shouldNotifyTask}=require('../electron/task-notifications.cjs');
const task={name:'Follow',prompt:'Check',kind:'agent',model:'test',cwd:process.cwd(),followupThreadId:'thread',permission:'read-only',notify:true,schedule:{kind:'interval',minutes:1}};
test('followup stays on original thread, locks, ignores unrelated completion and cleans listeners',async()=>{
 const rpc=new EventEmitter();const calls=[];rpc.notify=()=>{};
 rpc.request=async(method,params)=>{calls.push({method,params});if(method==='thread/read')return {thread:{id:'thread',cwd:process.cwd(),status:{type:'idle'},turns:[]}};if(method==='turn/start'){
  rpc.emit('notification',{method:'turn/completed',params:{threadId:'other',turn:{id:'turn',status:'failed'}}});
  rpc.emit('notification',{method:'item/agentMessage/delta',params:{threadId:'thread',turnId:'turn',delta:'Done\n[FELIX_FOLLOWUP_COMPLETE]'}});
  rpc.emit('notification',{method:'turn/completed',params:{threadId:'thread',turn:{id:'turn',status:'completed'}}});return{turn:{id:'turn',status:'inProgress'}};}return{};};
 const runner=createThreadFollowupRunner({getRpc:async()=>rpc,request:(rpc,m,p)=>rpc.request(m,p)});
 const pending=runner.run(task,{signal:new AbortController().signal});assert.ok(runner.active.has('thread'));
 await assert.rejects(runner.run(task,{signal:new AbortController().signal}),/运行中/);
 const result=await pending;assert.equal(result.followupComplete,true);assert.equal(result.threadId,'thread');
 assert.equal(calls.filter(c=>c.method==='thread/start').length,0);assert.equal(calls.find(c=>c.method==='turn/start').params.sandboxPolicy.type,'readOnly');
 assert.equal(runner.active.size,0);assert.equal(rpc.listenerCount('notification'),0);
});
test('busy thread never receives another turn',async()=>{
 const rpc=new EventEmitter();rpc.notify=()=>{};rpc.request=async method=>method==='thread/read'?{thread:{id:'thread',status:{type:'active'},turns:[{id:'busy',status:'inProgress'}]}}:{};
 const runner=createThreadFollowupRunner({getRpc:async()=>rpc,request:()=>{throw Error('must not dispatch')}});
 await assert.rejects(runner.run(task,{signal:new AbortController().signal}),/会话正在执行/);assert.equal(runner.active.size,0);
});
test('cancel interrupts only the followup turn and releases its listeners and lock',async()=>{
 const rpc=new EventEmitter(), controller=new AbortController(), calls=[];rpc.notify=()=>{};
 rpc.request=async(method,params)=>{calls.push({method,params});if(method==='thread/read')return{thread:{id:'thread',cwd:process.cwd(),status:{type:'idle'}}};if(method==='turn/start'){setImmediate(()=>controller.abort());return{turn:{id:'owned-turn',status:'inProgress'}};}return{};};
 const runner=createThreadFollowupRunner({getRpc:async()=>rpc,request:(rpc,m,p)=>rpc.request(m,p)});
 await assert.rejects(runner.run(task,{signal:controller.signal}),/取消/);
 assert.deepEqual(calls.find(c=>c.method==='turn/interrupt').params,{threadId:'thread',turnId:'owned-turn'});
 assert.equal(runner.active.size,0);assert.equal(rpc.listenerCount('notification'),0);assert.equal(rpc.listenerCount('closed'),0);
});
test('followup persistence, quiet unchanged result, completion stops schedule, pause and resume',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-follow-'));let result={output:'[FELIX_FOLLOWUP_UNCHANGED]',silent:true};
 let scheduler=new TaskScheduler({directory,runner:async()=>result});const saved=scheduler.save(task);
 await scheduler.run(saved.id);assert.equal(shouldNotifyTask(scheduler.detail(saved.id)),false);
 scheduler.setStatus(saved.id,'paused');assert.equal(scheduler.detail(saved.id).nextRunAt,null);
 scheduler.setStatus(saved.id,'active');result={output:'done',followupComplete:true};await scheduler.run(saved.id);
 assert.equal(scheduler.detail(saved.id).status,'completed');assert.equal(scheduler.detail(saved.id).nextRunAt,null);assert.ok(shouldNotifyTask(scheduler.detail(saved.id)));
 await scheduler.stop();scheduler=new TaskScheduler({directory,runner:async()=>result});assert.equal(scheduler.detail(saved.id).followupThreadId,'thread');assert.equal(scheduler.detail(saved.id).status,'completed');await scheduler.stop();
 assert.throws(()=>validateTask({...task,followupThreadId:'bad id'},Date.now()),/跟进会话/);
});
