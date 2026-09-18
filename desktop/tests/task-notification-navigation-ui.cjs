const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  const task={id:'a',name:'Notification task',prompt:'fixture',kind:'reminder',model:'',permission:'read-only',notify:true,status:'active',nextRunAt:null,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},runs:[]};
  window.desktop={onOpenTask:fn=>{window.__openTask=fn;return()=>{};},listTasks:async()=>({ok:true,tasks:[task]}),taskDetail:async()=>({ok:true,task})};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.waitForFunction(()=>window.__openTask);
 await page.getByRole('textbox',{name:'消息',exact:true}).fill('Keep my draft');
 await page.evaluate(()=>window.__openTask('a'));
 const detail=page.getByRole('dialog',{name:'Notification task',exact:true});await detail.waitFor();
 assert.ok(await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('felix-thread-drafts-v1'))).includes('Keep my draft')));
 await page.keyboard.press('Escape');await detail.waitFor({state:'detached'});
 await page.evaluate(()=>window.__openTask('a'));await detail.waitFor();await page.keyboard.press('Escape');
 await page.evaluate(()=>window.__openTask('deleted'));await page.getByText('通知对应的任务已不存在。',{exact:true}).waitFor();
 await page.getByRole('button',{name:'新对话',exact:true}).click();
 await page.getByRole('button',{name:'已安排',exact:true}).click();
 await page.getByRole('heading',{name:'已安排的任务',exact:true}).waitFor();
 assert.equal(await page.getByRole('dialog').count(),0);
 await page.evaluate(()=>window.__openTask('a'));await detail.waitFor();
 assert.equal(await page.getByText('通知对应的任务已不存在。',{exact:true}).count(),0);
 console.log('PASS: task notification opens matching detail, repeated clicks reopen and deleted tasks show explicit feedback');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
