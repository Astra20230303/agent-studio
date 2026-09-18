const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
   localStorage.setItem('felix-audit-log-v1','{broken');
   window.desktop = {listModels:async()=>({ok:true,models:['test']})};
   window.codex = {connect:async()=>({ok:true}),notify:async()=>({}),request:async()=>({ok:true,result:{data:[]}}),onNotification:()=>()=>{},onServerRequest:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{}};
  });
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  const settings = async () => { await page.getByRole('button',{name:'设置',exact:true}).click(); await page.getByRole('button',{name:'操作记录',exact:true}).click(); };
  await settings();
  const retry = page.getByRole('button',{name:'重试读取操作记录',exact:true});
  await retry.click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('felix-audit-log-v1')),'{broken');
  await page.getByRole('button',{name:'返回应用',exact:true}).click();
  await page.locator('.sidebar-nav').filter({hasText:'新对话'}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('felix-audit-log-v1')),'{broken');
  await settings();
  await page.evaluate(()=>localStorage.setItem('felix-audit-log-v1',JSON.stringify([{id:'old',at:'2026-09-18T10:00:00Z',action:'切换项目',detail:'D:/private-project'}])));
  await retry.click(); await retry.waitFor({state:'detached'});
  await page.getByRole('region',{name:'操作记录',exact:true}).getByText('切换项目',{exact:true}).waitFor();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('felix-audit-log-v1'))[0].detail === undefined);
  await page.getByRole('button',{name:'返回应用',exact:true}).click();
  await page.locator('.sidebar-nav').filter({hasText:'新对话'}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('felix-audit-log-v1')).length === 2);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-audit-log-v1')).map(e=>e.action)),['新建会话','切换项目']);
  console.log('PASS: unread audit data is protected; retry restores/redacts history and recording resumes');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

