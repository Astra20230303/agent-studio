const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__providers = [];
      window.desktop = {
        listProviders: async () => window.__providers,
        listModels: async () => ({ ok: false, models: [], error: 'HTTP 404: models unavailable' }),
        saveProvider: async input => { window.__saved = input; window.__providers = [{ ...input, id: 'custom', enabled: input.activate, keyConfigured: true }]; return { ok: true, id: 'custom' }; },
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('button', { name: '配置', exact: true }).click();
    await page.getByRole('button', { name: '连接并获取模型', exact: true }).click();
    await page.getByText('HTTP 404: models unavailable', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: '手动填写模型 ID' }).check();
    assert.ok(await page.getByRole('button', { name: '保存并启用模型' }).isDisabled());
    await page.getByRole('textbox', { name: '手动模型 ID' }).fill('  custom/model:v2  ');
    await page.getByRole('button', { name: '保存并启用模型' }).click();
    await page.waitForFunction(() => window.__saved);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).some(item => item.action === '启用渠道'));
    assert.equal(await page.evaluate(() => window.__saved.model), 'custom/model:v2');
    assert.equal(await page.evaluate(() => window.__saved.manualModel), true);
    await page.locator('.provider-item').getByRole('button', { name: '编辑', exact: true }).click();
    assert.ok(await page.getByRole('checkbox', { name: '手动填写模型 ID' }).isChecked());
    assert.equal(await page.getByRole('textbox', { name: '手动模型 ID' }).inputValue(), 'custom/model:v2');
    assert.equal(await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('felix-audit-log-v1'))).includes('custom/model:v2')), false);
    await page.getByRole('checkbox', { name: '手动填写模型 ID' }).uncheck();
    assert.ok(await page.getByRole('button', { name: '保存并启用模型' }).isDisabled());
    console.log('PASS: unavailable catalog, manual ID save/trim/activation, restored editor and automatic-mode validation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
