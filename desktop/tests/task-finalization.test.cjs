const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {TaskScheduler}=require('../electron/task-scheduler.cjs');
test('failed final save retains result, blocks another execution and retries once without duplicate completion',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-final-save-'));let calls=0,finish;
 const scheduler=new TaskScheduler({directory,runner:async()=>{calls++;return new Promise(resolve=>{finish=resolve;});}});const persist=scheduler.persist.bind(scheduler);
 try{
  const task=scheduler.save({name:'Final',prompt:'Test',kind:'agent',model:'test',permission:'read-only',notify:true,schedule:{kind:'once',at:new Date(Date.now()+3600000).toISOString()}});
  let finished=0;scheduler.on('finished',()=>finished++);
  const pending=scheduler.run(task.id);await Promise.resolve();scheduler.persist=()=>{throw Error('Disk full');};finish({output:'FINAL_RESULT',threadId:'retained-thread'});await assert.rejects(pending,/结果尚未保存/);
  const memory=scheduler.detail(task.id);assert.equal(memory.status,'completed');assert.equal(memory.runs[0].status,'completed');assert.equal(memory.runs[0].output,'FINAL_RESULT');assert.equal(memory.runs[0].threadId,'retained-thread');assert.equal(finished,0);
  assert.throws(()=>scheduler.run(task.id),/结果尚未保存/);assert.throws(()=>scheduler.list(),/结果尚未保存/);assert.equal(calls,1);
  scheduler.persist=persist;await scheduler.tick();assert.equal(calls,1);assert.equal(finished,1);scheduler.list();await scheduler.tick();assert.equal(finished,1);
  const disk=JSON.parse(fs.readFileSync(scheduler.file,'utf8')).tasks[0];assert.equal(disk.runs[0].output,'FINAL_RESULT');assert.equal(disk.status,'completed');
 }finally{scheduler.persist=persist;await scheduler.stop();fs.rmSync(directory,{recursive:true,force:true});}
});
