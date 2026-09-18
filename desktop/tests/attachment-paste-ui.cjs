const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.desktop = { savePastedImage: async () => new Promise(resolve => { window.__save = resolve; }), listModels: async () => ({ ok: true, models: ['test'] }) };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const paste = type => page.locator('.composer textarea').evaluate((element, type) => {
      const data = new DataTransfer();
      if (type === 'text') data.setData('text/plain', 'plain text');
      else data.items.add(new File(['fixture'], 'clipboard.png', { type: 'image/png' }));
      const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }); element.dispatchEvent(event); return event.defaultPrevented;
    }, type);
    assert.equal(await paste('text'), false);
    assert.equal(await paste('image'), true);
    await page.waitForFunction(() => !!window.__save);
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    await page.evaluate(() => window.__save({ ok: true, path: 'D:/clipboard.png' }));
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-attachments-v1') || '{}').new?.includes('D:/clipboard.png'));
    assert.equal(await page.locator('.attachment-list button').count(), 0);
    await page.evaluate(() => { delete window.__save; });
    await paste('image'); await page.waitForFunction(() => !!window.__save);
    await page.evaluate(() => window.__save({ ok: false, error: 'Disk full' }));
    await page.getByText('Disk full', { exact: true }).waitFor();
    assert.equal(await page.locator('.attachment-list button').count(), 0);
    console.log('PASS: text paste remains native, delayed image save retains source draft and failures add no attachment');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
