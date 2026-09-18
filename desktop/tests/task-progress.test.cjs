const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {once}=require('node:events');const {TaskScheduler}=require('../electron/task-scheduler.cjs');
test('live output is bounded, coalesced, finalized on failure and ignores late callbacks',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-task-progress-'));let progress,finish;
 let scheduler=new TaskScheduler({directory,runner:async(task,{onProgress})=>{progress=onProgress;return new Promise((resolve,reject)=>{finish=reject;});}});
 try{
  const task=scheduler.save({name:'Live',prompt:'Test',kind:'agent',model:'test',permission:'read-only',notify:false,schedule:{kind:'interval',minutes:60}});
  const pending=scheduler.run(task.id);await Promise.resolve();const changed=once(scheduler,'changed');let events=0;scheduler.on('changed',()=>events++);
  for(let i=0;i<100;i++)progress('x'.repeat(200001)+i);await changed;assert.equal(events,1);assert.equal(scheduler.detail(task.id).runs[0].output.length,200000);assert.equal(scheduler.detail(task.id).runs[0].outputTruncated,true);assert.equal(scheduler.list()[0].runs[0].output,undefined);
  finish(Error('Failed after partial output'));await pending;const saved=scheduler.detail(task.id).runs[0];assert.equal(saved.status,'failed');assert.ok(saved.output.endsWith('99'));
  progress('late');assert.equal(scheduler.detail(task.id).runs[0].output,saved.output);
  await scheduler.stop();scheduler=new TaskScheduler({directory});assert.equal(scheduler.detail(task.id).runs[0].output,saved.output);assert.equal(scheduler.detail(task.id).runs[0].outputTruncated,true);
 }finally{await scheduler.stop();fs.rmSync(directory,{recursive:true,force:true});}
});

test('periodic output checkpoint survives abrupt exit and retries disk failure without new output',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-checkpoint-'));const recoveredDirectory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-checkpoint-recovery-'));
 let progress,finish;const timers=[];const timer=global.setTimeout;
 t.mock.method(global,'setTimeout',(callback,delay,...args)=>{if(delay===2000){timers.push(callback);return {checkpoint:true};}return timer(callback,delay,...args);});
 const scheduler=new TaskScheduler({directory,runner:async(task,{onProgress})=>{progress=onProgress;return new Promise(resolve=>{finish=resolve;});}});
 let pending;
 try{
  const task=scheduler.save({name:'Checkpoint',prompt:'Test',kind:'agent',model:'test',permission:'read-only',notify:false,schedule:{kind:'interval',minutes:60}});
  pending=scheduler.run(task.id);await Promise.resolve();let writes=0;const persist=scheduler.persist.bind(scheduler);scheduler.persist=()=>{writes++;persist();};
  progress('First partial');progress('Second partial');assert.equal(timers.length,1);timers.shift()();assert.equal(writes,1);
  fs.copyFileSync(scheduler.file,path.join(recoveredDirectory,'tasks.json'));const recovered=new TaskScheduler({directory:recoveredDirectory});assert.equal(recovered.detail(task.id).runs[0].status,'interrupted');assert.equal(recovered.detail(task.id).runs[0].output,'Second partial');await recovered.stop();
  const before=fs.readFileSync(scheduler.file,'utf8');let failures=0;scheduler.on('failure',()=>failures++);scheduler.persist=()=>{throw Error('Disk full');};progress('Latest partial');timers.shift()();assert.equal(failures,1);assert.equal(fs.readFileSync(scheduler.file,'utf8'),before);assert.equal(scheduler.detail(task.id).runs[0].status,'running');
  timers.shift()();assert.equal(failures,1);scheduler.persist=persist;timers.shift()();assert.equal(JSON.parse(fs.readFileSync(scheduler.file,'utf8')).tasks[0].runs[0].output,'Latest partial');
  finish({output:'Final output'});await pending;assert.equal(scheduler.detail(task.id).runs[0].output,'Final output');
 }finally{finish?.({output:'cleanup'});if(pending)await pending;await scheduler.stop();fs.rmSync(directory,{recursive:true,force:true});fs.rmSync(recoveredDirectory,{recursive:true,force:true});}
});

test('real checkpoint timer persists before completion and is cancelled at finalization',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-checkpoint-timer-'));let progress,finish;
 const scheduler=new TaskScheduler({directory,runner:async(task,{onProgress})=>{progress=onProgress;return new Promise(resolve=>{finish=resolve;});}});
 let pending;
 try{
  const task=scheduler.save({name:'Timer',prompt:'Test',kind:'agent',model:'test',permission:'read-only',notify:false,schedule:{kind:'interval',minutes:60}});
  pending=scheduler.run(task.id);await Promise.resolve();const persist=scheduler.persist.bind(scheduler);let writes=0,resolveWrite;const written=new Promise(resolve=>{resolveWrite=resolve;});
  scheduler.persist=()=>{writes++;persist();resolveWrite();};progress('Checkpoint text');await written;
  assert.equal(JSON.parse(fs.readFileSync(scheduler.file,'utf8')).tasks[0].runs[0].output,'Checkpoint text');assert.equal(scheduler.detail(task.id).runs[0].status,'running');
  progress('Last partial');finish({output:'Complete'});await pending;const count=writes;
  await new Promise(resolve=>setTimeout(resolve,2200));assert.equal(writes,count);assert.equal(JSON.parse(fs.readFileSync(scheduler.file,'utf8')).tasks[0].runs[0].output,'Complete');
 }finally{finish?.({output:'cleanup'});if(pending)await pending;await scheduler.stop();fs.rmSync(directory,{recursive:true,force:true});}
});

test('conversation reference is durable before execution completes and survives interrupted recovery',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-live-conversation-'));const recovery=fs.mkdtempSync(path.join(os.tmpdir(),'felix-live-conversation-recovery-'));let finish;
 const scheduler=new TaskScheduler({directory,runner:async(task,{onConversation})=>{onConversation('live-thread');return new Promise(resolve=>{finish=resolve;});}});let pending;
 try{
  const task=scheduler.save({name:'Conversation',prompt:'Test',kind:'agent',model:'test',permission:'read-only',notify:false,schedule:{kind:'interval',minutes:60}});
  pending=scheduler.run(task.id);await Promise.resolve();assert.equal(scheduler.detail(task.id).runs[0].threadId,'live-thread');
  fs.copyFileSync(scheduler.file,path.join(recovery,'tasks.json'));const restored=new TaskScheduler({directory:recovery});assert.equal(restored.detail(task.id).runs[0].status,'interrupted');assert.equal(restored.detail(task.id).runs[0].threadId,'live-thread');await restored.stop();
  finish({output:'Final without ID'});await pending;assert.equal(scheduler.detail(task.id).runs[0].threadId,'live-thread');
 }finally{finish?.({output:'cleanup'});if(pending)await pending;await scheduler.stop();fs.rmSync(directory,{recursive:true,force:true});fs.rmSync(recovery,{recursive:true,force:true});}
});
