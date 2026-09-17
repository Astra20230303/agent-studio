const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'r', title: 'Web', messages: [], status: 'completed', updatedAt: '' }] }));
      window.__opened = [];
      window.desktop = { openExternal: async url => { if (window.__failOpen) throw Error('Unavailable'); window.__opened.push(url); }, listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async method => ({ ok: true, result: method === 'thread/resume' ? { thread: { turns: [{ id: 't', items: [{ id: 'web', type: 'webSearch', query: '查询', action: { type: 'search', queries: ['查询', 'second query'] }, results: [{ title: 'Result', url: 'https://example.com/page', snippet: 'A useful result' }, { title: 'Unsafe', url: 'javascript:alert(1)' }, { future: 'preserved' }] }] }] } } : { data: [] } }), onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByText('网页搜索 · 已完成', { exact: true }).click();
    await page.getByText('second query', { exact: true }).waitFor();
    await page.getByRole('link', { name: 'Result', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.__opened), ['https://example.com/page']);
    assert.equal(await page.locator('a[href^="javascript:"]').count(), 0);
    await page.getByText('原始搜索记录', { exact: true }).click();
    assert.ok((await page.locator('.tool-output').textContent()).includes('preserved'));
    await page.evaluate(() => window.__notify({ method: 'item/completed', params: { threadId: 'r', turnId: 't', item: { id: 'find', type: 'webSearch', query: '', action: { type: 'findInPage', url: 'https://example.com/page', pattern: 'needle' } } } }));
    await page.getByText('页内查找 · 已完成', { exact: true }).click();
    await page.getByText('查找：needle', { exact: true }).waitFor();
    await page.evaluate(() => { window.__failOpen = true; });
    await page.getByRole('link', { name: 'Result', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '无法打开链接' }).waitFor();
    await page.evaluate(() => { window.__failOpen = false; });
    await page.getByRole('link', { name: 'Result', exact: true }).click();
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.equal(await page.evaluate(() => window.__opened.length), 2);
    console.log('PASS: history search queries/results, safe links, opaque records and live page-find action');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
