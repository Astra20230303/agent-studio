const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({reasoningEffort:'high',activeThreadId:'local',threads:[{id:'local',title:'Original chat',status:'completed',messages:[],updatedAt:''}]}));
  const task={id:'task',name:'Generated task',prompt:'fixture',kind:'agent',model:'test',permission:'read-only',notify:true,status:'active',nextRunAt:null,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},runs:[{id:'run',status:'completed',trigger:'manual',startedAt:'2026-09-18T00:00:00Z',threadId:'remote-task',output:'Task output'},{id:'legacy',status:'completed',trigger:'manual',startedAt:'2026-09-17T00:00:00Z'}]};
  window.__resumes=[];window.desktop={listModels:async()=>({ok:true,models:['test']}),listTasks:async()=>({ok:true,tasks:[task]}),taskDetail:async()=>({ok:true,task})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{if(method==='thread/resume'){window.__resumes.push(params.threadId);if(window.__failResume)return {ok:false,error:'Task resume unavailable'};return {ok:true,result:{reasoningEffort:null,thread:{id:params.threadId,turns:[{id:'turn',items:[{id:'answer',type:'agentMessage',text:'Restored task conversation'}]}]}}};}return {ok:true,result:{data:[]}};},onNotification:()=>()=>{},onServerRequest:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 await page.getByRole('textbox',{name:'消息',exact:true}).fill('Original draft');
 await page.getByRole('button',{name:'已安排',exact:true}).click();await page.getByRole('button',{name:'查看任务 Generated task',exact:true}).click();
 await page.locator('.task-run summary').first().click();
 assert.equal(await page.getByRole('button',{name:'打开运行会话',exact:true}).count(),1);
 await page.getByRole('button',{name:'打开运行会话',exact:true}).click();
 await page.getByText('Restored task conversation',{exact:true}).waitFor();assert.deepEqual(await page.evaluate(()=>window.__resumes),['remote-task']);
 await page.getByRole('button',{name:'推理强度：模型默认',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t=>t.remoteId==='remote-task').reasoningEffort),'default');
 await page.getByRole('button',{name:'Original chat',exact:true}).click();await page.getByRole('button',{name:'推理强度：高',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'消息',exact:true}).inputValue(),'Original draft');
 await page.evaluate(()=>{window.__failResume=true;});
 await page.getByRole('button',{name:'已安排',exact:true}).click();await page.getByRole('button',{name:'查看任务 Generated task',exact:true}).click();
 await page.locator('.task-run summary').first().click();await page.getByRole('button',{name:'打开运行会话',exact:true}).click();
 const error=page.getByRole('alert',{name:'会话恢复失败'});await error.waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.filter(t=>t.remoteId==='remote-task').length),1);
 await page.evaluate(()=>{window.__failResume=false;});await error.getByRole('button',{name:'重试恢复会话',exact:true}).click();await error.waitFor({state:'detached'});
 await page.getByText('Restored task conversation',{exact:true}).waitFor();
 console.log('PASS: task run opens and restores exact remote conversation while original draft is retained');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
