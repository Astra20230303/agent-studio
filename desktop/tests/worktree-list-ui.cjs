const { chromium } = require('playwright'); const assert = require('node:assert/strict');
(async () => { const browser = await chromium.launch({ channel: 'msedge', headless: true }); try {
  const page = await browser.newPage(); await page.addInitScript(() => {
    localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', name: 'repo', path: 'D:/repo', git: {} }], threads: [] }));
    window.__requests = []; window.__delay=false;
    window.desktop = { workspaceGit: async input => { window.__requests.push(input); if(input.action==='open-worktree'&&window.__delay) await new Promise(resolve=>setTimeout(resolve,600)); if(input.action==='worktrees')return {ok:true,result:{worktrees:[{path:'D:/existing',branch:'codex/existing'}]}}; return { ok: true, result: input.action === 'status' ? { root: 'D:/repo', branch: 'main', files: [] } : { id: 'wt', path: 'D:/worktree', name: 'Worktree', environment: 'worktree', git: { isRepository: true, branch: input.branch } } }; }, listModels: async () => ({ ok: true, models: ['test'] }) };
    window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => {}, onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
  });
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318'); await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
  await page.getByRole('button',{name:'浏览工作树',exact:true}).click();
  await page.getByRole('button',{name:'在工作树开始会话 D:/existing',exact:true}).click();
  await page.locator('.git-panel').waitFor({ state: 'hidden' });
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
  assert.equal(state.threads.find(item => item.id === state.activeThreadId).cwd, 'D:/worktree'); assert.equal(state.projects.find(item => item.id === 'wt').environment, 'worktree');
  assert.ok(await page.evaluate(()=>window.__requests.some(item=>item.action==='open-worktree'&&item.path==='D:/existing')));
  await page.getByRole('button',{name:'查看 Git 变更',exact:true}).click();
  await page.getByRole('button',{name:'浏览工作树',exact:true}).click();
  await page.evaluate(()=>{window.__delay=true;});
  const threadCount = state.threads.length;
  await page.getByRole('button',{name:'在工作树开始会话 D:/existing',exact:true}).click();
  await page.getByRole('button',{name:'关闭 Git 面板',exact:true}).click();
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.length),threadCount);
  console.log('PASS: reopen worktree binds cwd; closing panel cancels delayed navigation');
} finally { await browser.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
