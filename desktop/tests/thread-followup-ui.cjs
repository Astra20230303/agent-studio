const{chromium}=require('playwright');const assert=require('node:assert/strict');const{TaskScheduler}=require('../electron/task-scheduler.cjs');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{const scheduler=new TaskScheduler({directory:fs.mkdtempSync(path.join(os.tmpdir(),'follow-ui-')),runner:async()=>({output:'Followup finished',followupComplete:true})});const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage();
await page.addInitScript(scenario=>{
  const cwd='D:\\Workspace2026\\my-agent-plantform';
  const projectId=scenario==='remote'?'project-a':cwd;
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeProjectId:projectId,projects:scenario==='local'?[{id:projectId,name:'Local',path:cwd,environment:'local',git:{isRepository:false}}]:[],activeThreadId:'a',threads:[{id:'a',remoteId:'follow-thread',projectId,cwd,title:'新对话',messages:[],status:'idle',updatedAt:''}]}));window.__calls=[];
  window.desktop={listModels:async()=>({ok:true,models:['test']}),providerStatus:async()=>({keyConfigured:true})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{
   window.__calls.push({method,params});
   if(method==='thread/start'){if(params.projectId && params.projectId!=='project-a')return{ok:false,error:`project not found: ${params.projectId}`};if(window.__hold)await new Promise(resolve=>window.__release=resolve);return{ok:true,result:window.__created}};
   if(method==='turn/start')return{ok:true,result:{turn:{id:'turn',status:'inProgress'}}};
   if(method==='thread/resume')return{ok:true,result:{thread:{id:params.threadId,turns:[]}}};
   return{ok:true,result:{data:[]}};
  },onNotification:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 },'local');


 await page.exposeFunction('tasks',async(method,...args)=>{
  if(method==='list')return {ok:true,tasks:scheduler.list()};
  if(method==='save')return {ok:true,task:scheduler.save(args[0])};
  if(method==='status'){scheduler.setStatus(...args);return {ok:true};}
  if(method==='run'){await scheduler.run(args[0]);return {ok:true};}
  if(method==='detail')return {ok:true,task:scheduler.detail(args[0])};
  if(method==='delete'){scheduler.remove(args[0]);return {ok:true};}
 });
 await page.addInitScript(()=>Object.assign(window.desktop,{listTasks:()=>window.tasks('list'),saveTask:d=>window.tasks('save',d),setTaskStatus:(...a)=>window.tasks('status',...a),runTask:id=>window.tasks('run',id),taskDetail:id=>window.tasks('detail',id),deleteTask:id=>window.tasks('delete',id)}));
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:15439');
 await page.getByRole('button',{name:'更多会话操作',exact:true}).click();
 await page.getByText('持续跟进',{exact:true}).click();
 await page.getByRole('textbox',{name:'跟进指令',exact:true}).fill('Check the original conversation');
 await page.getByRole('spinbutton',{name:'跟进间隔'}).fill('15');
 await page.getByRole('button',{name:'创建持续跟进'}).click();
 await page.getByRole('button',{name:'暂停跟进'}).waitFor();
 assert.equal(scheduler.list()[0].followupThreadId,'follow-thread');assert.equal(scheduler.list()[0].permission,'read-only');
 await page.getByRole('button',{name:'暂停跟进'}).click();await page.getByRole('button',{name:'恢复跟进'}).waitFor();
 await page.getByRole('button',{name:'恢复跟进'}).click();await page.getByRole('button',{name:'暂停跟进'}).waitFor();
 await page.getByRole('button',{name:'立即跟进'}).click();
 await page.getByRole('button',{name:'查看跟进记录'}).click();await page.getByText('Followup finished',{exact:true}).waitFor();
 assert.equal(scheduler.list()[0].status,'completed');
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'删除跟进'}).click();
 await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='删除跟进'));
 assert.equal(scheduler.list().length,0);
 console.log('PASS: followup UI uses real scheduler creation, pause, resume, completion history and deletion');
}finally{await browser.close();await scheduler.stop()}})().catch(error=>{console.error(error);process.exitCode=1});
