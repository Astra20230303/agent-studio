const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', model: 'test', threads: [{ id: 'a', title: 'Current', status: 'completed', messages: [{ id: 'm', role: 'assistant', content: 'reply', createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
    await page.getByRole('button', { name: '重命名', exact: true }).click();
    await page.getByRole('textbox', { name: '会话名称', exact: true }).fill('Renamed');
    await page.getByRole('button', { name: '保存名称', exact: true }).click();
    await page.getByText('Renamed', { exact: true }).first().waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).some(item => item.action === '重命名会话'));
    await page.locator('.global-thread-toolbar').getByRole('button', { name: '归档', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).some(item => item.action === '归档会话'));
    const actions = await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).map(item => item.action));
    assert.ok(actions.includes('重命名会话') && actions.includes('归档会话'));
    assert.equal(actions.some(action => action.includes('reply')), false);
    console.log('PASS: session lifecycle audit records rename/archive without message content');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
