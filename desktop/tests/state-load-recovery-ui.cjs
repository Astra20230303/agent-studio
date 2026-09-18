const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', '{broken');
      window.__writes = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.__writes.push(key); return original.call(this, key, value); };
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const retry = page.getByRole('button', { name: '重试读取', exact: true });
    await retry.waitFor();
    for (const raw of ['{broken', 'null', '[]', '{"threads":[null]}', '{"threads":[{"id":"x","title":"x","messages":[{"content":{}}]}]}']) {
      await page.evaluate(raw => { localStorage.setItem('codex-desktop-state-v1', raw); window.__writes = []; }, raw);
      await retry.click();
      await page.getByRole('alert').filter({ hasText: '原始数据已保留' }).waitFor();
      assert.equal(await page.getByRole('textbox', { name: '消息', exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => localStorage.getItem('codex-desktop-state-v1')), raw);
      assert.deepEqual(await page.evaluate(() => window.__writes), []);
    }
    await page.evaluate(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ theme: 'dark', model: 'test', activeThreadId: 'kept', threads: [{ id: 'kept', title: 'Recovered conversation', status: 'completed', updatedAt: '', messages: [{ id: 'm', role: 'user', content: 'Retained original message' }] }] }));
      window.__writes = [];
    });
    await retry.click();
    await page.getByText('Retained original message', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: '消息', exact: true }).waitFor();
    await page.waitForFunction(() => window.__writes.includes('codex-desktop-state-v1'));
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
    assert.equal(state.theme, 'dark'); assert.equal(state.threads[0].messages[0].content, 'Retained original message');
    assert.deepEqual(errors, []);
    console.log('PASS: malformed state blocks mounting and writes; repaired state retries without losing conversation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
