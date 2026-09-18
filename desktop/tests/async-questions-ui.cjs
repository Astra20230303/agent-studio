const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__answers = []; const listeners = new Set();
      window.__notify = event => listeners.forEach(fn => fn(event));
      window.codex = { connect: async () => ({ok:true}), notify: async () => ({}), request: async () => ({ok:true,result:{data:[]}}),
        respond: async (id, result) => { if(window.__fail) return {ok:false,error:'Retry'}; window.__answers.push({id,result}); return {ok:true}; },
        onNotification: fn => {listeners.add(fn);return ()=>listeners.delete(fn);}, onServerRequest: fn => {window.__ask=fn;return ()=>{};}, onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(()=>!!window.__ask);
    await page.evaluate(()=>window.__ask({id:1,method:'item/tool/requestUserInput',params:{threadId:'a',isBlocking:false,questions:[{id:'q',header:'Choice',question:'Async question'}]}}));
    await page.getByText('待回答问题 · a',{exact:true}).click();
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.getByRole('textbox',{name:'消息',exact:true}).fill('Continue draft');
    await page.getByRole('textbox',{name:'Async question',exact:true}).fill('Answer A');
    await page.evaluate(()=>window.__ask({id:2,method:'item/tool/requestUserInput',params:{threadId:'b',questions:[{id:'b',header:'Blocking',question:'Blocking question'}]}}));
    const blocking = page.getByRole('dialog'); await blocking.waitFor();
    await blocking.getByRole('button',{name:'取消',exact:true}).click();
    await page.evaluate(()=>window.__fail=true);
    await page.locator('.async-question').getByRole('button',{name:'提交',exact:true}).click();
    await page.getByText('Retry',{exact:true}).waitFor();
    assert.equal(await page.getByRole('textbox',{name:'Async question',exact:true}).inputValue(),'Answer A');
    await page.evaluate(()=>window.__fail=false);
    await page.locator('.async-question').getByRole('button',{name:'提交',exact:true}).click();
    await page.waitForFunction(()=>window.__answers.length===2);
    assert.deepEqual(await page.evaluate(()=>window.__answers),[{id:2,result:{answers:{b:{answers:[]}}}},{id:1,result:{answers:{q:{answers:['Answer A']}}}}]);
    assert.equal(await page.getByRole('textbox',{name:'消息',exact:true}).inputValue(),'Continue draft');
    await page.evaluate(()=>window.__ask({id:3,method:'item/tool/requestUserInput',params:{threadId:'a',isBlocking:false,questions:[{id:'q3',header:'Later',question:'Pending question'}]}}));
    await page.getByText('待回答问题 · a',{exact:true}).click();
    await page.getByRole('textbox',{name:'Pending question',exact:true}).fill('Not submitted');
    await page.evaluate(()=>window.__notify({method:'serverRequest/resolved',params:{requestId:3,threadId:'a'}}));
    await page.locator('.async-question').waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>window.__answers.length),2);
    console.log('PASS: nonblocking question permits editing, blocking request bypasses it, answers retry with correct IDs');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
