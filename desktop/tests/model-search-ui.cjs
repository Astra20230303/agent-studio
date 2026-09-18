const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const crashes = [];
    page.on('pageerror', error => crashes.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'alpha', threads: [] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['alpha', 'Beta-Code', 'beta-chat'] }) };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const picker = page.getByRole('button', { name: '选择模型', exact: true });
    await picker.getByText('alpha', { exact: true }).waitFor(); await picker.click();
    const search = page.getByRole('combobox', { name: '搜索模型', exact: true });
    assert.ok(await search.evaluate(el => el === document.activeElement));
    await search.fill(' BETA ');
    assert.equal(await page.locator('.model-options button').count(), 2);
    await search.press('ArrowUp');
    assert.equal(await page.getByRole('listbox', { name: '可用模型' }).getByRole('option', { selected: true }).innerText(), 'beta-chat');
    await search.press('ArrowDown');
    assert.equal(await page.getByRole('listbox', { name: '可用模型' }).getByRole('option', { selected: true }).innerText(), 'Beta-Code');
    await search.fill('missing'); await page.getByText('没有匹配的模型', { exact: true }).waitFor();
    await search.press('Enter'); assert.ok(await search.isVisible());
    assert.equal(await search.getAttribute('aria-activedescendant'), null);
    await search.fill('CODE'); await search.press('Enter');
    await picker.getByText('Beta-Code', { exact: true }).waitFor();
    assert.ok(await picker.evaluate(el => el === document.activeElement));
    await picker.click(); assert.equal(await search.inputValue(), '');
    assert.equal(await page.locator('.model-options button').count(), 3);
    await search.evaluate(el => {
      for (const key of ['Enter', 'Escape', 'ArrowDown']) el.dispatchEvent(new KeyboardEvent('keydown', { key, isComposing: true, bubbles: true }));
    });
    assert.ok(await search.isVisible());
    assert.equal(await page.getByRole('listbox', { name: '可用模型' }).getByRole('option', { selected: true }).innerText(), 'Beta-Code');
    await search.fill('alpha'); await page.keyboard.press('Escape');
    assert.ok(await picker.evaluate(el => el === document.activeElement));
    await picker.getByText('Beta-Code', { exact: true }).waitFor();
    await page.evaluate(() => {
      window.desktop.listModels = async () => ({ ok: true, models: ['alpha', null] });
      window.dispatchEvent(new Event('provider-changed'));
    });
    await picker.click();
    await page.getByRole('alert').getByText('模型列表格式无效，请刷新重试。').waitFor();
    await picker.getByText('Beta-Code（不可用）', { exact: true }).waitFor();
    await search.press('Enter');
    assert.equal(await search.getAttribute('aria-activedescendant'), null);
    await page.evaluate(() => { window.desktop.listModels = async () => ({ ok: true, models: ['alpha', 'Beta-Code', 'Beta-Code'] }); });
    await page.getByRole('button', { name: '刷新模型列表', exact: true }).click();
    await page.getByRole('option', { name: 'Beta-Code', exact: true }).waitFor();
    assert.equal(await page.getByRole('listbox', { name: '可用模型' }).getByRole('option').count(), 2);
    await picker.getByText('Beta-Code', { exact: true }).waitFor();
    assert.deepEqual(crashes, []);
    console.log('PASS: case-insensitive model search, no results, selection and reopen reset');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
