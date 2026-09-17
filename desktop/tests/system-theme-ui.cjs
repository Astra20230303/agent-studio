const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ colorScheme: 'light' });
    await page.addInitScript(() => { window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) }; });
    const theme = async expected => {
      await page.waitForFunction(value => document.querySelector('.desktop-app')?.classList.contains(value) && document.documentElement.dataset.theme === value && document.documentElement.style.colorScheme === value, expected);
    };
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    const choice = page.getByRole('combobox', { name: '主题', exact: true });
    await choice.selectOption('system'); await theme('light');
    await page.emulateMedia({ colorScheme: 'dark' }); await theme('dark');
    assert.equal(await choice.inputValue(), 'system');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).theme), 'system');
    await page.reload(); await theme('dark');
    await page.getByRole('button', { name: '设置', exact: true }).click();
    await choice.selectOption('light'); await theme('light');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' }); await theme('light');
    await choice.selectOption('system'); await theme('dark');
    await page.emulateMedia({ colorScheme: 'light' }); await theme('light');
    console.log('PASS: system theme updates live, persists across reload, respects manual override and resumes system following');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
