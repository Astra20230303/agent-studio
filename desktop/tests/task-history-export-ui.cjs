const {chromium}=require('playwright');const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
const {saveTerminal}=require('../electron/conversation-export.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'felix-history-export-'));let browser;const saved=[];let calls=0;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.exposeFunction('saveHistory',async(input,mode)=>{
   calls++;const file=path.join(root,`history-${calls}.txt`);
   const result=await saveTerminal(input,async()=>{if(mode==='fail')throw Error('Save unavailable');return mode==='cancel'?{canceled:true}:{filePath:file}});
   if(result.ok&&!result.canceled)saved.push(await fs.readFile(file,'utf8'));return result;
  });
  await page.addInitScript(()=>{
   const run={trigger:'manual',startedAt:'2026-09-18T00:00:00Z'};
   const task={id:'a',name:'History task',prompt:'Test',kind:'reminder',model:'',permission:'read-only',notify:true,status:'active',nextRunAt:null,schedule:{kind:'daily',time:'09:00',timezone:'UTC'},runs:[{...run,id:'live',status:'running',output:'Partial output'},{...run,id:'failed',status:'failed',error:'needle failure',output:'Failure output'},{...run,id:'done',status:'completed',output:'needle success'},{...run,id:'stopped',status:'interrupted',output:'other output'}]};
   window.__exports=0;
   window.desktop={listTasks:async()=>({ok:true,tasks:[task]}),taskDetail:async()=>({ok:true,task}),saveTaskOutput:async input=>{
    window.__exports++;if(window.__hold)await new Promise(resolve=>window.__release=resolve);
    return window.saveHistory(input,window.__mode);
   }};
  });
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'已安排',exact:true}).click();
  await page.getByRole('button',{name:'查看任务 History task',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'搜索运行记录',exact:true});const status=page.getByRole('combobox',{name:'筛选运行结果',exact:true});
  await page.getByRole('button',{name:'导出已结束记录（3）',exact:true}).waitFor();
  await status.selectOption('running');assert.ok(await page.getByRole('button',{name:'导出已结束记录（0）',exact:true}).isDisabled());
  await status.selectOption('failed');await search.fill('needle');
  await page.evaluate(()=>window.__hold=true);
  await page.getByRole('button',{name:'导出已结束记录（1）',exact:true}).evaluate(button=>{button.click();button.click()});
  await page.waitForFunction(()=>!!window.__release);assert.equal(await page.evaluate(()=>window.__exports),1);
  await search.fill('no match');assert.ok(await page.getByRole('button',{name:'正在导出运行历史…',exact:true}).isDisabled());
  await page.evaluate(()=>{window.__hold=false;window.__release()});await page.getByText('已导出 1 条运行记录',{exact:true}).waitFor();
  assert.ok(await page.getByRole('button',{name:'导出已结束记录（0）',exact:true}).isDisabled());
  assert.equal(saved.length,1);assert.match(saved[0],/结果筛选：失败/);assert.match(saved[0],/搜索：needle/);assert.match(saved[0],/运行 ID：failed/);
  assert.ok(!saved[0].includes('运行 ID：done'));assert.ok(!saved[0].includes('Partial output'));
  await search.fill('');await status.selectOption('all');
  await page.evaluate(()=>window.__mode='cancel');await page.getByRole('button',{name:'导出已结束记录（3）',exact:true}).click();
  await page.waitForFunction(()=>window.__exports===2);await page.getByRole('button',{name:'导出已结束记录（3）',exact:true}).waitFor();
  assert.equal(saved.length,1);assert.equal(await page.getByText(/已导出 \d 条运行记录/).count(),0);
  await page.evaluate(()=>window.__mode='fail');await page.getByRole('button',{name:'导出已结束记录（3）',exact:true}).click();
  await page.getByText('Save unavailable',{exact:true}).waitFor();assert.equal(saved.length,1);
  await page.evaluate(()=>window.__mode='ok');await page.getByRole('button',{name:'导出已结束记录（3）',exact:true}).click();
  await page.getByText('已导出 3 条运行记录',{exact:true}).waitFor();assert.equal(saved.length,2);
  for(const id of ['failed','done','stopped'])assert.ok(saved[1].includes(`运行 ID：${id}`));assert.ok(!saved[1].includes('运行 ID：live'));
  console.log('PASS: filtered history export writes real files, captures selection, excludes running, retries and handles cancellation');
 }finally{await browser?.close();await fs.rm(root,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
