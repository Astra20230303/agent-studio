const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  window.__saves=[];window.__previews=[];
  window.desktop={listModels:async()=>({ok:true,models:['test']}),listTasks:async()=>({ok:true,tasks:[]}),saveTask:async value=>{window.__saves.push(value);return {ok:true};},previewTaskSchedule:async schedule=>{window.__previews.push(schedule);return {ok:true,times:['2099-01-01T00:00:00Z']};}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'已安排',exact:true}).click();
 await page.getByRole('button',{name:'创建',exact:true}).click();await page.getByRole('menuitem',{name:'提醒',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'创建任务',exact:true});const frequency=editor.getByLabel('频率');
 await editor.getByLabel('任务名称',{exact:true}).fill('Frequency conversion');await editor.getByRole('textbox',{name:'任务内容',exact:true}).fill('Preserve schedule settings');
 await frequency.selectOption('weekly');await editor.getByRole('combobox',{name:'星期',exact:true}).selectOption('5');
 await editor.getByLabel('运行时间',{exact:true}).fill('18:45');await editor.getByRole('combobox',{name:'任务时区',exact:true}).selectOption('Australia/Sydney');
 await editor.getByRole('button',{name:'预览运行时间',exact:true}).click();await editor.locator('time').waitFor();
 await frequency.selectOption('customWeek');assert.equal(await editor.locator('time').count(),0);
 for(const day of ['日','一','二','三','四','五','六'])assert.equal(await editor.getByRole('checkbox',{name:`运行日 星期${day}`,exact:true}).isChecked(),day==='五');
 await editor.getByRole('checkbox',{name:'运行日 星期二',exact:true}).check();
 await frequency.selectOption('weekly');assert.equal(await editor.getByRole('combobox',{name:'星期',exact:true}).inputValue(),'2');
 await frequency.selectOption('monthly');await editor.getByRole('spinbutton',{name:'每月运行日期',exact:true}).fill('31');
 await editor.getByRole('button',{name:'预览运行时间',exact:true}).click();await editor.locator('time').waitFor();
 assert.deepEqual(await page.evaluate(()=>window.__previews.at(-1)),{kind:'monthly',time:'18:45',timezone:'Australia/Sydney',monthDay:31});
 await frequency.selectOption('daily');assert.equal(await editor.locator('time').count(),0);
 assert.equal(await editor.getByLabel('运行时间',{exact:true}).inputValue(),'18:45');assert.equal(await editor.getByRole('combobox',{name:'任务时区',exact:true}).inputValue(),'Australia/Sydney');
 await editor.getByRole('button',{name:'保存任务',exact:true}).click();await editor.waitFor({state:'detached'});
 assert.deepEqual(await page.evaluate(()=>window.__saves[0].schedule),{kind:'daily',time:'18:45',timezone:'Australia/Sydney'});
 console.log('PASS: task frequency UI retains weekdays/timezone, invalidates previews and sends no obsolete schedule fields');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
