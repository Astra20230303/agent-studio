const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
   localStorage.setItem('codex-desktop-state-v1', JSON.stringify({activeProjectId:'p',projects:[{id:'p',path:'D:/repo'}],threads:[]}));
   window.__calls=[];
   window.desktop={listModels:async()=>({ok:true,models:['test']}), workspaceGit:async input=>{
    window.__calls.push(input);
    if(input.action==='status')return {ok:true,result:{root:'D:/repo',branch:'main',files:[]}};
    if(input.action==='history')return {ok:true,result:{anchor:'a'.repeat(40),commits:[{id:(input.offset?'b':'a').repeat(40),subject:input.offset?'older':'latest',author:'Tester',date:'2026-09-18'}],hasMore:!input.offset}};
    return {ok:true,result:{detail:'commit details\n+<script>plain text</script>'}};
   }};
   window.codex={connect:async()=>({ok:true}),request:async()=>({ok:true,result:{data:[]}}),notify:async()=>({}),onNotification:()=>()=>{},onClosed:()=>()=>{},onError:()=>()=>{},onStderr:()=>()=>{},onServerRequest:()=>()=>{}};
  });
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
  await page.getByRole('button',{name:'查看 Git 变更',exact:true}).click();
  await page.getByRole('button',{name:'浏览提交历史',exact:true}).click();
  await page.getByRole('button',{name:'aaaaaaaa · latest',exact:true}).click();
  await page.getByText('commit details', {exact:false}).waitFor();
  assert.match(await page.locator('[aria-label="提交历史"] pre').innerText(), /<script>/);
  await page.getByRole('button',{name:'返回提交列表',exact:true}).click();
  await page.getByRole('button',{name:'更早提交',exact:true}).click();
  await page.getByRole('button',{name:'bbbbbbbb · older',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'更早提交',exact:true}).isDisabled(),true);
  assert.ok(await page.evaluate(()=>window.__calls.some(c=>c.offset===30&&c.anchor==='a'.repeat(40))));
  await page.getByRole('button',{name:'较新提交',exact:true}).click();
  await page.getByRole('button',{name:'aaaaaaaa · latest',exact:true}).waitFor();
  console.log('PASS: Git history navigation, fixed pagination, escaped commit detail');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
