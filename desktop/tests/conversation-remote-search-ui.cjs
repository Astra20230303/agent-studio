const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
   localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id:'a',remoteId:'remote-a',title:'Search',status:'completed',messages:[],updatedAt:'' }] }));
   window.desktop = { listModels: async () => ({ok:true,models:['test']}) };
   window.__calls=[]; window.__failHistory=false;
   window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{
    window.__calls.push({method,params});
    if(method==='thread/searchOccurrences'){
     if(params.searchTerm==='slow') await new Promise(resolve=>window.__release=resolve);
     if(params.searchTerm==='empty') return {ok:true,result:{data:[],nextCursor:null}};
     if(params.searchTerm==='error') return {ok:false,error:'Search unavailable'};
     const itemId=params.cursor?'reply':'user';
     return {ok:true,result:{data:[{turnId:'t',itemId,snippet:'needle '+itemId,snippetMatchRange:{start:0,end:6},turnCursor:'turn-cursor'}],nextCursor:params.cursor?null:'next'}};
    }
    if(method==='thread/items/list'){
     if(window.__failHistory) return {ok:false,error:'History offline'};
     return {ok:true,result:{data:[{turnId:'t',item:{type:'userMessage',id:'user',content:[{type:'text',text:'needle user'}]}},{turnId:'t',item:{type:'agentMessage',id:'reply',text:'needle reply'}}],nextCursor:null}};
    }
    return {ok:true,result:method==='thread/resume'?{thread:{id:params.threadId,turns:[]}}:{data:[]}};
   },onNotification:()=>()=>{},onServerRequest:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{}};
  });
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
  await page.getByRole('button',{name:'会话内查找',exact:true}).click();
  const query=page.getByRole('searchbox',{name:'查找会话内容'});
  const search=page.getByRole('button',{name:'搜索完整历史',exact:true});
  await query.fill('needle'); await search.click();
  const results=page.getByRole('list',{name:'完整历史匹配'});
  await results.getByRole('button',{name:'needle reply',exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.__calls.filter(c=>c.method==='thread/searchOccurrences').map(c=>c.params.cursor)),[undefined,'next']);
  assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.method==='thread/items/list').length),0);
  await page.evaluate(()=>window.__failHistory=true);
  await results.getByRole('button',{name:'needle reply',exact:true}).click();
  await page.getByRole('status').filter({hasText:'History offline'}).waitFor();
  await page.evaluate(()=>window.__failHistory=false);
  await results.getByRole('button',{name:'needle reply',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.conversation-find-match')?.dataset.messageId==='live-reply');
  await results.getByRole('button',{name:'needle user',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.conversation-find-match')?.dataset.messageId==='user');
  await query.fill('slow'); await search.click(); await page.waitForFunction(()=>!!window.__release);
  await query.fill('empty'); await search.click();
  await page.getByText('完整历史没有匹配消息',{exact:true}).waitFor();
  await page.evaluate(()=>window.__release());
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal(await results.count(),0);
  await query.fill('error'); await search.click();
  await page.getByRole('alert').filter({hasText:'Search unavailable'}).waitFor();
  await query.fill('needle'); await search.click();
  await results.getByRole('button',{name:'needle reply',exact:true}).waitFor();
  console.log('PASS: remote search pagination, lazy history, both message identities, failed hydration retry and stale search cancellation');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
