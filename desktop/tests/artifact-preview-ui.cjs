const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
 localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeThreadId:'preview',threads:[{id:'preview',cwd:'D:/One',title:'preview',status:'completed',updatedAt:'',messages:[{id:'m',role:'assistant',content:'[open notes](./notes.txt:2)',createdAt:''}]}]}));
 window.__reads=[];window.desktop={artifact:async()=>({ok:true,result:{root:'D:/One',path:'notes.txt',line:2,name:'notes.txt',image:false,data:'data:text/plain;base64,YQ=='}}),workspaceFile:async input=>{window.__reads.push(input);return {ok:true,result:{text:'first\nsecond\nthird',revision:'original'}};}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 await page.getByRole('button',{name:'open notes',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'消息文件预览'});await modal.getByText('工作区：D:/One',{exact:true}).waitFor();
 await modal.locator('pre').waitFor();assert.equal(await modal.locator('pre span').nth(1).evaluate(el=>el.style.background),'rgb(255, 224, 138)');
 assert.deepEqual(await page.evaluate(()=>window.__reads[0]),{root:'D:/One',path:'notes.txt',action:'read'});
 await modal.getByRole('button',{name:'编辑此文件'}).click();await page.locator('.file-editor textarea').waitFor();assert.equal(await page.locator('.file-editor textarea').inputValue(),'first\nsecond\nthird');
 console.log('PASS: message file opens preview at line and enters existing editor in original workspace');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
