const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  if(!localStorage.getItem('codex-desktop-state-v1'))localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeThreadId:'a',activeProjectId:'p',projects:[{id:'p',name:'Project A',path:'D:/original',git:{isRepository:false},environment:'local'}],threads:[{id:'a',title:'Conversation',projectId:'p',status:'completed',messages:[],updatedAt:''}]}));
  window.desktop={getProjectRoot:async()=> 'D:/fallback',listModels:async()=>({ok:true,models:['test']})};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 await page.getByRole('textbox',{name:'消息',exact:true}).fill('Retained draft');
 await page.locator('.project-strip .project').click();await page.getByRole('button',{name:'移除最近项目 Project A',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).projects.length===0);
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
 assert.equal(state.threads[0].cwd,'D:/original');assert.equal(state.activeThreadId,'a');assert.equal(state.threads[0].projectId,undefined);
 await page.reload();assert.equal(await page.getByRole('textbox',{name:'消息',exact:true}).inputValue(),'Retained draft');
 await page.locator('.project-strip .project').click();assert.equal(await page.getByRole('button',{name:'移除最近项目 Project A',exact:true}).count(),0);
 assert.equal(await page.locator('.project-menu button').count(),1);
 await page.getByRole('button',{name:'打开文件夹…',exact:true}).waitFor();
 const audit=await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-audit-log-v1')));assert.equal(audit.filter(e=>e.action==='移除最近项目').length,1);assert.equal(audit.find(e=>e.action==='移除最近项目').detail,undefined);
 console.log('PASS: removing recent project retains conversation workspace and draft, persists removal without file operations');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
