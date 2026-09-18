const{chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeThreadId:'a',threads:[{id:'a',remoteId:'remote',title:'Ack test',messages:[],status:'completed',updatedAt:''}]}));
  window.__starts=[];window.__steers=[];window.__ack={};window.__steerAck={turnId:'wrong'};
  window.desktop={listModels:async()=>({ok:true,models:['test']}),providerStatus:async()=>({keyConfigured:true})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{
   if(method==='thread/resume')return{ok:true,result:{thread:{id:params.threadId,turns:[]}}};
   if(method==='turn/start'){window.__starts.push(params);return{ok:true,result:window.__ack}};
   if(method==='turn/steer'){window.__steers.push(params);return{ok:true,result:window.__steerAck}};
   return{ok:true,result:{data:[]}};
  },onNotification:fn=>{window.__notify=fn;return()=>{}},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 });
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'选择模型',exact:true}).getByText('test',{exact:true}).waitFor();
 const input=page.getByRole('textbox',{name:'消息',exact:true});await input.fill('Keep original input');
 let count=0;
 for(const ack of [{},{turn:{id:7}},{turn:{id:'x',status:'bad'}}]){
  await page.evaluate(ack=>window.__ack=ack,ack);await page.getByRole('button',{name:'发送',exact:true}).click();count++;
  await page.waitForFunction(count=>window.__starts.length===count,count);await page.getByText(/发送未确认：服务端回合数据无效/).waitFor();
  await page.waitForFunction(()=>!document.querySelector('button[aria-label="发送"]').disabled);
  assert.equal(await input.inputValue(),'Keep original input');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0].messages.length),0);
 }
 await page.evaluate(()=>window.__ack={turn:{id:'live',status:'inProgress'}});await page.getByRole('button',{name:'发送',exact:true}).click();
 await page.getByRole('button',{name:'追加指令',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('textarea[aria-label="消息"]').value==='');
 await input.fill('Keep steering input');await page.getByRole('button',{name:'追加指令',exact:true}).click();
 await page.getByText(/追加未确认：服务端回合编号不一致/).waitFor();assert.equal(await input.inputValue(),'Keep steering input');
 await page.evaluate(()=>window.__steerAck={turnId:'live'});await page.getByRole('button',{name:'追加指令',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('textarea[aria-label="消息"]').value==='');
 for(const text of ['queued first','queued second']){await input.fill(text);await page.getByRole('button',{name:'本轮完成后发送',exact:true}).click()}
 await page.evaluate(()=>{window.__ack={};window.__notify({method:'turn/completed',params:{threadId:'remote',turn:{id:'live',status:'completed'}}})});
 await page.waitForFunction(()=>{const q=JSON.parse(localStorage.getItem('felix-turn-queue-v1'));return q?.length===2&&q.every(item=>item.status==='paused'&&item.error?.includes('回合数据无效'))});
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-turn-queue-v1')).map(x=>x.text)),['queued first','queued second']);
 assert.equal(await page.evaluate(()=>window.__starts.length),5);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0].error.split('发送未确认').length),2);
 console.log('PASS: malformed direct and steering acknowledgements preserve drafts; queued failure retains and pauses all entries');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
