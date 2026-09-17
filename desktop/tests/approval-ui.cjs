const { chromium } = require('playwright'); const assert = require('node:assert/strict');
(async () => { const browser = await chromium.launch({ channel: 'msedge', headless: true }); try {
  const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { window.__responses=[];window.__fail=true;window.desktop={listModels:async()=>({ok:true,models:['test']})};window.codex={connect:async()=>({ok:true}),request:async()=>({ok:true,result:{data:[]}}),notify:async()=>({}),respond:async(id,result)=>{if(window.__fail)return{ok:false,error:'Transport failed'};window.__responses.push({id,result});return{ok:true}},onNotification:()=>()=>{},onServerRequest:fn=>{window.__ask=fn;return()=>{}},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{}};});
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.waitForFunction(()=>window.__ask);
  await page.evaluate(()=>window.__ask({id:1,method:'item/commandExecution/requestApproval',params:{command:'git status',cwd:'D:/repo',availableDecisions:['acceptForSession','decline']}}));
  assert.equal(await page.getByRole('button',{name:'本次允许',exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'本会话允许');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'拒绝');
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'本会话允许');
  await page.setViewportSize({width:390,height:720});assert.equal(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await page.getByRole('button',{name:'本会话允许',exact:true}).click();await page.getByRole('alert').filter({hasText:'Transport failed'}).waitFor();
  await page.evaluate(()=>{window.__fail=false});await page.getByRole('button',{name:'本会话允许',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>window.__responses[0]),{id:1,result:{decision:'acceptForSession'}});
  await page.evaluate(()=>window.__ask({id:2,method:'item/permissions/requestApproval',params:{threadId:'a',permissions:{network:{enabled:true}}}}));
  await page.getByText(/enabled/).waitFor();await page.getByRole('button',{name:'拒绝',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.deepEqual(await page.evaluate(()=>window.__responses[1].result),{scope:'turn',permissions:{}});assert.deepEqual(errors,[]);console.log('PASS: server decisions, retry after failure, permission details and denial payload');
} finally {await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
