const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId:'t', model:'test', threads:[{id:'t',remoteId:'remote',title:'History',messages:[],status:'completed',updatedAt:''}] }));
      window.__calls=[]; window.desktop={listModels:async()=>({ok:true,models:['test']})};
      window.codex={connect:async()=>({ok:true}),notify:async()=>({ok:true}),request:async(method,params)=>{window.__calls.push({method,params}); if(method==='thread/resume') return {ok:true,result:{thread:{id:'remote',turns:[]}}}; if(method==='thread/items/list') return {ok:true,result:{data:[null,42,{item:null},{type:'agentMessage'},{id:'invalid-content',type:'userMessage',content:{}},{id:'mixed',type:'userMessage',content:[null,{type:'text',text:'Recovered text'}]},{id:'m',type:'agentMessage',text:'Final answer'},{id:'c',type:'commandExecution',status:'inProgress',command:'pwd'},{id:'m',type:'agentMessage',text:'Final answer'},{id:'c',type:'commandExecution',status:'completed',command:'pwd',aggregatedOutput:'D:/repo',exitCode:0}]}}; return {ok:true,result:{data:[]}};},onNotification:fn=>()=>{},onServerRequest:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{}};
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => window.__calls.some(call=>call.method==='thread/resume'));
    await page.getByRole('button',{name:'会话内查找'}).click();
    await page.getByRole('button',{name:'加载完整历史'}).click();
    await page.getByText('Final answer',{exact:true}).waitFor();
    assert.equal(await page.getByText('Final answer',{exact:true}).count(),1);
    assert.equal(await page.getByText('已运行 pwd',{exact:false}).count(),1);
    assert.equal(await page.locator('.tool-output').filter({hasText:'D:/repo'}).count(),1);
    await page.getByText('Recovered text',{exact:true}).waitFor();
    console.log('PASS: overlapping server history renders one assistant message and one completed tool');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
