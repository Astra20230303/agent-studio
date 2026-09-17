const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/src/McpForm.tsx*', route => route.abort());
    await page.addInitScript(() => {
      window.__responses = []; window.__fail = true;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), respond: async (id, result) => { if (window.__fail) return { ok: false, error: 'Retry cancellation' }; window.__responses.push({ id, result }); return { ok: true }; }, onNotification: () => () => {}, onServerRequest: fn => { window.__ask = fn; return () => {}; }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => window.__ask);
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.evaluate(() => window.__ask({ id: 1, method: 'mcpServer/elicitation/request', params: { mode: 'form', requestedSchema: { type: 'object', properties: {} } } }));
    await page.getByRole('dialog', { name: 'MCP 表单加载失败' }).waitFor();
    await page.getByRole('button', { name: '取消请求' }).click();
    await page.getByRole('alert').filter({ hasText: 'Retry cancellation' }).waitFor();
    await page.evaluate(() => { window.__fail = false; });
    await page.getByRole('button', { name: '取消请求' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => window.__responses), [{ id: 1, result: { action: 'cancel', content: null } }]);
    console.log('PASS: lazy form module failure preserves app and supports cancel retry');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
