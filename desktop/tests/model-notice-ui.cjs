const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeThreadId:'a',threads:[{id:'a',remoteId:'a',title:'Notice test',messages:[],status:'completed',updatedAt:new Date().toISOString()}]}));
  window.__listeners=new Set();window.__emit=(method,params)=>window.__listeners.forEach(fn=>fn({method,params}));window.desktop={listModels:async()=>({ok:true,models:['test']}),providerStatus:async()=>({keyConfigured:true})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({ok:true}),request:async(method)=>method==='thread/resume'?{ok:true,result:{thread:{id:'a',turns:[{id:'t',status:'inProgress',items:[]}]}}}:{ok:true,result:{data:[]}},onNotification:fn=>{window.__listeners.add(fn);return()=>window.__listeners.delete(fn);},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 });
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'停止生成',exact:true}).waitFor();
 const emit=(threadId,turnId,show)=>page.evaluate(({threadId,turnId,show})=>window.__emit('model/safetyBuffering/updated',{threadId,turnId,model:'test',useCases:[],reasons:['review'],showBufferingUi:show}),{threadId,turnId,show});
 await emit('background','t',true);assert.equal(await page.getByText('模型安全缓冲中：review',{exact:true}).count(),0);
 await emit('a','old',true);assert.equal(await page.getByText('模型安全缓冲中：review',{exact:true}).count(),0);
 await emit('a','t',true);await page.getByText('模型安全缓冲中：review',{exact:true}).waitFor();
 await emit('a','t',false);await page.getByText('模型安全缓冲中：review',{exact:true}).waitFor({state:'hidden'});
 console.log('PASS: model notification routing and buffering completion reach the real UI');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
