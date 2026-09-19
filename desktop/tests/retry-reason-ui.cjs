const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeThreadId:'a',threads:[{id:'a',remoteId:'a',title:'Notice test',messages:[],status:'completed',updatedAt:new Date().toISOString()}]}));
  window.__listeners=new Set();window.__emit=(method,params)=>window.__listeners.forEach(fn=>fn({method,params}));window.desktop={listModels:async()=>({ok:true,models:['test']}),providerStatus:async()=>({keyConfigured:true})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({ok:true}),request:async(method)=>method==='thread/resume'?{ok:true,result:{thread:{id:'a',turns:[{id:'t',status:'inProgress',items:[]}]}}}:{ok:true,result:{data:[]}},onNotification:fn=>{window.__listeners.add(fn);return()=>window.__listeners.delete(fn);},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 });
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'停止生成',exact:true}).waitFor();
 await page.evaluate(()=>window.__emit('error',{threadId:'a',turnId:'t',willRetry:true,error:{message:'Rate limit\nretry in 5 seconds <script>literal</script>'}}));
 const activity=page.locator('.activity');await activity.getByText('正在重试：Rate limit retry in 5 seconds <script>literal</script>',{exact:true}).waitFor();
 assert.equal(await activity.locator('script').count(),0);
 await page.evaluate(()=>window.__emit('error',{threadId:'a',turnId:'old',willRetry:true,error:{message:'stale'}}));
 assert.ok((await activity.textContent()).includes('Rate limit'));
 await page.evaluate(()=>window.__emit('item/agentMessage/delta',{threadId:'a',turnId:'t',itemId:'answer',delta:'Recovered answer'}));
 await page.getByText('Recovered answer',{exact:true}).waitFor();assert.equal(await page.getByText(/^正在重试：/).count(),0);
 await page.evaluate(()=>window.__emit('error',{threadId:'a',turnId:'t',willRetry:true,error:{message:'Second retry'}}));
 await page.getByText('正在重试：Second retry',{exact:true}).waitFor();
 await page.evaluate(()=>window.__emit('turn/completed',{threadId:'a',turn:{id:'t',status:'completed'}}));
 await page.getByText('正在重试：Second retry',{exact:true}).waitFor({state:'hidden'});
 console.log('PASS: retry reasons render safely, ignore stale turns and clear on recovery/completion');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
