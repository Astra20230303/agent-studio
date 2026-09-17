const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', title: 'Original', messages: [], status: 'completed', updatedAt: '' }] })));
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    await input.fill('Retain original draft');
    await page.keyboard.press('Control+Shift+O');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.length === 2);
    assert.equal(await input.inputValue(), '');
    assert.ok(await input.evaluate(el => el === document.activeElement));
    await page.getByRole('button', { name: 'Original', exact: true }).click();
    assert.equal(await input.inputValue(), 'Retain original draft');
    await page.getByRole('button', { name: '收起侧栏', exact: true }).click();
    await page.keyboard.press('Control+k');
    const search = page.getByRole('textbox', { name: '搜索最近会话', exact: true });
    await search.waitFor(); assert.ok(await search.evaluate(el => el === document.activeElement));
    await page.keyboard.press('Control+Shift+L');
    assert.ok(await input.evaluate(el => el === document.activeElement));
    await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'O', ctrlKey: true, shiftKey: true, isComposing: true, bubbles: true })));
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.length), 2);
    console.log('PASS: new conversation, draft retention, hidden sidebar search, composer focus and IME guard');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
