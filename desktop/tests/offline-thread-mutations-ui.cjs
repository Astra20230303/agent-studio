const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('codex-desktop-state-v1', JSON.stringify({activeThreadId:'remote',threads:['remote','local'].map(id=>({id,remoteId:id==='remote'?'server-id':undefined,title:id,status:'completed',messages:[{id:'m',role:'assistant',content:'Retain me',createdAt:''}],updatedAt:''}))})));
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
  const toolbar=page.locator('.global-thread-toolbar');
  await toolbar.getByRole('button',{name:'归档',exact:true}).click();
  await page.getByText('请重新连接服务后再归档或删除远端会话。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'remote',exact:true}).getByRole('button',{name:'归档',exact:true}).click();
  await toolbar.getByRole('button',{name:'删除',exact:true}).click();
  await page.getByRole('alertdialog').getByRole('button',{name:'删除',exact:true}).click();
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
  const state=await read();
  assert.equal(state.threads.length,2); assert.ok(!state.threads.find(t=>t.id==='remote').archived);
  assert.equal(state.threads.find(t=>t.id==='remote').messages[0].content,'Retain me');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-audit-log-v1')||'[]').length),0);
  await page.getByRole('alertdialog').getByText('请重新连接服务后再归档或删除远端会话。',{exact:true}).waitFor();
  await page.getByRole('alertdialog').getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('button',{name:'local',exact:true}).click();
  await toolbar.getByRole('button',{name:'归档',exact:true}).click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t=>t.id==='local').archived);
  console.log('PASS: offline remote archive/delete preserve history and audit; local archive remains available');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
