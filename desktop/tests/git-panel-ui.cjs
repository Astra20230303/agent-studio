const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', path: 'D:/repo', name: 'repo', git: {} }], threads: [] }));
      window.__requests = [];
      window.desktop = { workspaceGit: async input => { window.__requests.push(input); return { ok: true, result: input.action === 'status' ? { root: 'D:/repo', branch: 'main', files: [{ path: 'a.txt', index: 'M', working: 'M' }] } : { diff: input.staged ? '+staged' : '+working' } }; }, listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => {}, onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    await page.getByRole('button', { name: '已暂存 M', exact: true }).click();
    await page.getByText('+staged', { exact: true }).waitFor();
    await page.getByRole('button', { name: '返回变更', exact: true }).click();
    await page.getByRole('button', { name: '未暂存 M', exact: true }).click();
    await page.getByText('+working', { exact: true }).waitFor();
    assert.ok((await page.evaluate(() => window.__requests)).every(item => item.root === 'D:/repo'));
    console.log('PASS: Git status, staged/working views, current workspace routing');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
