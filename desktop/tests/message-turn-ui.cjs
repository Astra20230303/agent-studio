const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  window.__mode='cycle';window.__calls=[];
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeThreadId:'a',threads:[{id:'a',remoteId:'remote-a',title:'Source',status:'completed',messages:[{id:'live-answer',role:'assistant',content:'Original reply',createdAt:new Date().toISOString()}],updatedAt:new Date().toISOString()}]}));
  window.desktop={listModels:async()=>({ok:true,models:['test']}),providerStatus:async()=>({keyConfigured:true})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{
   window.__calls.push({method,params});
   if(method==='thread/resume')return {ok:true,result:{thread:{id:params.threadId,turns:[]}}};
   if(method==='thread/turns/list'){
    if(window.__mode==='cycle')return {ok:true,result:{data:[],nextCursor:params.cursor==='A'?'B':'A'}};
    if(window.__mode==='invalid')return {ok:true,result:{data:[{id:'bad',items:null}]}};
    return {ok:true,result:params.cursor?{data:[{id:'target-turn',items:[{id:'answer',type:'agentMessage',text:'Original reply'}]}]}:{data:[],nextCursor:'next'}};
   }
   if(method==='thread/fork')return {ok:true,result:{thread:{id:'branched'}}};
   return {ok:true,result:{data:[]}};
  },onNotification:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 const fork=page.getByRole('button',{name:'分支到新聊天',exact:true});await fork.click();
 await page.getByText('创建分支失败：服务端回合分页重复，请重试创建分支。',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.method==='thread/turns/list').length),3);
 assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.method==='thread/fork').length),0);
 await page.evaluate(()=>{window.__mode='invalid';});await fork.click();
 await page.getByText('创建分支失败：服务端回合列表无效，请重试创建分支。',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.method==='thread/fork').length),0);
 await page.evaluate(()=>{window.__mode='success';});await fork.click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).activeThreadId==='remote-branched');
 const calls=await page.evaluate(()=>window.__calls.filter(c=>c.method==='thread/fork'));
 assert.equal(calls.length,1);assert.equal(calls[0].params.threadId,'remote-a');assert.equal(calls[0].params.lastTurnId,'target-turn');assert.equal(calls[0].params.deferGoalContinuation,true);
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
 assert.equal(state.threads.find(t=>t.id==='a').messages[0].content,'Original reply');assert.equal(state.threads.find(t=>t.id==='remote-branched').messages[0].content,'Original reply');
 console.log('PASS: legacy reply branch lookup rejects cyclic/malformed pages, releases lock for retry and forks the located turn without changing source');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
