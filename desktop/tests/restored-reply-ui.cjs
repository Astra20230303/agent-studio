const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const status of ['completed', 'inProgress']) {
      const page = await browser.newPage();
      await page.addInitScript(status => {
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'remote', title: 'Restored', status: 'completed', messages: [], updatedAt: '' }] }));
        const item = { id: 'reply', type: 'agentMessage', text: 'Recovered reply' };
        window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
        window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => ({ ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, turns: [{ id: 'turn', status, items: [item] }] } } : method === 'thread/items/list' ? { data: [{ item, turnId: 'turn' }] } : { data: [] } }), onNotification: fn => { window.__emit = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
      }, status);
      await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
      await page.getByText('Recovered reply', { exact: true }).waitFor();
      if (status === 'completed') {
        await page.getByRole('button', { name: '会话内查找', exact: true }).click();
        await page.getByRole('button', { name: '加载完整历史', exact: true }).click();
        await page.getByRole('status').filter({ hasText: '历史已加载' }).waitFor();
      }
      await page.evaluate(async () => {
        window.__emit({ method: 'item/agentMessage/delta', params: { threadId: 'remote', turnId: 'turn', itemId: 'reply', delta: ' continued' } });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const thread = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0]);
      assert.equal(thread.messages.length, 1);
      assert.equal(thread.messages[0].content, status === 'completed' ? 'Recovered reply' : 'Recovered reply continued');
      assert.equal(thread.status, status === 'completed' ? 'completed' : 'running');
      await page.close();
    }
    console.log('PASS: resumed final replies resist late increments after full history reload; active replies continue streaming');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
