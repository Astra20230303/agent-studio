const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  const run=(status,id)=>({id,status,trigger:'manual',startedAt:'2026-09-18T00:00:00Z'});
  const make=(id,status,runs)=>({id,name:id,prompt:'inspect '+id,kind:'reminder',model:'',permission:'read-only',notify:true,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},status,nextRunAt:null,runs});
  window.__tasks=[make('active-failure','active',[run('failed','a')]),make('paused-failure','paused',[run('failed','b')]),make('completed-failure','completed',[run('failed','c')]),make('recovered','active',[run('completed','d'),run('failed','e')]),make('running','active',[run('running','f'),run('failed','g')]),make('never-run','active',[]),make('interrupted','active',[run('interrupted','h')])];
  window.desktop={listModels:async()=>({ok:true,models:['test']}),listTasks:async()=>({ok:true,tasks:window.__tasks}),onTasksChanged:fn=>{window.__changed=fn;return()=>{};}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 await page.getByRole('button',{name:'已安排',exact:true}).click();
 const tab=page.getByRole('tab',{name:'最近失败',exact:true});await tab.click();
 const rows=page.locator('.task-open');
 assert.equal(await rows.count(),3);
 assert.equal(await page.getByRole('button',{name:'查看任务 recovered',exact:true}).count(),0);
 const search=page.getByRole('textbox',{name:'搜索已安排任务'});await search.fill('paused');
 assert.equal(await rows.count(),1);await page.getByRole('button',{name:'查看任务 paused-failure',exact:true}).waitFor();
 await search.fill('');await page.evaluate(()=>{window.__tasks[0].runs.unshift({id:'retry',status:'completed',trigger:'manual',startedAt:'2026-09-18T01:00:00Z'});window.__changed();});
 await page.getByRole('button',{name:'查看任务 active-failure',exact:true}).waitFor({state:'detached'});assert.equal(await rows.count(),2);
 await tab.focus();await page.keyboard.press('Home');assert.equal(await page.getByRole('tab',{name:'全部',exact:true}).getAttribute('aria-selected'),'true');
 await page.keyboard.press('End');assert.equal(await tab.getAttribute('aria-selected'),'true');
 await page.evaluate(()=>{window.__tasks=[];window.__changed();});await page.getByText('暂无已安排的任务',{exact:true}).waitFor();
 console.log('PASS: latest failure filter combines status and search, excludes recovered/running/interrupted, refreshes and supports keyboard tabs');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
