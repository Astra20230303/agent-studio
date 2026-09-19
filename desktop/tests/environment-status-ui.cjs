const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__calls=[]; window.__closes=new Set();
   window.desktop={listModels:async()=>({ok:true,models:['test']})};
   window.codex={connect:async()=>{if(window.__offline)await new Promise(()=>{});return {ok:true};},notify:async()=>({ok:true}),request:async(method,params)=>{
    window.__calls.push({method,params});
    if(method==='environment/status'){
     if(params.environmentId==='slow') await new Promise(resolve=>{window.__release=resolve;});
     return {ok:true,result:params.environmentId==='broken'?{status:'disconnected',error:'connection refused\nretry later'}:{status:'ready'}};
    }
    if(method==='environment/info')return {ok:false,error:'shell info unavailable'};
    return {ok:true,result:{data:[]}};
   },onNotification:()=>()=>{},onClosed:fn=>{window.__closes.add(fn);return ()=>window.__closes.delete(fn);},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
  });
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
  await page.getByRole('button',{name:'设置',exact:true}).click();
  const panel=page.getByRole('region',{name:'Codex 执行环境',exact:true});
  const input=panel.getByRole('textbox',{name:'环境 ID',exact:true});
  await input.fill('broken'); await panel.getByRole('button',{name:'读取环境',exact:true}).click();
  await panel.getByText(/连接状态：已断开/).waitFor();
  assert.ok((await panel.textContent()).includes('connection refused'));
  assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.method==='environment/info').length),0);
  await input.fill('local'); await panel.getByRole('button',{name:'读取环境',exact:true}).click();
  await panel.getByText(/shell info unavailable/).waitFor();
  await panel.getByText('连接状态：就绪',{exact:true}).waitFor();
  await input.fill('slow'); await panel.getByRole('button',{name:'读取环境',exact:true}).click();
  await page.waitForFunction(()=>!!window.__release);
  await input.fill('broken'); await panel.getByRole('button',{name:'读取环境',exact:true}).click();
  await panel.getByText(/连接状态：已断开/).waitFor();
  await page.evaluate(()=>window.__release());
  assert.equal(await panel.getByText('连接状态：就绪',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.method==='environment/info').length),1);
  await page.evaluate(()=>{window.__release=undefined;});
  await input.fill('slow'); await panel.getByRole('button',{name:'读取环境',exact:true}).click();
  await page.waitForFunction(()=>!!window.__release);
  await page.evaluate(()=>{window.__offline=true;window.__closes.forEach(fn=>fn({}));});
  await page.waitForFunction(()=>document.querySelector('[aria-label="Codex 执行环境"] button')?.disabled);
  await page.evaluate(()=>window.__release());
  assert.equal(await panel.getByText('连接状态：就绪',{exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: disconnected status survives, info failure preserves status, stale requests are ignored');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
