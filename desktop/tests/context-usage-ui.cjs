const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'remote-a', title: 'Context A', messages: [], status: 'completed', updatedAt: new Date().toISOString() }] }));
      window.__calls = []; window.__fail = true;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'thread/compact/start' && window.__fail) return { ok: false, error: 'Compaction unavailable' };
        return { ok: true, result: method === 'thread/resume' ? { thread: { turns: [] } } : { data: [] } };
      }, onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'thread/resume'));
    await page.evaluate(() => window.__notify({ method: 'thread/tokenUsage/updated', params: { threadId: 'remote-a', tokenUsage: { last: { totalTokens: 2500 }, total: { totalTokens: 12000 }, modelContextWindow: 10000 } } }));
    await page.getByText('最近上下文 2,500 / 10,000 Token (25%)', { exact: true }).click();
    await page.getByText('累计用量：12,000 Token', { exact: true }).waitFor();
    assert.equal(await page.getByRole('meter', { name: '上下文用量' }).getAttribute('value'), '2500');
    await page.getByRole('button', { name: '压缩上下文', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Compaction unavailable' }).waitFor();
    await page.evaluate(() => { window.__fail = false; });
    await page.getByRole('button', { name: '压缩上下文', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '已请求压缩上下文' }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__calls.filter(call => call.method === 'thread/compact/start').map(call => call.params)), [{ threadId: 'remote-a' }, { threadId: 'remote-a' }]);
    await page.evaluate(() => window.__notify({ method: 'turn/started', params: { threadId: 'remote-a', turn: { id: 'compact-turn', status: 'inProgress' } } }));
    await page.waitForFunction(() => [...document.querySelectorAll('button')].find(button => button.textContent === '压缩上下文')?.disabled);
    await page.evaluate(() => window.__notify({ method: 'turn/completed', params: { threadId: 'remote-a', turn: { id: 'compact-turn', status: 'completed' } } }));
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(button => button.textContent === '压缩上下文')?.disabled);
    console.log('PASS: context versus cumulative usage, explicit compact request, error retry and running-turn guard');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
