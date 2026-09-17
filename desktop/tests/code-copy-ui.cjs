const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', title: 'Code', messages: [{ id: 'code', role: 'assistant', content: '````markdown\n```js\n  const text = "中文 <tag> & $()";\n```\n````\n\n~~~python\nprint("second")\n~~~\n\n```text\nunfinished' }], status: 'completed', updatedAt: '' }] }));
      window.__copied = []; window.__fail = true;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (window.__fail) throw Error('Denied'); window.__copied.push(text); } } });
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const blocks = page.locator('.code-block');
    await blocks.nth(2).waitFor(); assert.equal(await blocks.count(), 3);
    const expected = ['```js\n  const text = "中文 <tag> & $()";\n```', 'print("second")', 'unfinished'];
    assert.deepEqual(await blocks.locator('pre code').allTextContents(), expected);
    await blocks.nth(0).getByRole('button', { name: '复制代码' }).click();
    await blocks.nth(0).getByRole('alert').waitFor();
    await page.evaluate(() => { window.__fail = false; });
    for (let index = 0; index < 3; index++) {
      await blocks.nth(index).getByRole('button', { name: '复制代码' }).click();
      await blocks.nth(index).getByRole('status').filter({ hasText: '代码已复制' }).waitFor();
    }
    assert.deepEqual(await page.evaluate(() => window.__copied), expected);
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: longer and tilde fences, unfinished blocks, exact code copy, failure feedback and retry');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
