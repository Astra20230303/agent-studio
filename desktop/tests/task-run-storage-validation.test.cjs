const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {TaskScheduler}=require('../electron/task-scheduler.cjs');
const run={id:'run',status:'running',trigger:'manual',startedAt:'2026-09-18T00:00:00Z'};
const task={id:'task',name:'Task',prompt:'Prompt',kind:'reminder',model:'',permission:'read-only',notify:true,status:'active',nextRunAt:null,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},runs:[run]};
test('invalid histories preserve file bytes and block writes before crash recovery persists',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-run-validation-'));const file=path.join(directory,'tasks.json');
 try{
  const invalid=[{...run,id:''},{...run,startedAt:'bad'},{...run,trigger:'unknown'},{...run,output:{}},{...run,status:'unknown'},{...run,threadId:[]},{...run,configuration:{name:'broken'}},{...run,environment:{cwd:5}}];
  for(const tasks of [...invalid.map(bad=>[{...task,runs:[run,{...bad,id:bad.id===''?'':'other'}]}]),[task,task],[{...task,runs:[run,run]}]]){
   const raw=JSON.stringify({version:1,tasks},null,3);fs.writeFileSync(file,raw);const scheduler=new TaskScheduler({directory});
   assert.throws(()=>scheduler.list(),/原文件未覆盖/);assert.throws(()=>scheduler.save(task),/原文件未覆盖/);assert.equal(fs.readFileSync(file,'utf8'),raw);await scheduler.stop();
  }
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('legacy valid records still recover interrupted state after repair',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-run-repair-'));const file=path.join(directory,'tasks.json');
 try{
  fs.writeFileSync(file,JSON.stringify({version:1,tasks:[task]}));const scheduler=new TaskScheduler({directory});
  assert.equal(scheduler.detail('task').runs[0].status,'interrupted');assert.equal(scheduler.detail('task').runs[0].configuration,undefined);await scheduler.stop();
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
