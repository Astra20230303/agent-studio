const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();
  await page.addInitScript(()=>{
   localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeThreadId:'a',threads:['a','b'].map(id=>({id,remoteId:id,title:id,status:'completed',messages:[],updatedAt:''}))}));
   window.__calls=[];window.__finish={};
   window.desktop={listModels:async()=>({ok:true,models:['test']})};
   window.codex={connect:async()=>({ok:true}),notify:async()=>({}),request:async(method,params)=>{
    if(method==='thread/compact/start'){window.__calls.push(params.threadId);return new Promise(resolve=>{window.__finish[params.threadId]=resolve;});}
    return {ok:true,result:method==='thread/resume'?{thread:{turns:[]}}:{data:[]}};
   },onNotification:()=>()=>{},onServerRequest:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{}};
  });
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
  const compact=page.getByRole('button',{name:'压缩上下文',exact:true});
  await compact.click();
  await page.getByRole('button',{name:'b',exact:true}).click();
  await compact.click();
  await page.getByRole('button',{name:'a',exact:true}).click();
  assert.equal(await compact.isDisabled(),true);
  assert.deepEqual(await page.evaluate(()=>window.__calls),['a','b']);
  await page.evaluate(()=>window.__finish.b({ok:false,error:'B compact failed'}));
  assert.equal(await page.getByText(/B compact failed/).count(),0);
  await page.evaluate(()=>window.__finish.a({ok:true,result:{}}));
  await page.getByText('已请求压缩上下文',{exact:true}).waitFor();
  await page.getByRole('button',{name:'b',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'B compact failed'}).waitFor();
  await compact.click();
  await page.waitForFunction(()=>window.__calls.length===3);
  await page.evaluate(()=>window.__finish.b({ok:true,result:{}}));
  await page.getByText('已请求压缩上下文',{exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.__calls),['a','b','b']);
  console.log('PASS: compaction lock survives navigation, independent threads proceed and errors follow source with retry');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
