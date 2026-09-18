const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {duplicateTask}=require('../src/duplicateTask.ts');
const {TaskScheduler}=require('../electron/task-scheduler.cjs');
const now=Date.parse('2026-09-18T00:00:00Z');
const input={name:'Original',prompt:'Reminder text',kind:'reminder',model:'',permission:'read-only',notify:true,notificationPolicy:'failed_runs_only',schedule:{kind:'once',at:new Date(now+60000).toISOString()}};
test('duplicate gets independent ID and history in real scheduler and survives restart',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-task-copy-'));
 let clock=now;let scheduler=new TaskScheduler({directory,now:()=>clock});
 try {
  const source=scheduler.save(input);clock+=120000;await scheduler.tick();
  const original=scheduler.detail(source.id);assert.equal(original.status,'completed');assert.equal(original.runs.length,1);
  const draft=duplicateTask(original,clock);assert.equal(draft.schedule.at,new Date(clock+3600000).toISOString());
  const copy=scheduler.save(draft);assert.notEqual(copy.id,original.id);assert.equal(copy.status,'active');assert.equal(copy.runs.length,0);
  scheduler.save({...copy,name:'Edited copy',prompt:'Independent content'});
  assert.deepEqual(JSON.parse(JSON.stringify(scheduler.detail(source.id))),JSON.parse(JSON.stringify(original)));
  await scheduler.stop();scheduler=new TaskScheduler({directory,now:()=>clock});
  assert.equal(scheduler.detail(copy.id).name,'Edited copy');assert.equal(scheduler.detail(copy.id).runs.length,0);
  assert.deepEqual(JSON.parse(JSON.stringify(scheduler.detail(source.id))),JSON.parse(JSON.stringify(original)));
 } finally {await scheduler.stop();fs.rmSync(directory,{recursive:true,force:true});}
});
test('copy preserves future schedules and isolates nested configuration, with bounded names',()=>{
 for(const schedule of [input.schedule,{kind:'weekly',day:2,time:'09:15',timezone:'Asia/Shanghai'},{kind:'interval',minutes:45}]){
  const source={...input,name:'x'.repeat(120),schedule, id:'original',status:'paused',nextRunAt:null,runs:[]};
  const copy=duplicateTask(source,now);assert.deepEqual(copy.schedule,schedule);assert.notEqual(copy.schedule,schedule);
  assert.ok(copy.name.length<=120);assert.equal(copy.id,undefined);assert.equal(copy.runs,undefined);
 }
});
