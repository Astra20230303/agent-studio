const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__calls = []; window.__fail = true;
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', threads: [] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'thread/list') {
          if (params.cursor && window.__fail) return { ok: false, error: { message: 'Page unavailable' } };
          return { ok: true, result: params.cursor ? { data: [{ id: 'new', name: 'Newest', updatedAt: 30 }, { id: 'old', name: 'Older', updatedAt: 10 }] } : { data: [{ id: 'new', name: 'Newest', updatedAt: 30 }, { id: 'mid', name: 'Middle', updatedAt: 20 }], nextCursor: 'older-page' } };
        }
        return { ok: true, result: { data: [] } };
      }, notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '加载更多会话' }).click();
    await page.getByRole('alert').filter({ hasText: 'Page unavailable' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Newest', exact: true }).count(), 1);
    await page.evaluate(() => { window.__fail = false; });
    await page.getByRole('button', { name: '重试加载会话' }).click();
    await page.getByRole('button', { name: 'Older', exact: true }).waitFor();
    assert.deepEqual(await page.locator('.recent').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label'))), ['Newest', 'Middle', 'Older']);
    assert.equal(await page.getByRole('button', { name: '加载更多会话' }).count(), 0);
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'thread/list' && call.params.cursor === 'older-page').length), 2);
    console.log('PASS: thread pagination, retry, deduplication and recency ordering');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
