const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.desktop = {
        listTasks: async () => ({ ok: true, tasks: [] }),
        listModels: async () => ({ ok: true, models: ['test'] }),
        providerStatus: async () => ({ keyConfigured: true }),
        readExtensionFile: async () => ({ ok: true, text: '' }),
      };
      window.codex = {
        connect: async () => ({ ok: true }),
        notify: async () => ({}),
        request: async () => ({ ok: true, result: { data: [] } }),
        onNotification: () => () => {}, onClosed: () => () => {},
        onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    for (const route of ['已安排', '插件', '设置']) {
      await page.getByRole('button', { name: route, exact: true }).click();
      await page.waitForTimeout(route === '已安排' ? 100 : 0);
      assert.equal(await page.getByText('本地工作区演示页面，已准备好接入对应 connector。', { exact: true }).count(), 0);
    }
    await page.getByRole('button', { name: '返回应用', exact: true }).click();
    await page.getByRole('textbox', { name: '消息', exact: true }).waitFor();
    console.log('PASS: navigation renders real scheduled, plugin and settings surfaces without stale demo fallback');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
