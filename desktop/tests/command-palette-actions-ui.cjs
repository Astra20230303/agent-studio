const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', projects: [], threads: [{ id: 'a', remoteId: 'remote-a', title: 'Original', status: 'completed', pinned: false, archived: false, messages: [{ id: 'm', role: 'user', content: 'hello' }], updatedAt: new Date().toISOString() }] }));
      window.__calls = [];
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }), remoteStatus: async () => ({ connected: false, url: '' }), remoteAction: async action => { window.__remote = action; return { isError: false, content: [] }; } };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => { window.__calls.push({ method, params }); return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, turns: [] } } : { data: [] } }; }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const open = () => page.getByRole('button', { name: '打开命令面板', exact: true }).click();
    const search = page.getByRole('combobox', { name: '搜索命令', exact: true });
    await open(); await search.fill('置顶当前会话'); await search.press('Enter');
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('codex-desktop-state-v1'))).threads[0].pinned, true);
    await open(); await search.fill('重命名当前会话'); await search.press('Enter');
    const rename = page.getByRole('dialog', { name: '重命名会话', exact: true });
    await rename.getByRole('textbox', { name: '会话名称', exact: true }).fill('From palette');
    await rename.getByRole('button', { name: '保存名称', exact: true }).click();
    await page.getByRole('button', { name: 'From palette', exact: true }).waitFor();
    await open(); await search.fill('打开远程桌面'); await search.press('Enter');
    await page.getByRole('region', { name: '远程桌面浏览器', exact: true }).waitFor();
    assert.equal(await page.getByRole('region', { name: '远程桌面浏览器', exact: true }).isVisible(), true);
    console.log('PASS: command palette pins, renames and opens remote desktop using existing handlers');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
