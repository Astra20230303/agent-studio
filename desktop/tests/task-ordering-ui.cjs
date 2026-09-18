const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  const make=(id,status,next,last)=>({id,name:id,prompt:'sort fixture',kind:'reminder',model:'',permission:'read-only',notify:true,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},status,nextRunAt:next,runs:last?[{id:'run-'+id,status:'completed',trigger:'manual',startedAt:last}]:[]});
  window.__tasks=[make('Task 10','active','2026-09-19T02:00:00Z','2026-09-18T03:00:00Z'),make('Task 2','active','2026-09-19T01:00:00Z','2026-09-18T04:00:00Z'),make('Task 1','paused',null,null),make('Task 3','completed',null,'2026-09-18T05:00:00Z')];
  window.desktop={listModels:async()=>({ok:true,models:['test']}),listTasks:async()=>({ok:true,tasks:window.__tasks}),onTasksChanged:fn=>{window.__changed=fn;return()=>{};}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'已安排',exact:true}).click();
 const names=()=>page.locator('.task-open strong').allTextContents();const order=page.getByRole('combobox',{name:'任务排序'});
 await page.getByRole('button',{name:'查看任务 Task 10',exact:true}).waitFor();assert.deepEqual(await names(),['Task 10','Task 2','Task 1','Task 3']);
 await order.selectOption('next');assert.deepEqual(await names(),['Task 2','Task 10','Task 1','Task 3']);
 await order.selectOption('recent');assert.deepEqual(await names(),['Task 3','Task 2','Task 10','Task 1']);
 await order.selectOption('name');assert.deepEqual(await names(),['Task 1','Task 2','Task 3','Task 10']);
 await page.getByRole('tab',{name:'已开启',exact:true}).click();assert.deepEqual(await names(),['Task 2','Task 10']);
 await order.selectOption('next');await page.evaluate(()=>{window.__tasks[0].nextRunAt='2026-09-19T00:00:00Z';window.__changed();});
 await page.waitForFunction(()=>document.querySelector('.task-open strong')?.textContent==='Task 10');
 await page.getByRole('textbox',{name:'搜索已安排任务'}).fill('Task 2');assert.deepEqual(await names(),['Task 2']);
 assert.deepEqual(await page.evaluate(()=>window.__tasks.map(t=>t.id)),['Task 10','Task 2','Task 1','Task 3']);
 console.log('PASS: task ordering by next/recent/name, stable unscheduled tail, status/search combination and live reorder without source mutation');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
