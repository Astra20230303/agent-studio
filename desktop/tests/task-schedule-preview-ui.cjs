const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  window.__pending=[];window.__saves=[];
  window.desktop={listModels:async()=>({ok:true,models:['test']}),listTasks:async()=>({ok:true,tasks:[]}),saveTask:async value=>{window.__saves.push(value);return {ok:true};},previewTaskSchedule:schedule=>new Promise((resolve,reject)=>window.__pending.push({schedule,resolve,reject}))};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'已安排',exact:true}).click();
 await page.getByRole('button',{name:'创建',exact:true}).click();await page.getByRole('menuitem',{name:'提醒',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'创建任务',exact:true});const preview=editor.getByRole('region',{name:'运行时间预览',exact:true});
 await editor.getByLabel('频率').selectOption('interval');const minutes=editor.getByRole('spinbutton',{name:'任务间隔分钟数'});
 for(const outcome of ['resolve','reject']){
  const base=await page.evaluate(()=>window.__pending.length);
  await minutes.fill('5');await preview.getByRole('button',{name:'预览运行时间',exact:true}).click();
  assert.equal(await preview.getByRole('button',{name:'正在计算…',exact:true}).isDisabled(),true);
  await minutes.fill('10');await preview.getByRole('button',{name:'预览运行时间',exact:true}).click();
  await page.waitForFunction(base=>window.__pending.length===base+2,base);
  await page.evaluate(({base,outcome})=>{if(outcome==='reject')window.__pending[base].reject(new Error('Obsolete preview error'));else window.__pending[base].resolve({ok:true,times:['2098-01-01T00:00:00.000Z']});},{base,outcome});
  assert.equal(await preview.getByRole('button',{name:'正在计算…',exact:true}).isDisabled(),true);
  assert.equal(await preview.locator('time').count(),0);assert.equal(await preview.getByRole('alert').count(),0);
  await page.evaluate(base=>window.__pending[base+1].resolve({ok:true,times:['2099-01-01T00:00:00.000Z']}),base);
  await preview.locator('time').waitFor();assert.equal(await preview.locator('time').getAttribute('datetime'),'2099-01-01T00:00:00.000Z');
 }
 for(const times of [[],['bad'],['2099-01-02','2099-01-01']]){
  const index=await page.evaluate(()=>window.__pending.length);
  await preview.getByRole('button',{name:'预览运行时间',exact:true}).click();
  await page.evaluate(({index,times})=>window.__pending[index].resolve({ok:true,times}),{index,times});
  await preview.getByRole('alert').filter({hasText:'运行时间预览响应无效'}).waitFor();assert.equal(await preview.locator('time').count(),0);
 }
 const last=await page.evaluate(()=>window.__pending.length);await preview.getByRole('button',{name:'预览运行时间',exact:true}).click();
 await page.evaluate(index=>window.__pending[index].resolve({ok:true,times:['2099-02-01T00:00:00.000Z']}),last);
 await preview.locator('time').waitFor();assert.equal(await preview.getByRole('alert').count(),0);assert.equal(await page.evaluate(()=>window.__saves.length),0);
 console.log('PASS: schedule preview isolates late results/errors, retains current request lock, rejects malformed responses and retries without saving');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
