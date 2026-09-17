const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeThreadId:'local',threads:[{id:'local',remoteId:'remote',title:'Keep draft',messages:[],status:'completed',updatedAt:''}]}));
  const notifications=new Set();const closed=new Set();window.__emit=e=>notifications.forEach(fn=>fn(e));window.__connections=0;window.__stops=0;
  window.desktop={listModels:async()=>({ok:true,models:['test']})};
  window.codex={connect:async()=>{window.__connections++;return {ok:true};},stop:async()=>{window.__stops++;closed.forEach(fn=>fn({}));await new Promise(resolve=>{window.__releaseStop=resolve;});return {ok:true};},notify:async()=>({}),request:async method=>({ok:true,result:method==='thread/resume'?{thread:{id:'remote',turns:[]}}:{data:[]}}),onNotification:fn=>{notifications.add(fn);return()=>notifications.delete(fn);},onClosed:fn=>{closed.add(fn);return()=>closed.delete(fn);},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 });
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 await page.getByRole('textbox',{name:'消息',exact:true}).fill('draft survives restart');
 await page.getByRole('button',{name:'设置',exact:true}).click();
 const restart=page.getByRole('button',{name:'重启并重新连接服务',exact:true});
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='重启并重新连接服务'&&!b.disabled));
 await page.evaluate(()=>window.__emit({method:'turn/started',params:{threadId:'remote',turn:{id:'running'}}}));
 assert.equal(await restart.isDisabled(),true);
 await page.evaluate(()=>window.__emit({method:'turn/completed',params:{threadId:'remote',turn:{id:'running',status:'completed'}}}));
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='重启并重新连接服务'&&!b.disabled));
 const before=await page.evaluate(()=>window.__connections);
 await restart.click();await page.waitForFunction(()=>Boolean(window.__releaseStop));
 await page.waitForTimeout(650);
 assert.equal(await page.evaluate(()=>window.__connections),before);assert.equal(await page.evaluate(()=>window.__stops),1);
 await page.evaluate(()=>window.__releaseStop());
 await page.waitForFunction(before=>window.__connections>before,before);
 await page.getByRole('button',{name:/返回应用/}).click();
 assert.equal(await page.getByRole('textbox',{name:'消息',exact:true}).inputValue(),'draft survives restart');
 console.log('PASS: busy turn blocks restart, stop precedes reconnect, draft survives');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
