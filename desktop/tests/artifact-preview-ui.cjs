const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
 localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeThreadId:'preview',threads:[{id:'preview',cwd:'D:/One',title:'preview',status:'completed',updatedAt:'',messages:[{id:'m',role:'assistant',content:'[open notes](notes.txt:2)',createdAt:''}]}]}));
 window.__reads=[];window.desktop={artifact:async()=>({ok:true,result:{root:'D:/One',path:'notes.txt',line:2,name:'notes.txt',image:false,data:'data:text/plain;base64,YQ=='}}),workspaceFile:async input=>{window.__reads.push(input);return window.__result || {ok:true,result:{text:'first\nsecond\nthird',revision:'original'}};}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 await page.getByRole('button',{name:'open notes',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'消息文件预览'});await modal.getByText('工作区：D:/One',{exact:true}).waitFor();
 await modal.locator('pre').waitFor();assert.equal(await modal.locator('pre span').nth(1).evaluate(el=>el.style.background),'rgb(255, 224, 138)');
 assert.deepEqual(await page.evaluate(()=>window.__reads[0]),{root:'D:/One',path:'notes.txt',action:'read'});
 await page.evaluate(()=>window.__result={ok:false,error:'file removed'});await modal.getByRole('button',{name:'刷新预览'}).click();await modal.getByRole('alert').getByText('file removed').waitFor();assert.equal(await modal.getByRole('button',{name:'编辑此文件'}).count(),0);
 await page.evaluate(()=>window.__result={ok:true,result:{text:'short',revision:'short'}});await modal.getByRole('button',{name:'刷新预览'}).click();await modal.getByRole('status').getByText('第 2 行不在当前预览范围内。').waitFor();
 await page.evaluate(()=>window.__result=undefined);await modal.getByRole('button',{name:'刷新预览'}).click();await modal.locator('pre').getByText('second',{exact:true}).waitFor();
 await modal.getByRole('button',{name:'编辑此文件'}).click();await page.locator('.file-editor textarea').waitFor();assert.equal(await page.locator('.file-editor textarea').inputValue(),'first\nsecond\nthird');
 const editor=page.getByRole('dialog',{name:'编辑工作区文件',exact:true});
 const contents=editor.getByRole('textbox',{name:'文件内容',exact:true});
 assert.ok(await contents.evaluate(el=>el===document.activeElement));
 await editor.press('Escape');await editor.waitFor({state:'detached'});
 assert.ok(await page.getByRole('button',{name:'open notes',exact:true}).evaluate(el=>el===document.activeElement));
 await page.getByRole('button',{name:'open notes',exact:true}).press('Enter');
 await modal.getByRole('button',{name:'编辑此文件'}).click();
 await contents.fill('Unsaved edits');
 page.once('dialog',dialog=>dialog.dismiss());
 await editor.press('Escape');
 assert.ok(await editor.isVisible());assert.equal(await contents.inputValue(),'Unsaved edits');
 page.once('dialog',dialog=>dialog.accept());
 await editor.press('Escape');await editor.waitFor({state:'detached'});
 assert.ok(await page.getByRole('button',{name:'open notes',exact:true}).evaluate(el=>el===document.activeElement));
 console.log('PASS: message file opens preview at line and enters existing editor in original workspace');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});

