const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', model: 'test', threads: [{ id: 'a', title: 'Current', status: 'completed', messages: [], updatedAt: new Date().toISOString() }] }));
      localStorage.setItem('felix-audit-log-v1', JSON.stringify([{ id: 'old', at: '2026-09-18T10:00:00.000Z', action: '打开设置', detail: 'safe detail' }, { id: 'old2', at: '2026-09-18T10:01:00.000Z', action: '切换会话', detail: 'Current' }]));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('button', { name: '操作记录', exact: true }).click();
    await page.getByRole('region', { name: '操作记录', exact: true }).waitFor();
    const records = page.getByRole('region', { name: '操作记录', exact: true });
    assert.equal(await records.getByText('打开设置', { exact: true }).count(), 1);
    const search = page.getByRole('searchbox', { name: '搜索操作记录', exact: true });
    await search.fill('切换');
    assert.equal(await records.getByText('打开设置', { exact: true }).count(), 0);
    assert.equal(await records.getByText('切换会话', { exact: true }).count(), 1);
    await search.fill('');
    await page.getByRole('button', { name: '清空记录', exact: true }).click();
    await page.getByText('暂无操作记录', { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1'))), []);
    await page.getByRole('button', { name: '返回应用', exact: true }).click();
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).some(item => item.action === '新建会话'));
    console.log('PASS: audit log persists, searches, clears, and records navigation actions without message content');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
