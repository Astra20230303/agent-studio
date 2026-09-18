const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  const run=(id,status,output,error)=>({id,status,output,error,trigger:'manual',startedAt:'2026-09-18T00:00:00Z'});
  window.__task={id:'a',name:'History',prompt:'Task',kind:'reminder',model:'',permission:'read-only',notify:true,status:'active',nextRunAt:null,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},runs:[run('one','failed','Partial text','NETWORK failure'),run('two','completed','Success report'),run('three','interrupted','Retained output')]};
  window.desktop={listModels:async()=>({ok:true,models:['test']}),listTasks:async()=>({ok:true,tasks:[window.__task]}),taskDetail:async()=>({ok:true,task:window.__task}),onTasksChanged:fn=>{window.__changed=fn;return()=>{};}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'已安排',exact:true}).click();
 const open=()=>page.getByRole('button',{name:'查看任务 History',exact:true}).click();await open();
 const search=page.getByRole('searchbox',{name:'搜索运行记录'});const filter=page.getByRole('combobox',{name:'筛选运行结果'});const rows=page.locator('.task-run');
 await page.getByText('显示 3 / 3 条运行记录',{exact:true}).waitFor();await search.fill(' NETWORK ');assert.equal(await rows.count(),1);
 await rows.locator('summary').click();await rows.getByText('NETWORK failure',{exact:true}).waitFor();
 await filter.selectOption('completed');await page.getByText('没有匹配的运行记录',{exact:true}).waitFor();
 await search.fill('success');assert.equal(await rows.count(),1);await rows.locator('summary').click();await rows.getByRole('button',{name:'导出运行结果'}).waitFor();
 await filter.selectOption('all');await search.fill('retained');assert.equal(await rows.count(),1);
 await page.evaluate(()=>{window.__task.runs.unshift({id:'four',threadId:'remote-history',configuration:{name:'Old task',prompt:'Historical instructions',kind:'reminder',model:'',permission:'read-only'},status:'completed',output:'New retained content',trigger:'scheduled',startedAt:'2026-09-18T01:00:00Z'});window.__changed();});
 await page.getByText('显示 2 / 4 条运行记录',{exact:true}).waitFor();
 await search.fill('historical instructions');assert.equal(await rows.count(),1);await search.fill('remote-history');assert.equal(await rows.count(),1);
 await page.getByRole('dialog').getByRole('button',{name:'关闭对话框'}).click();await open();await page.getByText('显示 4 / 4 条运行记录',{exact:true}).waitFor();assert.equal(await search.inputValue(),'');
 console.log('PASS: history search covers output/errors, combines status, refreshes and resets on reopen');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
