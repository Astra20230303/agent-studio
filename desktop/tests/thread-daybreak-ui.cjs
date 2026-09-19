const { chromium }=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({model:'test',activeThreadId:'a',threads:['a','b'].map(id=>({id,remoteId:id,title:'Preference '+id,messages:[],status:'completed',daybreakEnabled:true,updatedAt:new Date().toISOString()}))}));
  window.__saves=[];window.desktop={listModels:async()=>({ok:true,models:['test']})};
  window.codex={connect:async()=>({ok:true}),notify:async()=>({ok:true}),request:async(method,params)=>{
   if(method==='thread/resume')return {ok:true,result:{thread:{id:params.threadId,turns:[],daybreakEnabled:null}}};
   if(method==='thread/metadata/update')return new Promise(resolve=>window.__saves.push({params,resolve}));
   return {ok:true,result:{data:[]}};
  },onNotification:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 });
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 const picker=page.getByRole('combobox',{name:'Daybreak 偏好',exact:true});
 await page.waitForFunction(()=>{const el=document.querySelector('[aria-label="Daybreak 偏好"]');return el&&!el.disabled&&el.value==='';});
 await picker.selectOption('enabled');
 await page.waitForFunction(()=>window.__saves.length===1);
 assert.ok(await picker.isDisabled());assert.equal(await picker.inputValue(),'');
 await page.evaluate(()=>window.__saves[0].resolve({ok:true,result:{thread:{id:'wrong',daybreakEnabled:true}}}));
 await page.getByText(/服务端未确认此会话/).waitFor();assert.equal(await picker.inputValue(),'');
 await picker.selectOption('enabled');await page.waitForFunction(()=>window.__saves.length===2);
 await page.evaluate(()=>window.__saves[1].resolve({ok:true,result:{thread:{id:'a',daybreakEnabled:false}}}));
 await page.waitForFunction(()=>document.querySelector('[aria-label="Daybreak 偏好"]').value==='disabled');
 await picker.selectOption('enabled');await page.waitForFunction(()=>window.__saves.length===3);
 await page.getByRole('button',{name:'Preference b',exact:true}).click();
 await page.waitForFunction(()=>{const el=document.querySelector('[aria-label="Daybreak 偏好"]');return !el.disabled&&el.value==='';});
 await page.evaluate(()=>window.__saves[2].resolve({ok:true,result:{thread:{id:'a',daybreakEnabled:true}}}));
 assert.equal(await picker.inputValue(),'');assert.deepEqual(errors,[]);
 console.log('PASS: Daybreak uses confirmed values, locks writes and isolates thread switches');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
