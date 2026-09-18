const{chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeThreadId:'a',threads:[{id:'a',title:'新对话',messages:[],status:'idle',updatedAt:''}]}));window.__calls=[];
  window.desktop={listModels:async()=>({ok:true,models:['test']}),providerStatus:async()=>({keyConfigured:true})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{
   window.__calls.push({method,params});
   if(method==='thread/start'){if(window.__hold)await new Promise(resolve=>window.__release=resolve);return{ok:true,result:window.__created}};
   if(method==='turn/start')return{ok:true,result:{turn:{id:'turn',status:'inProgress'}}};
   if(method==='thread/resume')return{ok:true,result:{thread:{id:params.threadId,turns:[]}}};
   return{ok:true,result:{data:[]}};
  },onNotification:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 });
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'选择模型',exact:true}).getByText('test',{exact:true}).waitFor();
 const input=page.getByRole('textbox',{name:'消息',exact:true});const send=page.getByRole('button',{name:'发送',exact:true});await input.fill('Retain this draft');
 let attempts=0;
 for(const response of [{thread:{id:123}},{thread:{id:' '}},{thread:{id:'remote'},providerId:{}},{}]){
  await page.evaluate(response=>window.__created=response,response);await send.click();attempts++;
  await page.waitForFunction(count=>window.__calls.filter(c=>c.method==='thread/start').length===count,attempts);
  await page.getByText(/服务端会话创建数据无效/).waitFor();await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.getAttribute('aria-label')==='发送'&&!b.disabled));
  assert.equal(await input.inputValue(),'Retain this draft');
  const thread=await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0]);assert.equal(thread.remoteId,undefined);assert.equal(thread.messages.length,0);
  assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.method==='turn/start').length),0);
 }
 await page.evaluate(()=>{window.__created={thread:{id:'remote-good'},providerId:'confirmed'};window.__hold=true});
 await send.evaluate(button=>{button.click();button.click()});await page.waitForFunction(()=>!!window.__release);
 assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.method==='thread/start').length),attempts+1);assert.ok(await send.isDisabled());assert.equal(await input.inputValue(),'Retain this draft');
 await page.evaluate(()=>window.__release());await page.waitForFunction(()=>window.__calls.some(c=>c.method==='turn/start'));
 const sent=await page.evaluate(()=>window.__calls.find(c=>c.method==='turn/start').params);assert.equal(sent.threadId,'remote-good');assert.equal(sent.input[0].text,'Retain this draft');
 await page.waitForFunction(()=>document.querySelector('textarea[aria-label="消息"]').value==='');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0].providerId),'confirmed');
 console.log('PASS: malformed creation cannot bind/send, retains draft, deduplicates pending request and retries successfully');
}finally{await browser.close()}})().catch(error=>{console.error(error);process.exitCode=1});
