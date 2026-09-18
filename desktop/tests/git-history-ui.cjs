const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
   localStorage.setItem('codex-desktop-state-v1', JSON.stringify({activeProjectId:'p',projects:[{id:'p',path:'D:/repo'}],threads:[]}));
   window.__calls=[]; window.__badHistory='';
   window.desktop={listModels:async()=>({ok:true,models:['test']}), workspaceGit:async input=>{
    window.__calls.push(input);
    if(input.action==='status')return {ok:true,result:{root:'D:/repo',branch:'main',files:[]}};
    if(input.action==='history'&&window.__deletedBranch&&input.ref!=='HEAD')return {ok:false,error:'分支不存在，请刷新历史'};
    if(input.action==='history'&&window.__badHistory==='duplicate')return {ok:true,result:{refs:['refs/heads/feature'],anchor:'a'.repeat(40),commits:[{id:'a'.repeat(40),author:'A',date:'2026-09-18',subject:'one'},{id:'a'.repeat(40),author:'A',date:'2026-09-18',subject:'two'}],hasMore:false}};
    if(input.action==='history'&&window.__badHistory==='refs')return {ok:true,result:{refs:[{}],commits:[],hasMore:false}};
    if(input.action==='history')return {ok:true,result:{refs:['refs/heads/feature','refs/remotes/origin/review'],anchor:'a'.repeat(40),commits:[{id:(input.offset?'b':'a').repeat(40),subject:input.ref==='refs/heads/feature'?'feature tip':input.ref==='refs/remotes/origin/review'?'remote tip':input.offset?'older':'latest',author:'Tester',date:'2026-09-18'}],hasMore:!input.offset}};
    if(window.__failDetail){window.__failDetail=false;return {ok:false,error:'详情暂时不可用'};}
    if(window.__delayDetail)await new Promise(resolve=>setTimeout(resolve,500));
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
  await page.evaluate(()=>{window.__badHistory='duplicate';});
  await page.getByRole('button',{name:'刷新历史',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Git 提交历史存在重复记录'}).waitFor();
  await page.evaluate(()=>{window.__badHistory='refs';});
  await page.getByRole('button',{name:'刷新历史',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Git 提交历史数据无效'}).waitFor();
  await page.evaluate(()=>{window.__badHistory='';});
  await page.getByRole('button',{name:'刷新历史',exact:true}).click();
  await page.getByRole('button',{name:'aaaaaaaa · latest',exact:true}).waitFor();
  await page.evaluate(()=>{window.__failDetail=true;});
  await page.getByRole('button',{name:'aaaaaaaa · latest',exact:true}).click();
  await page.getByText('详情暂时不可用',{exact:true}).waitFor();
  await page.getByRole('button',{name:'重试读取提交',exact:true}).click();
  await page.getByText('commit details',{exact:false}).waitFor();
  await page.getByRole('button',{name:'返回提交列表',exact:true}).click();
  await page.evaluate(()=>{window.__delayDetail=true;});
  await page.getByRole('button',{name:'aaaaaaaa · latest',exact:true}).click();
  await page.getByRole('button',{name:'返回提交列表',exact:true}).click();
  await page.getByRole('button',{name:'aaaaaaaa · latest',exact:true}).waitFor();
  await page.waitForTimeout(650);
  assert.equal(await page.locator('[aria-label="提交历史"] pre').count(),0);
  await page.getByRole('combobox',{name:'历史分支',exact:true}).selectOption('refs/heads/feature');
  await page.getByRole('button',{name:'aaaaaaaa · feature tip',exact:true}).waitFor();
  await page.getByRole('combobox',{name:'历史分支',exact:true}).selectOption('refs/remotes/origin/review');
  await page.getByRole('button',{name:'aaaaaaaa · remote tip',exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>window.__calls.some(c=>c.ref==='refs/remotes/origin/review'&&c.offset===0&&!c.anchor)));
  await page.evaluate(()=>{window.__deletedBranch=true;});
  await page.getByRole('button',{name:'刷新历史',exact:true}).click();
  await page.getByText('分支不存在，请刷新历史',{exact:true}).waitFor();
  await page.getByRole('button',{name:'返回当前 HEAD 历史',exact:true}).click();
  await page.getByRole('button',{name:'aaaaaaaa · latest',exact:true}).waitFor();
  assert.equal(await page.getByRole('combobox',{name:'历史分支',exact:true}).inputValue(),'HEAD');
  console.log('PASS: Git history navigation, fixed pagination, escaped commit detail');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
