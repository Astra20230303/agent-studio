const {chromium}=require('playwright');const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {execFileSync}=require('node:child_process');
const {workspaceGit}=require('../electron/workspace-git.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'felix-search-ui-'));let browser;
 try{
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,stdio:'pipe'}).trim();
  git('init','-b','main');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  git('commit','--allow-empty','-m','needle original');git('branch','old');git('commit','--allow-empty','-m','unrelated');
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.exposeFunction('readGit',async input=>{assert.equal(input.root,root);try{return{ok:true,result:await workspaceGit(input)}}catch(error){return{ok:false,error:error.message}}});
  await page.addInitScript(root=>{
   localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeProjectId:'p',projects:[{id:'p',path:root}],threads:[]}));
   window.desktop={workspaceGit:async input=>{
    if(input.action==='history'&&window.__hold){window.__hold=false;await new Promise(resolve=>window.__release=resolve)}
    if(input.action==='history'&&window.__fail)return{ok:false,error:'History unavailable'};
    return window.readGit(input);
   }};
  },root);
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'查看 Git 变更',exact:true}).click();await page.getByRole('button',{name:'浏览提交历史',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'搜索提交说明',exact:true});const submit=page.getByRole('button',{name:'搜索提交',exact:true});
  await page.getByRole('button',{name:/ · unrelated$/}).waitFor();
  await search.fill('needle');await submit.click();await page.getByRole('button',{name:/ · needle original$/}).waitFor();
  assert.equal(await page.getByRole('button',{name:/ · unrelated$/}).count(),0);
  await page.getByRole('button',{name:/ · needle original$/}).click();await page.locator('pre').filter({hasText:'needle original'}).waitFor();
  git('commit','--allow-empty','-m','needle later');
  await page.getByRole('button',{name:'返回提交列表',exact:true}).click();await page.getByRole('button',{name:/ · needle original$/}).waitFor();
  assert.equal(await page.getByRole('button',{name:/ · needle later$/}).count(),0);assert.equal(await search.inputValue(),'needle');
  await page.getByRole('button',{name:'刷新历史',exact:true}).click();await page.getByRole('button',{name:/ · needle later$/}).waitFor();
  await page.getByRole('combobox',{name:'历史分支',exact:true}).selectOption('refs/heads/old');await page.getByRole('button',{name:/ · needle original$/}).waitFor();assert.equal(await page.getByRole('button',{name:/ · needle later$/}).count(),0);
  await page.evaluate(()=>window.__hold=true);await search.fill('no match');await submit.click();await page.waitForFunction(()=>!!window.__release);
  await search.fill('needle');await submit.click();await page.getByRole('button',{name:/ · needle original$/}).waitFor();await page.evaluate(()=>window.__release());
  await page.evaluate(()=>window.__fail=true);await submit.click();await page.getByText('History unavailable',{exact:true}).waitFor();assert.equal(await search.inputValue(),'needle');
  await page.evaluate(()=>window.__fail=false);await page.getByRole('button',{name:'重试读取提交',exact:true}).click();await page.getByRole('button',{name:/ · needle original$/}).waitFor();
  await search.fill('no match');await submit.click();await page.getByText('没有匹配的提交。',{exact:true}).waitFor();
  await page.getByRole('button',{name:'清除提交搜索',exact:true}).click();await page.getByRole('button',{name:/ · needle original$/}).waitFor();assert.equal(await search.inputValue(),'');
  console.log('PASS: real Git search UI, detail snapshot, refresh, branch scope, late response, no-match and retry');
 }finally{await browser?.close();await fs.rm(root,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
