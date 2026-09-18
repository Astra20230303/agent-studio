const assert = require('node:assert/strict');
const {chromium} = require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__responses=[];window.__finish={};
   window.desktop={listModels:async()=>({ok:true,models:['test']})};
   window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async()=>({ok:true,result:{data:[]}}),respond:async(id,result)=>{window.__responses.push({id,result});return new Promise(resolve=>window.__finish[id]=resolve);},onNotification:fn=>{window.__notify=fn;return()=>{};},onServerRequest:fn=>{window.__ask=fn;return()=>{};},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{}};
  });
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
  await page.waitForFunction(()=>window.__ask);
  await page.evaluate(()=>{
   for(const id of [1,2])window.__ask({id,method:'item/commandExecution/requestApproval',params:{command:`command ${id}`,availableDecisions:['decline','accept']}});
  });
  await page.getByText('command 1',{exact:true}).waitFor();
  await page.getByRole('button',{name:'本次允许',exact:true}).evaluate(el=>{el.click();el.click();});
  await page.waitForFunction(()=>window.__responses.length===1);
  await page.evaluate(()=>window.__notify({method:'serverRequest/resolved',params:{requestId:1}}));
  await page.getByText('command 2',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'本次允许',exact:true}).isDisabled(),false);
  assert.equal(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)),true);
  await page.evaluate(()=>window.__finish[1]({ok:false,error:'Old request failure'}));
  assert.equal(await page.getByText('Old request failure',{exact:true}).count(),0);
  await page.getByRole('button',{name:'拒绝',exact:true}).click();
  await page.waitForFunction(()=>window.__responses.length===2);
  await page.evaluate(()=>window.__finish[2]({ok:true}));
  await page.getByRole('dialog').waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(()=>window.__responses),[{id:1,result:{decision:'accept'}},{id:2,result:{decision:'decline'}}]);
  await page.evaluate(()=>{
   for(const id of [3,3,4])window.__ask({id,method:'item/commandExecution/requestApproval',params:{command:`command ${id}`,availableDecisions:['decline','accept']}});
  });
  await page.getByText('command 3',{exact:true}).waitFor();
  await page.getByRole('button',{name:'拒绝',exact:true}).click();
  await page.evaluate(()=>window.__notify({method:'serverRequest/resolved',params:{requestId:3}}));
  await page.getByText('command 4',{exact:true}).waitFor();
  await page.evaluate(()=>window.__finish[3]({ok:true}));
  assert.equal(await page.getByText('command 4',{exact:true}).count(),1);
  await page.getByRole('button',{name:'拒绝',exact:true}).click();
  await page.evaluate(()=>window.__finish[4]({ok:true}));
  await page.getByRole('dialog').waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(()=>window.__responses.map(item=>item.id)),[1,2,3,4]);
  assert.deepEqual(errors,[]);
  console.log('PASS: resolved approval advances queue, restores focus, isolates stale errors and prevents duplicate responses');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
