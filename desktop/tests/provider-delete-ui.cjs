const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__providers = [
        { id: 'active', name: 'Active', baseUrl: 'https://example.com/v1', model: 'test', enabled: true, keyConfigured: true },
        { id: 'old', name: 'Old', baseUrl: 'https://old.example.com/v1', model: 'test', enabled: false, keyConfigured: true },
      ]; window.__deletes = 0;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), listProviders: async () => window.__providers,
        deleteProvider: async id => { window.__deletes++; if (window.__fail) return { ok: false, error: 'Disk unavailable' }; window.__providers = window.__providers.filter(item => item.id !== id); return { ok: true }; } };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await page.getByRole('button', { name: '配置', exact: true }).click();
    assert.ok(await page.getByRole('button', { name: '删除渠道 Active' }).isDisabled());
    const old = page.locator('.provider-item').filter({ hasText: 'Old' });
    await old.getByRole('button', { name: '编辑', exact: true }).click();
    await old.getByRole('button', { name: '删除渠道 Old' }).click();
    await page.getByRole('button', { name: '取消删除', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__deletes), 0);
    await old.getByRole('button', { name: '删除渠道 Old' }).click();
    await page.evaluate(() => { window.__fail = true; });
    await page.getByRole('button', { name: '确认删除渠道', exact: true }).click();
    await page.getByText('Disk unavailable', { exact: true }).waitFor();
    assert.equal(await page.getByRole('textbox', { name: 'Provider 名称' }).inputValue(), 'Old');
    await page.evaluate(() => { window.__fail = false; });
    await page.getByRole('button', { name: '确认删除渠道', exact: true }).click();
    await old.waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('textbox', { name: 'Provider 名称' }).inputValue(), '');
    assert.equal(await page.getByRole('button', { name: '删除渠道 Active' }).count(), 1);
    console.log('PASS: active protection, delete cancellation, failure retry and edited Provider cleanup');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
