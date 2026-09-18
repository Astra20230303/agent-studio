const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {TaskScheduler}=require('../electron/task-scheduler.cjs');
test('run snapshot survives edits, failure and restart without copying credentials or histories',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-run-config-'));let fail=false;
 let scheduler=new TaskScheduler({directory,runner:async(task,{onResolved})=>{onResolved({cwd:directory,providerId:fail?'second':'first',apiKey:'never-persist',baseUrl:'never-persist'});if(fail)throw Error('fixture');return {output:'ok'};}});
 try{
  let task=scheduler.save({name:'Before',prompt:'Original prompt',kind:'agent',model:'original-model',providerId:'original',permission:'read-only',reasoningEffort:'high',timeoutMinutes:25,notify:true,schedule:{kind:'interval',minutes:60},apiKey:'never-copy'});
  await scheduler.run(task.id);task=scheduler.detail(task.id);const snapshot=task.runs[0].configuration;
  assert.equal(snapshot.timeoutMinutes,25);
  assert.equal(snapshot.prompt,'Original prompt');assert.equal(snapshot.apiKey,undefined);assert.equal(snapshot.runs,undefined);
  scheduler.save({...task,name:'After',prompt:'New prompt',model:'new-model',reasoningEffort:'low'});fail=true;await scheduler.run(task.id);
  await scheduler.stop();scheduler=new TaskScheduler({directory});
  const runs=scheduler.detail(task.id).runs;assert.deepEqual(runs[0].environment,{cwd:directory,providerId:'second'});assert.deepEqual(runs[1].environment,{cwd:directory,providerId:'first'});assert.equal(runs[0].status,'failed');assert.equal(runs[0].configuration.model,'new-model');assert.equal(runs[1].configuration.model,'original-model');assert.equal(runs[1].configuration.reasoningEffort,'high');assert.equal(runs[1].configuration.name,'Before');
 }finally{await scheduler.stop();fs.rmSync(directory,{recursive:true,force:true});}
});
