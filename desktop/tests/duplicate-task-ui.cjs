const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
   window.__saved=[];
   window.__original={id:'original',name:'Original',prompt:'Review workspace',kind:'agent',providerId:'p',model:'test-model',cwd:'D:/workspace',reasoningEffort:'high',timeoutMinutes:25,permission:'workspace-write',notify:true,notificationPolicy:'failed_runs_only',schedule:{kind:'interval',minutes:30},status:'paused',nextRunAt:null,runs:[{id:'run',status:'completed',trigger:'manual',startedAt:'2026-09-18T00:00:00Z',output:'original output'}]};
   window.desktop={listProviders:async()=>[{id:'p',name:'Provider',enabled:true}],listModels:async()=>({ok:true,models:['test-model']}),listTasks:async()=>({ok:true,tasks:[window.__original]}),taskDetail:async()=>({ok:true,task:window.__original}),saveTask:async input=>{window.__saved.push(input);return {ok:true};}};
  });
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
  await page.getByRole('button',{name:'已安排',exact:true}).click();
  const openCopy=async()=>{
   await page.getByRole('button',{name:'查看任务 Original',exact:true}).click();
   await page.getByRole('button',{name:'复制任务',exact:true}).click();
   await page.getByRole('dialog',{name:'创建任务'}).waitFor();
  };
  await openCopy();
  let dialog=page.getByRole('dialog',{name:'创建任务'});
  assert.equal(await dialog.getByLabel('任务名称',{exact:true}).inputValue(),'Original（副本）');
  await dialog.getByRole('button',{name:'取消',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__saved.length),0);
  await openCopy();
  dialog=page.getByRole('dialog',{name:'创建任务'});
  await dialog.getByRole('option',{name:'test-model',exact:true}).waitFor({state:'attached'});
  assert.equal(await dialog.getByLabel('任务 Provider').inputValue(),'p');
  assert.equal(await dialog.getByLabel('任务推理强度').inputValue(),'high');
  assert.equal(await dialog.getByLabel('任务执行时限').inputValue(),'25');
  assert.equal(await dialog.getByLabel('任务间隔分钟数').inputValue(),'30');
  const confirm=dialog.getByRole('checkbox',{name:'允许此任务无人值守修改上述任务工作目录'});
  assert.equal(await confirm.isChecked(),false);
  await dialog.getByRole('button',{name:'保存任务'}).click();
  await dialog.getByRole('alert').getByText('请确认允许无人值守修改工作区。').waitFor();
  assert.equal(await page.evaluate(()=>window.__saved.length),0);
  await confirm.check();
  await dialog.getByLabel('任务名称',{exact:true}).fill('Independent copy');
  await dialog.getByRole('button',{name:'保存任务'}).click();
  await dialog.waitFor({state:'detached'});
  const {saved,original}=await page.evaluate(()=>({saved:window.__saved,original:window.__original}));
  assert.equal(saved.length,1); assert.equal(saved[0].id,undefined);assert.equal(saved[0].runs,undefined);assert.equal(saved[0].status,undefined);
  assert.equal(saved[0].timeoutMinutes,25);
  assert.equal(saved[0].notificationPolicy,'failed_runs_only');assert.equal(saved[0].cwd,'D:/workspace');
  assert.equal(original.name,'Original');assert.equal(original.runs[0].output,'original output');
  const audit=await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-audit-log-v1')));
  assert.equal(audit.filter(e=>e.action==='创建任务').length,1);
  console.log('PASS: duplicate task opens editable independent draft, cancel has no effect and write permission requires confirmation');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
