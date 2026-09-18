const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {TaskScheduler}=require('../electron/task-scheduler.cjs');
test('frequent task lists omit historical bodies while detail retains snapshots and environment',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-list-payload-'));
 const scheduler=new TaskScheduler({directory,runner:async(task,{onResolved,onConversation})=>{onResolved({cwd:directory,providerId:'actual'});onConversation('thread');return {output:'x'.repeat(200001)};}});
 try{
  const original=scheduler.save({name:'Payload',prompt:'p'.repeat(20000),kind:'agent',model:'test',permission:'read-only',notify:true,schedule:{kind:'interval',minutes:60}});
  for(let i=0;i<5;i++)await scheduler.run(original.id);
  const detail=scheduler.detail(original.id);const listed=scheduler.list()[0];assert.equal(listed.runs.length,5);
  for(let i=0;i<5;i++){
   const brief=listed.runs[i],full=detail.runs[i];assert.equal(brief.configuration,undefined);assert.equal(brief.environment,undefined);assert.equal(brief.output,undefined);
   for(const field of ['id','status','startedAt','finishedAt','trigger','threadId','outputTruncated'])assert.equal(brief[field],full[field]);
   assert.equal(full.configuration.prompt,original.prompt);assert.equal(full.environment.providerId,'actual');assert.equal(full.output.length,200000);
  }
  const previousListBytes=Buffer.byteLength(JSON.stringify({...detail,runs:detail.runs.map(({output,...run})=>run)}));
  const summaryBytes=Buffer.byteLength(JSON.stringify(listed));const detailBytes=Buffer.byteLength(JSON.stringify(detail));assert.ok(summaryBytes<detailBytes/20);assert.ok(summaryBytes<previousListBytes/4);
  listed.runs[0].status='running';assert.equal(scheduler.detail(original.id).runs[0].status,'completed');
  console.log(`Payload fixture: previous list ${previousListBytes} bytes, current list ${summaryBytes} bytes, detail ${detailBytes} bytes`);
 }finally{await scheduler.stop();fs.rmSync(directory,{recursive:true,force:true});}
});
