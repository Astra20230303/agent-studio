const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'remote-a', title: 'Records', messages: [], status: 'completed', updatedAt: '' }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__copy = text; } } });
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async method => ({ ok: true, result: method === 'thread/resume' ? { thread: { turns: [{ id: 'turn', items: [{ id: 'historical', type: 'futureLookup', payload: { text: '历史线索' } }] }] } } : { data: [] } }), onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByText('会话记录 · futureLookup · completed', { exact: true }).click();
    await page.getByRole('button', { name: '复制记录', exact: true }).click();
    assert.deepEqual(JSON.parse(await page.evaluate(() => window.__copy)), { id: 'historical', type: 'futureLookup', payload: { text: '历史线索' } });
    await page.evaluate(() => {
      window.__notify({ method: 'item/started', params: { threadId: 'remote-a', turnId: 'turn', item: { id: 'live', type: 'futureAction', input: 'keep me' } } });
      window.__notify({ method: 'item/completed', params: { threadId: 'remote-a', turnId: 'turn', item: { id: 'live', type: 'futureAction', output: 'completed result' } } });
    });
    await page.getByText('会话记录 · futureAction · completed', { exact: true }).waitFor();
    assert.equal(await page.locator('[data-message-id="tool-live"]').count(), 1);
    await page.getByRole('button', { name: '会话内查找', exact: true }).click();
    await page.getByRole('searchbox', { name: '查找会话内容' }).fill('keep me');
    await page.getByRole('status').filter({ hasText: '1 / 1 条匹配记录' }).waitFor();
    await page.locator('[data-message-id="tool-live"]').getByRole('button', { name: '复制记录' }).click();
    assert.deepEqual(JSON.parse(await page.evaluate(() => window.__copy)), { id: 'live', type: 'futureAction', input: 'keep me', output: 'completed result' });
    console.log('PASS: unknown history/live records retain fields, deduplicate lifecycle updates, copy and search');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
