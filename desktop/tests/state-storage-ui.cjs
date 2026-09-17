const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', projects: [], threads: [] }));
      window.__failState = true; window.__calls = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'codex-desktop-state-v1' && window.__failState) throw new DOMException('Storage full', 'QuotaExceededError');
        return original.call(this, key, value);
      };
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        return { ok: true, result: method === 'thread/start' ? { thread: { id: 'storage-thread', turns: [] } } : method === 'turn/start' ? { turn: { id: 'storage-turn', status: 'completed' } } : { data: [] } };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const retry = page.getByRole('button', { name: '重试保存会话和设置', exact: true });
    await retry.click();
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('combobox', { name: '主题', exact: true }).selectOption('dark');
    await retry.click();
    assert.equal(await page.getByRole('combobox', { name: '主题', exact: true }).inputValue(), 'dark');
    await page.getByRole('button', { name: /返回应用/ }).click();
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Send despite state storage failure');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'turn/start'));
    await page.evaluate(() => { window.__failState = false; });
    await retry.click(); await retry.waitFor({ state: 'detached' });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
    assert.equal(saved.theme, 'dark');
    assert.ok(saved.threads.some(thread => thread.messages.some(message => message.content === 'Send despite state storage failure')));
    assert.deepEqual(errors, []);
    console.log('PASS: state write failure preserves settings, conversation creation and sending; retry saves latest state');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
