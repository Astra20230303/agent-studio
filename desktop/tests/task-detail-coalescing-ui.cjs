const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  const task=id=>({id,name:id,prompt:'Prompt '+id,kind:'reminder',model:'',permission:'read-only',notify:true,status:'active',nextRunAt:null,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},runs:[]});
  window.__tasks=[task('First'),task('Second')];window.__details=[];window.__lists=0;
  window.desktop={listModels:async()=>({ok:true,models:['test']}),listTasks:async()=>{window.__lists++;return {ok:true,tasks:structuredClone(window.__tasks)};},taskDetail:id=>new Promise(resolve=>window.__details.push({id,resolve})),onTasksChanged:fn=>{window.__changed=fn;return()=>{};}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'已安排',exact:true}).click();await page.getByRole('button',{name:'查看任务 First',exact:true}).click();await page.waitForFunction(()=>window.__details.length===1);
 for(let i=0;i<6;i++){await page.evaluate(()=>{window.__changed();return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});}
 assert.equal(await page.evaluate(()=>window.__details.length),1);
 await page.evaluate(()=>window.__details[0].resolve({ok:true,task:window.__tasks[0]}));await page.getByRole('dialog',{name:'First',exact:true}).waitFor();await page.waitForFunction(()=>window.__details.length===2);
 await page.getByRole('dialog').getByRole('button',{name:'关闭对话框'}).click();await page.getByRole('button',{name:'查看任务 Second',exact:true}).click();await page.waitForFunction(()=>window.__details.some(r=>r.id==='Second'));
 await page.evaluate(()=>window.__details.find(r=>r.id==='Second').resolve({ok:true,task:window.__tasks[1]}));await page.getByRole('dialog',{name:'Second',exact:true}).waitFor();
 await page.evaluate(()=>window.__details[1].resolve({ok:false,error:'Late first failure'}));await page.getByText('Prompt Second',{exact:true}).waitFor();assert.equal(await page.getByText('Late first failure',{exact:true}).count(),0);
 await page.evaluate(()=>{window.__changed();});await page.waitForFunction(()=>window.__details.filter(r=>r.id==='Second').length===2);
 await page.evaluate(()=>window.__details.filter(r=>r.id==='Second')[1].resolve({ok:false,error:'Temporary detail failure'}));await page.getByText('Temporary detail failure',{exact:true}).waitFor();
 await page.getByRole('dialog').getByRole('button',{name:'重试',exact:true}).click();await page.waitForFunction(()=>window.__details.filter(r=>r.id==='Second').length===3);
 await page.evaluate(()=>window.__details.filter(r=>r.id==='Second')[2].resolve({ok:true,task:{...window.__tasks[1],prompt:'Updated Second'}}));await page.getByText('Updated Second',{exact:true}).waitFor();assert.equal(await page.getByText('Temporary detail failure',{exact:true}).count(),0);
 await page.evaluate(()=>window.__changed());await page.waitForFunction(()=>window.__details.filter(r=>r.id==='Second').length===4);
 await page.getByRole('dialog').getByRole('button',{name:'关闭对话框'}).click();
 await page.evaluate(()=>{window.__details.filter(r=>r.id==='Second')[3].resolve({ok:true,task:window.__tasks[1]});return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});assert.equal(await page.getByRole('dialog').count(),0);
 console.log('PASS: overlapping detail refreshes coalesce, first response remains usable and stale task failure cannot overwrite current detail');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
