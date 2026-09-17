const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', title: 'Original', status: 'completed', messages: [], updatedAt: '' }] })));
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    await input.fill('Keep draft');
    await page.keyboard.press('Control+Shift+P');
    const dialog = page.getByRole('dialog', { name: '命令面板', exact: true });
    const search = page.getByRole('combobox', { name: '搜索命令', exact: true });
    await dialog.waitFor(); await search.fill('nothing-matches');
    await page.getByText('没有匹配的命令', { exact: true }).waitFor();
    await page.keyboard.press('Enter'); assert.ok(await dialog.isVisible());
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '消息');
    assert.equal(await input.inputValue(), 'Keep draft');
    await page.getByRole('button', { name: '打开命令面板', exact: true }).click();
    await search.fill('NEW CHAT'); await page.keyboard.press('Enter');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.length === 2);
    assert.equal(await input.inputValue(), '');
    await page.getByRole('button', { name: 'Original', exact: true }).click();
    assert.equal(await input.inputValue(), 'Keep draft');
    await page.keyboard.press('Control+Shift+P'); await search.fill('git'); await page.keyboard.press('Enter');
    await page.getByRole('region', { name: 'Git 变更', exact: true }).waitFor();
    console.log('PASS: command search, empty result, Escape focus, actual new conversation and Git navigation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
