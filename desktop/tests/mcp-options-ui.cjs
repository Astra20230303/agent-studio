const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__responses = [];
      window.__fail = true;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}),
        respond: async (id, result) => { if (window.__fail) return { ok: false, error: 'Try again' }; window.__responses.push({ id, result }); return { ok: true }; },
        onNotification: () => () => {}, onServerRequest: fn => { window.__ask = fn; return () => {}; }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => window.__ask);
    await page.evaluate(() => window.__ask({ id: 2, method: 'mcpServer/elicitation/request', params: {
      mode: 'form', serverName: 'Choices', requestedSchema: { type: 'object', required: ['flavors', 'size'], properties: {
        flavors: { type: 'array', minItems: 2, maxItems: 2, items: { anyOf: [{ const: 'vanilla', title: '香草' }, { const: 'chocolate', title: '巧克力' }, { const: 'strawberry', title: '草莓' }] } },
        size: { type: 'string', oneOf: [{ const: 's', title: '小杯' }, { const: 'l', title: '大杯' }] }
      }}
    }}));
    await page.getByRole('combobox', { name: 'size', exact: true }).selectOption({ label: '大杯' });
    await page.getByLabel('香草', { exact: true }).check();
    await page.getByRole('button', { name: '提交', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'must NOT have fewer than 2 items' }).waitFor();
    assert.equal(await page.evaluate(() => window.__responses.length), 0);
    await page.getByLabel('巧克力', { exact: true }).check();
    await page.getByRole('combobox', { name: 'size', exact: true }).selectOption({ label: '大杯' });
    await page.getByRole('button', { name: '提交', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Try again' }).waitFor();
    assert.equal(await page.getByLabel('香草', { exact: true }).isChecked(), true);
    await page.evaluate(() => { window.__fail = false; });
    await page.getByRole('button', { name: '提交', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => window.__responses[0].result), { action: 'accept', content: { flavors: ['vanilla', 'chocolate'], size: 'l' } });
    console.log('PASS: MCP titled single choice, multi-choice constraints, retry and payload');
    await page.evaluate(() => window.__ask({ id: 3, method: 'mcpServer/elicitation/request', params: {
      mode: 'form', requestedSchema: { type: 'object', required: ['items', 'empty'], properties: {
        items: { type: 'array', minItems: 0, items: { type: 'string', enum: ['a'] } },
        empty: { type: 'string', oneOf: [{ const: '', title: 'Empty value' }, { const: 'other', title: 'Other' }] }
      }}
    }}));
    await page.getByRole('button', { name: '提交', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__responses.length), 1);
    await page.getByRole('combobox', { name: 'empty', exact: true }).selectOption({ label: 'Empty value' });
    await page.getByRole('button', { name: '提交', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => window.__responses[1].result), { action: 'accept', content: { items: [], empty: '' } });
    console.log('PASS: required empty arrays and explicit empty string choices');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
