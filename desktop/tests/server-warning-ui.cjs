const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const listeners = new Set(); window.__emit = message => listeners.forEach(listener => listener(message));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: listener => { listeners.add(listener); return () => listeners.delete(listener); }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => !!window.__emit);
    await page.evaluate(() => window.__emit({ method: 'warning', params: { message: '<b>Service warning</b>' } }));
    await page.getByRole('alert').getByText('<b>Service warning</b>', { exact: true }).waitFor();
    assert.equal(await page.getByRole('alert').locator('b').count(), 0);
    await page.getByRole('button', { name: '关闭服务警告' }).click();
    await page.getByText('<b>Service warning</b>', { exact: true }).waitFor({ state: 'detached' });
    await page.evaluate(() => window.__emit({ method: 'warning', params: { threadId: 'background', message: 'Thread warning' } }));
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.some(thread => thread.remoteId === 'background' && thread.messages.some(message => message.content === '警告：Thread warning')));
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
    assert.notEqual(state.activeThreadId, state.threads.find(thread => thread.remoteId === 'background').id);
    await page.reload();
    assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.some(thread => thread.remoteId === 'background' && thread.messages.some(message => message.role === 'system'))));
    console.log('PASS: global warnings are literal and dismissible; background warnings persist without taking focus');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
