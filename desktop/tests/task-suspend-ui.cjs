const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
   const task = { id:'existing', name:'Existing task', prompt:'Original prompt', kind:'reminder', model:'', permission:'read-only', notify:false, status:'active', nextRunAt:null, runs:[], schedule:{kind:'daily',time:'09:00',timezone:'UTC'} };
   window.__saves = [];
   window.desktop = {
    listModels:async()=>({ok:true,models:['test']}),
    listTasks:async()=>({ok:true,tasks:[task]}),
    taskDetail:async()=>({ok:true,task}),
    saveTask:async input=>{window.__saves.push(input);return await new Promise(resolve=>{window.__finishSave=resolve;});}
   };
  });
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  await page.getByRole('button',{name:'已安排',exact:true}).click();
  await page.getByRole('button',{name:'查看任务 Existing task',exact:true}).click();
  let detail=page.getByRole('dialog',{name:'Existing task',exact:true});
  await detail.getByRole('button',{name:'编辑',exact:true}).click();
  const editor=page.getByRole('dialog',{name:'编辑任务',exact:true});
  await editor.getByRole('textbox',{name:'任务内容',exact:true}).fill('Preserved edit');
  await editor.getByRole('button',{name:'保留草稿并返回列表',exact:true}).click();
  await editor.waitFor({state:'detached'});await detail.waitFor({state:'detached'});
  await page.getByRole('button',{name:'查看任务 Existing task',exact:true}).click();
  await detail.waitFor();
  assert.equal(await detail.getByRole('button',{name:'编辑',exact:true}).isDisabled(),true);
  assert.equal(await detail.getByRole('button',{name:'复制任务',exact:true}).isDisabled(),true);
  await detail.getByRole('button',{name:'关闭对话框'}).click();
  await page.getByRole('button',{name:'继续编辑任务草稿',exact:true}).click();
  assert.equal(await editor.getByRole('textbox',{name:'任务内容',exact:true}).inputValue(),'Preserved edit');
  await editor.getByRole('button',{name:'保存任务',exact:true}).click();
  await page.waitForFunction(()=>!!window.__finishSave);
  assert.equal(await editor.getByRole('button',{name:'保留草稿并返回列表',exact:true}).isDisabled(),true);
  await page.keyboard.press('Escape');assert.equal(await editor.isVisible(),true);
  await page.evaluate(()=>window.__finishSave({ok:false,error:'Temporary save failure'}));
  await editor.getByRole('alert').filter({hasText:'Temporary save failure'}).waitFor();
  await editor.getByRole('button',{name:'保留草稿并返回列表',exact:true}).click();
  await editor.waitFor({state:'detached'});
  await page.getByRole('button',{name:'继续编辑任务草稿',exact:true}).click();
  assert.equal(await editor.getByRole('textbox',{name:'任务内容',exact:true}).inputValue(),'Preserved edit');
  await editor.getByRole('button',{name:'保存任务',exact:true}).click();
  await page.waitForFunction(()=>window.__saves.length===2);
  await page.evaluate(()=>window.__finishSave({ok:true}));
  await editor.waitFor({state:'detached'});
  assert.equal(await page.getByRole('button',{name:'创建',exact:true}).isEnabled(),true);
  assert.equal(await page.getByRole('button',{name:'继续编辑任务草稿',exact:true}).count(),0);
  await page.getByRole('button',{name:'查看任务 Existing task',exact:true}).click();
  assert.equal(await detail.getByRole('button',{name:'编辑',exact:true}).isEnabled(),true);
  assert.equal(await detail.getByRole('button',{name:'复制任务',exact:true}).isEnabled(),true);
  assert.deepEqual(await page.evaluate(()=>window.__saves.map(value=>[value.id,value.prompt])),[['existing','Preserved edit'],['existing','Preserved edit']]);
  console.log('PASS: suspended existing edits resist overwrite, save lock prevents suspension, failure resumes and successful retry clears draft');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
