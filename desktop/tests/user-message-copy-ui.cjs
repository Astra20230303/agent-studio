const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__copied = []; window.__fail = true;
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { if (window.__fail) throw Error('denied'); window.__copied.push(text); } } });
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', title: 'Copy test', status: 'completed', updatedAt: '', messages: [
        { id: 'text', role: 'user', content: '  原始文本\n第二行 **Markdown**  ', attachments: ['D:/private.txt'], createdAt: '' },
        { id: 'file', role: 'user', content: '', attachments: ['D:/only.txt'], createdAt: '' },
      ] }] }));
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
    const text = page.locator('[data-message-id="text"]');
    const copy = text.getByRole('button', { name: '复制用户消息', exact: true });
    await copy.click();
    await page.getByText('复制失败，请检查剪贴板权限后重试。', { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__copied), []);
    await page.evaluate(() => { window.__fail = false; });
    await copy.focus(); await copy.press('Enter');
    await text.getByRole('button', { name: '用户消息已复制', exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__copied), ['  原始文本\n第二行 **Markdown**  ']);
    assert.ok(await page.locator('[data-message-id="file"]').getByRole('button', { name: '复制用户消息' }).isDisabled());
    await copy.waitFor();
    console.log('PASS: user message copy preserves whitespace and Markdown, excludes paths, supports keyboard, failure retry and feedback reset');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
