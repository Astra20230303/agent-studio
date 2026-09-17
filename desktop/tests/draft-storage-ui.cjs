const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', projects: [], threads: [] }));
      window.__failDraft = true;
      window.__calls = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'felix-thread-drafts-v1' && window.__failDraft) throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
        return original.call(this, key, value);
      };
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        return { ok: true, result: method === 'thread/start' ? { thread: { id: 'draft-thread', turns: [] } } : method === 'turn/start' ? { turn: { id: 'draft-turn', status: 'completed' } } : { data: [] } };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const editor = page.getByRole('textbox', { name: '消息', exact: true });
    const retry = page.getByRole('button', { name: '重试保存草稿', exact: true });
    await retry.waitFor();
    await editor.fill('Unsaved resource draft');
    await retry.click();
    assert.equal(await editor.inputValue(), 'Unsaved resource draft');
    await page.evaluate(() => { window.__failDraft = false; });
    await retry.click();
    await retry.waitFor({ state: 'detached' });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-thread-drafts-v1')).new), 'Unsaved resource draft');
    await page.evaluate(() => { window.__failDraft = true; });
    await editor.fill('Can send despite storage failure');
    await retry.waitFor();
    await editor.press('Enter');
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'turn/start'));
    assert.deepEqual(await page.evaluate(() => window.__calls.find(call => call.method === 'turn/start').params.input), [{ type: 'text', text: 'Can send despite storage failure' }]);
    assert.deepEqual(errors, []);
    console.log('PASS: storage quota failure preserves editor, retry persists exact draft, sending remains available without renderer errors');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
