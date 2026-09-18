const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
 localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeThreadId:'a',threads:[{id:'a',remoteId:'remote',title:'File approval',status:'completed',messages:[],updatedAt:''}]}));
 window.__responses=[];window.desktop={listModels:async()=>({ok:true,models:['test']})};
 window.codex={connect:async()=>({ok:true}),request:async method=>({ok:true,result:method==='thread/resume'?{thread:{turns:[]}}:{data:[]}}),notify:async()=>({}),respond:async(id,result)=>{window.__responses.push({id,result});return{ok:true}},onNotification:fn=>{window.__notify=fn;return()=>{}},onServerRequest:fn=>{window.__ask=fn;return()=>{}},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.waitForFunction(()=>window.__ask);
 await page.evaluate(()=>window.__ask({id:1,method:'item/fileChange/requestApproval',params:{threadId:'remote',turnId:'turn',itemId:'file',reason:'Review patch'}}));
 const region=page.getByRole('region',{name:'待审批文件差异'});await region.getByText('尚未收到此请求的文件差异。').waitFor();
 await page.evaluate(()=>window.__notify({method:'item/started',params:{threadId:'remote',turnId:'other-turn',item:{id:'file',type:'fileChange',changes:[{path:'wrong.txt',diff:'WRONG'}]}}}));
 assert.equal(await region.getByText('wrong.txt',{exact:true}).count(),0);
 await page.evaluate(()=>window.__notify({method:'item/fileChange/patchUpdated',params:{threadId:'remote',turnId:'turn',itemId:'file',changes:[{path:'src/example.txt',kind:{type:'update'},diff:'@@ -1 +1 @@\n-old\n+new <script>literal</script>'},{path:'empty.txt',kind:{type:'add'}}]}}));
 await region.getByText('src/example.txt',{exact:true}).waitFor();assert.equal(await region.locator('pre').textContent(),'@@ -1 +1 @@\n-old\n+new <script>literal</script>');assert.equal(await region.locator('script').count(),0);
 await region.getByText('此文件尚未提供差异内容。').waitFor();
 await page.getByRole('button',{name:'拒绝',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
 assert.deepEqual(await page.evaluate(()=>window.__responses),[{id:1,result:{decision:'decline'}}]);console.log('PASS: file approval resolves matching turn/item patches, updates live and renders literal diff safely');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
