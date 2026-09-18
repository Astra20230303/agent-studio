const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {TaskScheduler}=require('../electron/task-scheduler.cjs');
const {shouldNotifyTask}=require('../electron/task-notifications.cjs');
test('task notification policies preserve legacy behavior and filter successes and interruption',()=>{
 for(const status of ['completed','failed','interrupted']){
  assert.equal(shouldNotifyTask({notify:true,runs:[{status}]}),true);
  assert.equal(shouldNotifyTask({notify:false,notificationPolicy:'failed_runs_only',runs:[{status}]}),false);
  assert.equal(shouldNotifyTask({notify:true,notificationPolicy:'failed_runs_only',runs:[{status}]}),status==='failed');
 }
 assert.equal(shouldNotifyTask({notify:true,runs:[]}),false);
});
test('scheduler persists policy across restart and finished events honor it',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-task-notify-'));
 let fail=false;const runner=async()=>{if(fail)throw Error('fixture failure');return {output:'done'};};
 let scheduler=new TaskScheduler({directory,runner});
 const task=scheduler.save({name:'Policy',prompt:'fixture',kind:'agent',model:'test',permission:'read-only',notify:true,notificationPolicy:'failed_runs_only',schedule:{kind:'daily',time:'09:00',timezone:'UTC'}});
 await scheduler.stop();scheduler=new TaskScheduler({directory,runner});
 try{
  assert.equal(scheduler.detail(task.id).notificationPolicy,'failed_runs_only');
  const notices=[];scheduler.on('finished',task=>{if(shouldNotifyTask(task))notices.push(task.runs[0].status);});
  await scheduler.run(task.id);assert.deepEqual(notices,[]);
  fail=true;await scheduler.run(task.id);assert.deepEqual(notices,['failed']);
  assert.throws(()=>scheduler.save({...task,notificationPolicy:'invalid'}),/通知策略无效/);
  scheduler.save({...task,notificationPolicy:null});fail=false;await scheduler.run(task.id);assert.deepEqual(notices,['failed','completed']);
 }finally{await scheduler.stop();}
});
