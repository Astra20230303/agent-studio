const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  window.__saves=[];window.desktop={listModels:async()=>({ok:true,models:['test']}),listTasks:async()=>({ok:true,tasks:[]}),saveTask:async input=>{window.__saves.push(input);return {ok:true};}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'已安排',exact:true}).click();
 const open=async()=>{await page.getByRole('button',{name:'创建',exact:true}).click();await page.getByRole('menuitem',{name:'提醒',exact:true}).click();};
 await open();let editor=page.getByRole('dialog',{name:'创建任务',exact:true});
 await page.keyboard.press('Escape');await editor.waitFor({state:'detached'});
 await open();await editor.getByLabel('任务名称',{exact:true}).fill('Retained task');await editor.getByRole('textbox',{name:'任务内容',exact:true}).fill('Retained prompt');
 await page.keyboard.press('Escape');const warning=editor.getByRole('alert',{name:'放弃任务修改'});await warning.waitFor();
 assert.ok(await warning.getByRole('button',{name:'继续编辑'}).evaluate(el=>el===document.activeElement));
 await page.keyboard.press('Escape');await warning.waitFor({state:'detached'});assert.equal(await editor.getByRole('textbox',{name:'任务内容',exact:true}).inputValue(),'Retained prompt');
 await editor.getByRole('button',{name:'取消',exact:true}).click();await warning.getByRole('button',{name:'继续编辑'}).click();
 await editor.getByRole('button',{name:'关闭对话框'}).click();await warning.getByRole('button',{name:'放弃修改'}).click();await editor.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.__saves.length),0);
 await open();await editor.getByLabel('任务名称',{exact:true}).fill('Saved task');await editor.getByRole('textbox',{name:'任务内容',exact:true}).fill('Save normally');await editor.getByRole('button',{name:'保存任务'}).click();await editor.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.__saves.length),1);
 console.log('PASS: task editor protects modified drafts across Escape/cancel/close and still saves normally');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
