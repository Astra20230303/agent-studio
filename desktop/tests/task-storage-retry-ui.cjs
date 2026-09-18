const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {TaskScheduler}=require('../electron/task-scheduler.cjs');
(async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'felix-storage-retry-ui-'));const file=path.join(directory,'tasks.json');fs.writeFileSync(file,'broken original');
 const scheduler=new TaskScheduler({directory});const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();await page.exposeFunction('readTasks',()=>{try{return {ok:true,tasks:scheduler.list()};}catch(error){return {ok:false,error:error.message};}});
  await page.addInitScript(()=>{window.desktop={listModels:async()=>({ok:true,models:['test']}),listTasks:()=>window.readTasks()};});
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'已安排',exact:true}).click();
  await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'重试',exact:true}).click();assert.equal(fs.readFileSync(file,'utf8'),'broken original');
  fs.writeFileSync(file,JSON.stringify({version:1,tasks:[{id:'recovered',name:'Recovered reminder',prompt:'Retained prompt',kind:'reminder',model:'',permission:'read-only',notify:true,status:'paused',nextRunAt:null,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},runs:[]}]}));
  await page.getByRole('button',{name:'重试',exact:true}).click();await page.getByRole('button',{name:'查看任务 Recovered reminder',exact:true}).waitFor();await page.getByRole('alert').waitFor({state:'detached'});
  assert.equal(scheduler.loadError,'');assert.equal(scheduler.detail('recovered').prompt,'Retained prompt');
  console.log('PASS: UI retry reads repaired native task storage without replacing scheduler or overwriting corrupt file');
 }finally{await browser.close();await scheduler.stop();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
