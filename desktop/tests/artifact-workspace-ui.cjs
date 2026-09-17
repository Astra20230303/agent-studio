const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  const thread=(id,cwd)=>({id,cwd,title:id,status:'completed',updatedAt:'',messages:[{id:'message',role:'assistant',content:'[same file](same.txt)',createdAt:''}]});
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeThreadId:'First workspace',threads:[thread('First workspace','D:/One'),thread('Second workspace','D:/Two')]}));window.__reads=[];
  window.desktop={artifact:async input=>{window.__reads.push(input);return {ok:true,result:{name:'same.txt',image:false,data:'data:text/plain;base64,'+btoa(input.root)}};}};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 const link=page.getByRole('link',{name:'↓ same file',exact:true});await link.waitFor();
 assert.equal(await link.getAttribute('href'),'data:text/plain;base64,'+Buffer.from('D:/One').toString('base64'));
 await page.getByRole('button',{name:'Second workspace',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.artifact-link a')?.getAttribute('href')==='data:text/plain;base64,'+btoa('D:/Two'));
 assert.ok(await page.evaluate(()=>window.__reads.some(input=>input.root==='D:/Two'&&input.path==='same.txt')));
 console.log('PASS: same-path artifact links resolve against each conversation workspace');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
