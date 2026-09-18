const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({
        model: 'model-a', activeThreadId: 'local-a', threads: [{ id: 'local-a', remoteId: 'remote-a', title: 'Restored', messages: [{ id: 'm', role: 'user', content: 'hello', createdAt: new Date().toISOString() }], status: 'completed', pinned: false, archived: false, updatedAt: new Date().toISOString() }], projects: [], automations: []
      }));
      const listeners = new Set();
      window.desktop = {
        listProviders: async () => [{ id: 'a', name: 'Alpha', enabled: true, keyConfigured: true }, { id: 'b', name: 'Beta', enabled: false, keyConfigured: true }],
        threadProvider: async () => new Promise(resolve => { (window.__bindingReads ||= []).push(resolve); }),
        providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['model-a'] }),
      };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        if (method === 'thread/resume') return { ok: true, result: { providerId: 'b', model: 'model-a', thread: { id: params.threadId, turns: [] } } };
        return { ok: true, result: { data: [] } };
      }, onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const select = page.getByRole('combobox', { name: '会话渠道', exact: true });
    await page.waitForFunction(() => document.querySelector('[aria-label="会话渠道"]')?.value === 'b');
    assert.equal(await select.inputValue(), 'b');
    await page.waitForFunction(() => !document.querySelector('[aria-label="会话渠道"]')?.disabled);
    await page.evaluate(() => { for (const resolve of window.__bindingReads || []) resolve('a'); });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0].providerId === 'b');
    assert.equal(await select.inputValue(), 'b');
    console.log('PASS: reopened idle thread restores provider binding and permits switching');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
