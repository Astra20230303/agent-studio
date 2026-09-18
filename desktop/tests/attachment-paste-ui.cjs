const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.desktop = { savePastedImage: async () => new Promise(resolve => { window.__save = resolve; }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.__turns = 0;
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async method => { if (method === 'turn/start') window.__turns++; return { ok: true, result: { data: [] } }; }, onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const paste = type => page.locator('.composer textarea').evaluate((element, type) => {
      const data = new DataTransfer();
      if (type === 'text') data.setData('text/plain', 'plain text');
      else data.items.add(new File(['fixture'], 'clipboard.png', { type: 'image/png' }));
      const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }); element.dispatchEvent(event); return event.defaultPrevented;
    }, type);
    assert.equal(await paste('text'), false);
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Message with screenshot');
    await page.waitForFunction(() => !document.querySelector('button[aria-label="发送"]').disabled);
    assert.equal(await paste('image'), true);
    await page.waitForFunction(() => !!window.__save);
    await page.getByText('正在保存图片…', { exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: '发送', exact: true }).isDisabled());
    await page.getByRole('textbox', { name: '消息', exact: true }).press('Enter');
    assert.equal(await page.evaluate(() => window.__turns), 0);
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Independent draft');
    await page.waitForFunction(() => !document.querySelector('button[aria-label="发送"]').disabled);
    await page.evaluate(() => window.__save({ ok: true, path: 'D:/clipboard.png' }));
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-attachments-v1') || '{}').new?.includes('D:/clipboard.png'));
    assert.equal(await page.locator('.attachment-list button').count(), 0);
    await page.evaluate(() => { delete window.__save; });
    await paste('image'); await page.waitForFunction(() => !!window.__save);
    await page.evaluate(() => window.__save({ ok: false, error: 'Disk full' }));
    await page.getByText('Disk full', { exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('button[aria-label="发送"]').disabled);
    assert.equal(await page.locator('.attachment-list button').count(), 0);
    console.log('PASS: text paste remains native, delayed image save retains source draft and failures add no attachment');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
