const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: ['a', 'b', 'archived'].map(id => ({ id, title: 'Same title', cwd: 'D:/' + id, archived: id === 'archived', messages: [], status: 'completed', updatedAt: '' })) })));
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    const search = page.getByRole('combobox', { name: '搜索命令', exact: true });
    await input.fill('Draft A'); await page.keyboard.press('Control+Shift+P');
    await search.fill('Same title');
    assert.equal(await page.getByRole('dialog', { name: '命令面板', exact: true }).getByRole('option').count(), 2);
    await search.fill('D:/b'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).activeThreadId === 'b');
    assert.equal(await input.inputValue(), ''); await input.fill('Draft B');
    await page.keyboard.press('Control+Shift+P'); await search.fill('D:/a');
    await page.getByRole('dialog', { name: '命令面板', exact: true }).getByRole('option').click();
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '消息');
    assert.equal(await input.inputValue(), 'Draft A');
    await page.keyboard.press('Control+Shift+P'); await search.fill('D:/b'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).activeThreadId === 'b');
    assert.equal(await input.inputValue(), 'Draft B');
    console.log('PASS: same-title workspace filtering, archived exclusion and independent drafts');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
