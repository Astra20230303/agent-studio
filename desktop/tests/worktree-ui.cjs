const { chromium } = require('playwright'); const assert = require('node:assert/strict');
(async () => { const browser = await chromium.launch({ channel: 'msedge', headless: true }); try {
  const page = await browser.newPage(); await page.addInitScript(() => {
    localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', name: 'repo', path: 'D:/repo', git: {} }], threads: [] }));
    window.__requests = [];
    window.desktop = { workspaceGit: async input => { window.__requests.push(input); return { ok: true, result: input.action === 'status' ? { root: 'D:/repo', branch: 'main', files: [] } : { id: 'wt', path: 'D:/worktree', name: 'Worktree', environment: 'worktree', git: { isRepository: true, branch: input.branch } } }; }, listModels: async () => ({ ok: true, models: ['test'] }) };
    window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => {}, onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
  });
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318'); await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
  await page.getByRole('textbox', { name: '新工作树分支', exact: true }).fill('codex/task'); await page.getByRole('button', { name: '创建工作树并开始会话', exact: true }).click();
  await page.locator('.git-panel').waitFor({ state: 'hidden' });
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
  assert.equal(state.threads.find(item => item.id === state.activeThreadId).cwd, 'D:/worktree'); assert.equal(state.projects.find(item => item.id === 'wt').environment, 'worktree');
  console.log('PASS: create worktree and bind new conversation');
} finally { await browser.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
