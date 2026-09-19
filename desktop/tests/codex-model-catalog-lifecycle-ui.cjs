const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__reads=[]; window.__closes=new Set();
   window.desktop={listModels:async()=>({ok:true,models:['test']})};
   window.codex={connect:async()=>{if(window.__offline)await new Promise(()=>{});return {ok:true};},notify:async()=>({ok:true}),request:async(method,params)=>{
    if(method==='model/list')return new Promise(resolve=>window.__reads.push({params,resolve}));
    return {ok:true,result:{data:[]}};
   },onNotification:()=>()=>{},onClosed:fn=>{window.__closes.add(fn);return ()=>window.__closes.delete(fn);},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
   window.__complete=(index,empty)=>window.__reads[index].resolve({ok:true,result:{data:empty?[]:[{id:'m',model:'m',displayName:'Late Model',description:'',hidden:true,supportedReasoningEfforts:[]}]}});
  });
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
  await page.getByRole('button',{name:'设置',exact:true}).click();
  const panel=page.getByRole('region',{name:'Codex 模型目录',exact:true});
  await panel.getByRole('button',{name:'刷新模型目录',exact:true}).click();
  await page.waitForFunction(()=>window.__reads.length===1);
  await panel.getByRole('checkbox',{name:'包含隐藏模型',exact:true}).check();
  await panel.getByRole('button',{name:'刷新模型目录',exact:true}).click();
  await page.waitForFunction(()=>window.__reads.length===2);
  assert.equal(await page.evaluate(()=>window.__reads[1].params.includeHidden),true);
  await page.evaluate(()=>window.__complete(1,true));
  await panel.getByText('没有可用模型',{exact:true}).waitFor();
  await page.evaluate(()=>window.__complete(0,false));
  assert.equal(await panel.getByText('Late Model',{exact:true}).count(),0);
  await panel.getByRole('button',{name:'刷新模型目录',exact:true}).click();
  await page.waitForFunction(()=>window.__reads.length===3);
  await page.evaluate(()=>{window.__offline=true;window.__closes.forEach(fn=>fn({}));});
  await page.waitForFunction(()=>document.querySelector('[aria-label="Codex 模型目录"] button')?.disabled);
  await page.evaluate(()=>window.__complete(2,false));
  assert.equal(await panel.getByText('Late Model',{exact:true}).count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: catalog filter invalidates stale responses, empty state and disconnect');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
