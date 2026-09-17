const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__requests = [];
      window.desktop = { listModels: () => new Promise((resolve, reject) => window.__requests.push({ resolve, reject })) };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => window.__requests.length > 0);
    await page.evaluate(() => { window.__old = [...window.__requests]; window.dispatchEvent(new Event('provider-changed')); });
    await page.waitForFunction(() => window.__requests.length > window.__old.length);
    await page.evaluate(() => window.__requests.at(-1).resolve({ ok: true, models: ['new-provider-model'] }));
    const picker = page.getByRole('button', { name: '选择模型', exact: true });
    await picker.getByText('new-provider-model', { exact: true }).waitFor();
    await page.evaluate(() => window.__old.forEach(request => request.resolve({ ok: true, models: ['obsolete-model'] })));
    await picker.click();
    await page.getByRole('button', { name: 'new-provider-model', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'obsolete-model', exact: true }).count(), 0);
    await page.evaluate(() => { window.dispatchEvent(new Event('provider-changed')); window.__stale = window.__requests.at(-1); window.dispatchEvent(new Event('provider-changed')); });
    await page.evaluate(() => window.__stale.reject(new Error('obsolete failure')));
    await picker.getByText('加载模型…', { exact: true }).waitFor();
    assert.equal(await page.getByText('obsolete failure', { exact: true }).count(), 0);
    await page.evaluate(() => window.__requests.at(-1).reject(new Error('current failure')));
    await page.getByText('current failure', { exact: true }).waitFor();
    await page.getByRole('button', { name: '刷新模型列表', exact: true }).click();
    await page.evaluate(() => window.__requests.at(-1).resolve({ ok: true, models: ['recovered-model'] }));
    await page.getByRole('button', { name: 'recovered-model', exact: true }).waitFor();
    console.log('PASS: provider change starts fresh request and stale success cannot replace current catalog');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
