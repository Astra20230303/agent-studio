const { chromium }=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__capabilities=[];window.__closes=new Set();
  window.desktop={listModels:async()=>({ok:true,models:['test']})};
  window.codex={connect:async()=>{if(window.__offline)await new Promise(()=>{});return {ok:true};},notify:async()=>({ok:true}),request:async(method,params)=>{
   if(method==='modelProvider/capabilities/read')return new Promise(resolve=>window.__capabilities.push({params,resolve}));
   if(method==='model/providerCapabilities/read')throw Error('Incorrect protocol method');
   return {ok:true,result:{data:[]}};
  },onNotification:()=>()=>{},onClosed:fn=>{window.__closes.add(fn);return ()=>window.__closes.delete(fn);},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
 });
 await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 await page.getByRole('button',{name:'设置',exact:true}).click();
 const panel=page.getByRole('region',{name:'Codex 模型渠道能力',exact:true});
 await page.waitForFunction(()=>window.__capabilities.length>0);
 await page.evaluate(()=>window.__capabilities.at(-1).resolve({ok:true,result:{namespaceTools:true,imageGeneration:false,webSearch:true}}));
 await panel.getByText('不支持',{exact:true}).waitFor();
 assert.deepEqual(await panel.locator('dd').allTextContents(),['支持','不支持','支持']);
 await panel.getByRole('button',{name:'刷新能力',exact:true}).click();
 await page.evaluate(()=>window.__capabilities.at(-1).resolve({ok:false,error:'capability lookup failed'}));
 await panel.getByText(/capability lookup failed/).waitFor();assert.equal(await panel.locator('dd').count(),0);
 await panel.getByRole('button',{name:'刷新能力',exact:true}).click();
 await page.evaluate(()=>{window.__offline=true;window.__closes.forEach(fn=>fn({}));});
 await page.waitForFunction(()=>document.querySelector('[aria-label="Codex 模型渠道能力"] button')?.disabled);
 await page.evaluate(()=>window.__capabilities.at(-1).resolve({ok:true,result:{namespaceTools:true,imageGeneration:true,webSearch:true}}));
 assert.equal(await panel.locator('dd').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS: correct capabilities RPC, response rendering, failed refresh and disconnect isolation');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
