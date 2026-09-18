const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const crashes = []; page.on('pageerror', error => crashes.push(error.message));
    await page.addInitScript(() => {
      window.__catalog = { ok: true, models: ['valid-model', {}] };
      window.__saved = [];
      window.desktop = {
        listProviders: async () => [],
        listModels: async () => window.__catalog,
        saveProvider: async input => { window.__saved.push(input); return { ok: true, id: 'test' }; },
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('button', { name: '配置', exact: true }).click();
    await page.getByRole('textbox', { name: 'Provider 名称', exact: true }).fill('Test provider');
    const connect = page.getByRole('button', { name: '连接并获取模型', exact: true });
    const save = page.getByRole('button', { name: '保存渠道', exact: true });
    await connect.click();
    await page.getByRole('alert').getByText('模型列表格式无效，请刷新重试。').waitFor();
    assert.ok(await save.isDisabled());
    assert.equal(await page.locator('#provider-model').count(), 0);
    await page.evaluate(() => { window.__catalog = { ok: true, models: ['valid-model', 'valid-model', 'second-model'] }; });
    await connect.click();
    await page.locator('#provider-model').selectOption('second-model');
    assert.equal(await page.locator('#provider-model option').count(), 3);
    await connect.click();
    await page.getByText('连接成功 · 获取到 2 个模型', { exact: true }).waitFor();
    assert.equal(await page.locator('#provider-model').inputValue(), 'second-model');
    await page.evaluate(() => { window.__catalog = { ok: true, models: [null] }; });
    await connect.click();
    await page.getByRole('alert').getByText('模型列表格式无效，请刷新重试。').waitFor();
    assert.ok(await save.isDisabled());
    assert.equal(await page.evaluate(() => window.__saved.length), 0);
    await page.evaluate(() => { window.__catalog = { ok: true, models: ['second-model'] }; });
    await connect.click();
    await page.getByText('连接成功 · 获取到 1 个模型', { exact: true }).waitFor();
    assert.equal(await page.locator('#provider-model').inputValue(), 'second-model');
    await save.click();
    await page.waitForFunction(() => window.__saved.length === 1);
    assert.equal(await page.evaluate(() => window.__saved[0].model), 'second-model');
    assert.deepEqual(crashes, []);
    console.log('PASS: provider setup rejects malformed catalog, retries with deduplication and retains selection before saving');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
