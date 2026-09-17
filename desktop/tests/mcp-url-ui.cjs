const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__responses = []; window.__urls = []; window.__failOpen = true; window.__failSend = true;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), openExternal: async url => { if (window.__failOpen) throw Error('Browser unavailable'); window.__urls.push(url); } };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), respond: async (id, result) => { if (window.__failSend) return { ok: false, error: 'Send failed' }; window.__responses.push({ id, result }); return { ok: true }; }, onNotification: () => () => {}, onServerRequest: fn => { window.__ask = fn; return () => {}; }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => window.__ask);
    const ask = (id, url) => page.evaluate(({ id, url }) => window.__ask({ id, method: 'mcpServer/elicitation/request', params: { mode: 'url', serverName: 'Service', url, elicitationId: 'flow', message: 'Confirm account' } }), { id, url });
    await ask(1, 'https://example.com/authorize?state=test');
    assert.equal(await page.getByRole('button', { name: '确认继续' }).isEnabled(), false);
    await page.getByRole('button', { name: '打开网页' }).click();
    await page.getByRole('alert').filter({ hasText: 'Browser unavailable' }).waitFor();
    await page.evaluate(() => { window.__failOpen = false; });
    await page.getByRole('button', { name: '打开网页' }).click();
    assert.deepEqual(await page.evaluate(() => window.__urls), ['https://example.com/authorize?state=test']);
    assert.equal(await page.evaluate(() => window.__responses.length), 0);
    await page.getByRole('button', { name: '确认继续' }).click();
    await page.getByRole('alert').filter({ hasText: 'Send failed' }).waitFor();
    await page.evaluate(() => { window.__failSend = false; });
    await page.getByRole('button', { name: '确认继续' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => window.__responses[0]), { id: 1, result: { action: 'accept', content: null } });
    await ask(2, 'file:///C:/unsafe');
    assert.equal(await page.getByRole('button', { name: '打开网页' }).isEnabled(), false);
    await page.getByRole('button', { name: '拒绝', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => window.__responses[1].result), { action: 'decline', content: null });
    await ask(3, 'https://example.com/cancel');
    await page.getByRole('button', { name: '取消', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => window.__responses[2].result), { action: 'cancel', content: null });
    console.log('PASS: URL elicitation open/retry, explicit accept, invalid URL decline and cancel');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
