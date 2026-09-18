const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {once}=require('node:events');const {TaskScheduler}=require('../electron/task-scheduler.cjs');
test('live output is bounded, coalesced, finalized on failure and ignores late callbacks',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-task-progress-'));let progress,finish;
 let scheduler=new TaskScheduler({directory,runner:async(task,{onProgress})=>{progress=onProgress;return new Promise((resolve,reject)=>{finish=reject;});}});
 try{
  const task=scheduler.save({name:'Live',prompt:'Test',kind:'agent',model:'test',permission:'read-only',notify:false,schedule:{kind:'interval',minutes:60}});
  const pending=scheduler.run(task.id);await Promise.resolve();const changed=once(scheduler,'changed');let events=0;scheduler.on('changed',()=>events++);
  for(let i=0;i<100;i++)progress('x'.repeat(200001)+i);await changed;assert.equal(events,1);assert.equal(scheduler.detail(task.id).runs[0].output.length,200000);assert.equal(scheduler.list()[0].runs[0].output,undefined);
  finish(Error('Failed after partial output'));await pending;const saved=scheduler.detail(task.id).runs[0];assert.equal(saved.status,'failed');assert.ok(saved.output.endsWith('99'));
  progress('late');assert.equal(scheduler.detail(task.id).runs[0].output,saved.output);
  await scheduler.stop();scheduler=new TaskScheduler({directory});assert.equal(scheduler.detail(task.id).runs[0].output,saved.output);
 }finally{await scheduler.stop();fs.rmSync(directory,{recursive:true,force:true});}
});
