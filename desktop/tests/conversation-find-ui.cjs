const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const messages = [
        { id: 'user', role: 'user', content: 'Needle question', attachments: ['D:/attachment.txt'] },
        { id: 'tool', role: 'assistant', content: '', tool: { kind: 'commandExecution', status: 'completed', command: 'test', output: 'needle output' } },
        { id: 'reply', role: 'assistant', content: 'NEEDLE answer' },
      ];
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', title: 'Search conversation', messages, status: 'completed', updatedAt: '' }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '会话内查找', exact: true }).waitFor();
    await page.keyboard.press('Control+f');
    const input = page.getByRole('searchbox', { name: '查找会话内容' });
    await input.fill('needle');
    await page.getByRole('status').filter({ hasText: '1 / 3 条匹配记录' }).waitFor();
    assert.equal(await page.locator('.conversation-find-match').getAttribute('data-message-id'), 'user');
    await input.press('Enter');
    await page.getByRole('status').filter({ hasText: '2 / 3 条匹配记录' }).waitFor();
    assert.equal(await page.locator('.conversation-find-match').getAttribute('data-message-id'), 'tool');
    assert.equal(await page.locator('[data-message-id="tool"] details').getAttribute('open'), '');
    await input.press('Shift+Enter');
    await page.getByRole('button', { name: '上一个匹配', exact: true }).click();
    await page.getByRole('status').filter({ hasText: '3 / 3 条匹配记录' }).waitFor();
    assert.equal(await page.locator('.conversation-find-match').getAttribute('data-message-id'), 'reply');
    await input.fill('attachment.txt');
    await page.getByRole('status').filter({ hasText: '1 / 1 条匹配记录' }).waitFor();
    await input.fill('missing-value');
    await page.getByRole('status').filter({ hasText: '没有匹配记录' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '下一个匹配', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('.conversation-find-match').count(), 0);
    await input.press('Escape');
    await input.waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('button', { name: '会话内查找', exact: true }).evaluate(element => element === document.activeElement), true);
    console.log('PASS: conversation find matches text/tools/attachments, opens tools, cycles and supports keyboard/no-results/close');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
