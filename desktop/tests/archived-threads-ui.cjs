const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__fail = true; window.__calls = [];
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', threads: [{ id: 'saved', remoteId: 'saved', title: 'Saved', archived: true, messages: [{ id: 'msg', role: 'user', content: 'Keep this', createdAt: new Date().toISOString() }], updatedAt: new Date().toISOString() }, { id: 'stale', remoteId: 'remote', title: 'Local title', archived: false, messages: [], updatedAt: new Date().toISOString() }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'thread/unarchive' && window.__fail) return { ok: false, error: 'Restore failed' };
        if (method === 'thread/list' && params.archived) return { ok: true, result: params.cursor ? { data: [{ id: 'older', name: 'Older' }] } : { data: [{ id: 'saved', name: 'Saved' }, { id: 'remote', name: 'Remote' }], nextCursor: 'more' } };
        return { ok: true, result: { data: [] } };
      }, notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '归档会话', exact: true }).click();
    await page.getByRole('button', { name: '加载更多归档' }).click();
    await page.getByRole('button', { name: '恢复 Older' }).waitFor();
    await page.getByRole('button', { name: '恢复 Saved' }).click();
    await page.getByRole('alert').filter({ hasText: 'Restore failed' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '恢复 Saved' }).count(), 1);
    await page.evaluate(() => { window.__fail = false; });
    await page.getByRole('button', { name: '恢复 Saved' }).click();
    await page.getByRole('button', { name: '恢复 Saved' }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '恢复 Local title' }).click();
    await page.getByRole('button', { name: '恢复 Local title' }).waitFor({ state: 'detached' });
    await page.getByRole('button', { name: '关闭归档会话' }).click();
    await page.getByRole('button', { name: 'Saved', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Local title', exact: true }).waitFor();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(thread => thread.id === 'saved'));
    assert.equal(saved.messages[0].content, 'Keep this');
    assert.equal(saved.archived, false);
    console.log('PASS: archived pagination, restore retry, deduplication and local history preservation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
