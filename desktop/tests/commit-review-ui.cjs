const {chromium}=require('playwright');const assert=require('node:assert/strict');
const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {execFileSync}=require('node:child_process');const{workspaceGit}=require('../electron/workspace-git.cjs');
(async()=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'felix-commit-review-'));let browser;
 try{
  const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,stdio:'pipe'}).trim();
  git('init','-b','main');git('config','user.name','Test');git('config','user.email','test@example.invalid');
  await fs.writeFile(path.join(root,'review.txt'),'review this line\n');git('add','.');git('commit','-m','Review target');const commit=git('rev-parse','HEAD');
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
  await page.exposeFunction('readGit',async input=>{assert.equal(input.root,root);return{ok:true,result:await workspaceGit(input)}});
  await page.addInitScript(root=>{
   localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeProjectId:'p',projects:[{id:'p',path:root}],threads:[]}));window.__fail=true;
   window.desktop={workspaceGit:async input=>{
    if(input.action==='commit-detail'){
     if(window.__fail)return{ok:false,error:'Commit unavailable'};
     if(window.__hold)await new Promise(resolve=>window.__release=resolve);
    }
    return window.readGit(input);
   }};
  },root);
  await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
  const composer=page.getByRole('textbox',{name:'消息',exact:true});await composer.fill('Keep my existing draft.');
  await page.getByRole('button',{name:'查看 Git 变更',exact:true}).click();await page.getByRole('button',{name:'浏览提交历史',exact:true}).click();
  await page.getByRole('button',{name:/ · Review target$/}).click();await page.getByText('Commit unavailable',{exact:true}).waitFor();
  const submit=page.getByRole('button',{name:'加入提交评审草稿',exact:true});assert.ok(await submit.isDisabled());
  const focus=page.getByRole('textbox',{name:'提交评审重点',exact:true});await focus.fill('Check error handling.');
  await page.evaluate(()=>{window.__fail=false;window.__hold=true});await page.getByRole('button',{name:'重试读取提交',exact:true}).click();
  await page.waitForFunction(()=>!!window.__release);assert.ok(await submit.isDisabled());assert.equal(await focus.inputValue(),'Check error handling.');
  await page.evaluate(()=>window.__release());await page.locator('pre').filter({hasText:'+review this line'}).waitFor();
  await submit.evaluate(button=>{button.click();button.click()});await page.getByRole('region',{name:'Git 变更',exact:true}).waitFor({state:'detached'});
  const draft=await composer.inputValue();assert.ok(draft.startsWith('Keep my existing draft.\n\n'));assert.equal(draft.split('目标提交：').length,2);for(const text of [commit,root,'+review this line','Check error handling.'])assert.ok(draft.includes(text),text);
  assert.equal(git('status','--porcelain'),'');assert.equal(git('rev-parse','HEAD'),commit);
  await page.reload();assert.equal(await composer.inputValue(),draft);
  console.log('PASS: real commit review appends and persists draft; failed/pending reads block action and retain focus');
 }finally{await browser?.close();await fs.rm(root,{recursive:true,force:true})}
})().catch(error=>{console.error(error);process.exitCode=1});
