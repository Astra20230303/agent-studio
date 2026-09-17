const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'alpha', threads: [] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['alpha', 'Beta-Code', 'beta-chat'] }) };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const picker = page.getByRole('button', { name: '选择模型', exact: true });
    await picker.getByText('alpha', { exact: true }).waitFor(); await picker.click();
    const search = page.getByRole('textbox', { name: '搜索模型', exact: true });
    assert.ok(await search.evaluate(el => el === document.activeElement));
    await search.fill(' BETA ');
    assert.equal(await page.locator('.model-options button').count(), 2);
    await search.fill('missing'); await page.getByText('没有匹配的模型', { exact: true }).waitFor();
    await search.fill('CODE'); await page.getByRole('button', { name: 'Beta-Code', exact: true }).click();
    await picker.getByText('Beta-Code', { exact: true }).waitFor();
    await picker.click(); assert.equal(await search.inputValue(), '');
    assert.equal(await page.locator('.model-options button').count(), 3);
    await search.fill('alpha'); await page.keyboard.press('Escape');
    assert.ok(await picker.evaluate(el => el === document.activeElement));
    await picker.getByText('Beta-Code', { exact: true }).waitFor();
    console.log('PASS: case-insensitive model search, no results, selection and reopen reset');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
