const assert = require('node:assert/strict');
const fs = require('node:fs/promises'); const os = require('node:os'); const path = require('node:path');
const {execFileSync} = require('node:child_process'); const {chromium} = require('playwright');
const {workspaceGit} = require('../electron/workspace-git.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'felix-bulk-ui-'));let browser;
 try {
  const git=(...args)=>execFileSync('git',args,{cwd:root,windowsHide:true,encoding:'utf8',stdio:'pipe'}).trim();
  git('init','-b','main');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  await fs.writeFile(path.join(root,'a.txt'),'base');git('add','.');git('commit','-m','base');
  await fs.writeFile(path.join(root,'a.txt'),'edited');await fs.writeFile(path.join(root,'new.txt'),'new');
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.exposeFunction('realWorkspaceGit',async input=>{
   assert.equal(input.root,root);try{return{ok:true,result:await workspaceGit(input)}}catch(error){return{ok:false,error:error.message}}
  });
  await page.addInitScript(root=>{
   localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeProjectId:'p',projects:[{id:'p',path:root}],threads:[]}));
   window.desktop={workspaceGit:async input=>{
    if(window.__hold && input.action==='stage-all')await new Promise(resolve=>window.__release=resolve);
    return window.realWorkspaceGit(input);
   }};
  },root);
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');await page.getByRole('button',{name:'查看 Git 变更',exact:true}).click();
  const stage=page.getByRole('button',{name:'暂存全部变更',exact:true});const unstage=page.getByRole('button',{name:'取消全部暂存',exact:true});
  await stage.waitFor();assert.ok(await unstage.isDisabled());
  const message=page.getByRole('textbox',{name:'提交说明'});await message.fill('bulk change');
  git('commit','--allow-empty','-m','advance');await stage.click();
  await page.getByRole('alert').filter({hasText:'当前分支或提交已变化'}).waitFor();
  assert.equal(await message.inputValue(),'bulk change');assert.equal(git('diff','--cached','--name-only'),'');
  await page.getByRole('button',{name:'刷新变更',exact:true}).click();await stage.waitFor();
  await page.evaluate(()=>window.__hold=true);await stage.click();await page.waitForFunction(()=>!!window.__release);
  assert.ok(await stage.isDisabled());assert.ok(await unstage.isDisabled());
  assert.ok(await page.getByRole('button',{name:'关闭 Git 面板',exact:true}).isDisabled());
  assert.ok(await page.getByRole('button',{name:'刷新变更',exact:true}).isDisabled());
  assert.ok(await page.getByRole('button',{name:'浏览提交历史',exact:true}).isDisabled());
  await page.evaluate(()=>{window.__hold=false;window.__release()});
  await page.getByText('已暂存全部变更',{exact:true}).waitFor();
  await page.getByRole('button',{name:'取消暂存 new.txt',exact:true}).waitFor();assert.ok(await stage.isDisabled());
  await fs.writeFile(path.join(root,'a.txt'),'later edits');await unstage.click();
  await page.getByText('已取消全部暂存，工作区内容保留',{exact:true}).waitFor();
  await page.getByRole('button',{name:'暂存 new.txt',exact:true}).waitFor();assert.ok(await unstage.isDisabled());
  assert.equal(await fs.readFile(path.join(root,'a.txt'),'utf8'),'later edits');assert.equal(git('diff','--cached','--name-only'),'');
  assert.equal(await message.inputValue(),'bulk change');await stage.click();
  await page.getByRole('button',{name:'取消暂存 new.txt',exact:true}).waitFor();
  await page.getByRole('button',{name:'提交已暂存变更',exact:true}).click();await page.getByText('工作区没有变更。',{exact:true}).waitFor();
  assert.equal(git('log','-1','--format=%s'),'bulk change');assert.equal(git('show','HEAD:a.txt'),'later edits');
  assert.ok(await stage.isDisabled());assert.ok(await unstage.isDisabled());
  git('switch','-c','feature');await fs.writeFile(path.join(root,'a.txt'),'feature');git('commit','-am','feature');
  git('switch','main');await fs.writeFile(path.join(root,'a.txt'),'main');git('commit','-am','main');assert.throws(()=>git('merge','feature'));
  await page.getByRole('button',{name:'刷新变更',exact:true}).click();
  await page.getByText('请逐个解决冲突后再批量操作。',{exact:true}).waitFor();assert.ok(await stage.isDisabled());assert.ok(await unstage.isDisabled());
  console.log('PASS: real Git bulk UI stale retry, pending lock, preservation, commit and conflict guards');
 }finally{await browser?.close();await fs.rm(root,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
