const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', path: 'D:/repo', name: 'repo', git: {} }], threads: [] }));
      window.__requests = [];
      window.desktop = { workspaceGit: async input => { window.__requests.push(input); return { ok: true, result: input.action === 'status' ? { root: 'D:/repo', branch: 'main', files: [{ path: 'a.txt', index: 'M', working: 'M' }] } : { diff: input.staged ? '+staged' : '@@ -10,2 +10,2 @@\n-old value\n+new value\n context' } }; }, listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => {}, onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    await page.getByRole('button', { name: '已暂存 M', exact: true }).click();
    await page.getByText('+staged', { exact: true }).waitFor();
    await page.getByRole('button', { name: '返回变更', exact: true }).click();
    await page.getByRole('button', { name: '未暂存 M', exact: true }).click();
    await page.getByRole('button', { name: '新行 10: +new value', exact: true }).click();
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Existing draft');
    await page.getByRole('textbox', { name: '审阅意见', exact: true }).fill('Handle missing values');
    await page.getByRole('button', { name: '加入会话草稿', exact: true }).click();
    const draft = await page.getByRole('textbox', { name: '消息', exact: true }).inputValue();
    assert.ok(draft.startsWith('Existing draft'));
    assert.ok(draft.includes('文件：a.txt'));
    assert.ok(draft.includes('新版本第 10 行'));
    assert.ok(draft.includes('差异行：+new value'));
    assert.ok(draft.includes('Handle missing values'));
    await page.getByRole('button', { name: '查看 Git 变更', exact: true }).click();
    await page.getByRole('button', { name: '未暂存 M', exact: true }).click();
    await page.getByRole('button', { name: '旧行 10: -old value', exact: true }).click();
    await page.getByRole('textbox', { name: '审阅意见', exact: true }).fill('Preserve old behavior');
    await page.getByRole('button', { name: '加入会话草稿', exact: true }).click();
    assert.ok((await page.getByRole('textbox', { name: '消息', exact: true }).inputValue()).includes('旧版本第 10 行'));
    assert.ok((await page.evaluate(() => window.__requests)).every(item => item.root === 'D:/repo'));
    console.log('PASS: Git status, staged/working views, current workspace routing');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
