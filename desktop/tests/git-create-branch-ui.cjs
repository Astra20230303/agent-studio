const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const {workspaceGit} = require('../electron/workspace-git.cjs');
(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'felix-create-ui-'));
  let browser;
  try {
    const git = (...args) => execFileSync('git',args,{cwd:root,windowsHide:true,encoding:'utf8',stdio:'pipe'}).trim();
    git('init','-b','main'); git('config','user.name','Test'); git('config','user.email','test@example.invalid');
    browser = await chromium.launch({channel:'msedge',headless:true});
    const page = await browser.newPage();
    const calls = [];
    await page.exposeFunction('realWorkspaceGit', async input => {
      assert.equal(input.root,root); calls.push(input);
      try { return {ok:true,result:await workspaceGit(input)}; }
      catch (error) { return {ok:false,error:error.message}; }
    });
    await page.addInitScript(root => {
      localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeProjectId:'p',projects:[{id:'p',path:root}],threads:[]}));
      window.desktop = {workspaceGit:input=>window.realWorkspaceGit(input)};
    },root);
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button',{name:'查看 Git 变更',exact:true}).click();
    await page.getByRole('button',{name:'切换分支',exact:true}).click();
    const name = page.getByRole('textbox',{name:'新分支名称',exact:true});
    const submit = page.getByRole('button',{name:'创建本地分支并切换',exact:true});
    await page.getByText('请先完成首个提交，再创建本地分支。',{exact:true}).waitFor();
    await name.fill('codex/new'); assert.ok(await submit.isDisabled());
    await fs.writeFile(path.join(root,'file.txt'),'base'); git('add','.'); git('commit','-m','base');
    await page.getByRole('button',{name:'刷新分支列表',exact:true}).click();
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='创建本地分支并切换' && !b.disabled));
    await name.fill('main'); assert.ok(await submit.isDisabled());
    await name.fill('bad name'); await submit.click();
    await page.getByRole('alert').filter({hasText:'not a valid branch name'}).waitFor();
    assert.equal(await name.inputValue(),'bad name'); assert.equal(git('branch','--show-current'),'main');
    await name.fill('codex/new');
    git('commit','--allow-empty','-m','advance'); await submit.click();
    await page.getByRole('alert').filter({hasText:'当前分支或提交已变化'}).waitFor();
    assert.equal(await name.inputValue(),'codex/new');
    await page.getByRole('button',{name:'刷新分支列表',exact:true}).click();
    await page.getByText('当前：main',{exact:true}).waitFor();
    await fs.writeFile(path.join(root,'file.txt'),'staged'); git('add','.');
    await fs.writeFile(path.join(root,'file.txt'),'working');
    await fs.writeFile(path.join(root,'new.txt'),'keep');
    await submit.click();
    await page.getByText('已切换到 codex/new',{exact:true}).waitFor();
    await page.getByText('分支：codex/new',{exact:true}).waitFor();
    assert.equal(git('branch','--show-current'),'codex/new'); assert.equal(git('show',':file.txt'),'staged');
    assert.equal(await fs.readFile(path.join(root,'file.txt'),'utf8'),'working');
    assert.equal(await fs.readFile(path.join(root,'new.txt'),'utf8'),'keep');
    assert.equal(calls.filter(c=>c.action==='create-branch').length,3);
    const audit=await page.evaluate(()=>JSON.parse(localStorage.getItem('felix-audit-log-v1')).filter(entry=>entry.action.startsWith('Git ')));
    assert.equal(audit.length,1);assert.equal(audit[0].action,'Git 创建本地分支');assert.equal(audit[0].detail,undefined);
    assert.ok(!JSON.stringify(audit).includes('codex/new'));
    console.log('PASS: real Git create branch UI, unborn/duplicate protection, invalid/stale retry and work preservation');
  } finally { await browser?.close(); await fs.rm(root,{recursive:true,force:true}); }
})().catch(error=>{console.error(error);process.exitCode=1;});
