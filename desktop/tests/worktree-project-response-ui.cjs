const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>{
  localStorage.setItem('codex-desktop-state-v1',JSON.stringify({activeProjectId:'p',projects:[{id:'p',name:'Repo',path:'D:/repo'}],threads:[]}));
  window.__bad=true;window.desktop={workspaceGit:async input=>{
   if(input.action==='status')return {ok:true,result:{root:'D:/repo',branch:'main',files:[]}};
   if(input.action==='worktrees')return {ok:true,result:{worktrees:[{path:'D:/repo',primary:true,branch:'main'}]}};
   if(input.action==='open-worktree')return {ok:true,result:{id:'D:/repo',path:window.__bad?'relative':'D:/repo',name:'Repo',environment:'local',git:{isRepository:true,branch:'main'}}};
  }};
 });await page.goto(process.env.FELIX_TEST_URL||'http://127.0.0.1:5318');
 await page.getByRole('button',{name:'查看 Git 变更',exact:true}).click();await page.getByRole('button',{name:'浏览工作树',exact:true}).click();
 const open=page.getByRole('button',{name:'在工作树开始会话 D:/repo',exact:true});
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
 await open.click();await page.getByRole('alert').filter({hasText:'工作树项目数据无效'}).waitFor();
 const failed=await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')));assert.deepEqual(failed.projects,before.projects);assert.deepEqual(failed.threads,before.threads);
 await page.evaluate(()=>window.__bad=false);await open.click();await page.locator('.git-panel').waitFor({state:'hidden'});
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')));assert.equal(state.projects.find(p=>p.id==='D:/repo').environment,'local');assert.equal(state.threads.find(t=>t.id===state.activeThreadId).cwd,'D:/repo');
 console.log('PASS: malformed opened project leaves state intact; retry opens primary workspace as local');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
