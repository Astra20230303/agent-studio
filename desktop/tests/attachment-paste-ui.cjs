const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__saves = [];
      window.desktop = { savePastedImage: async () => new Promise(resolve => { window.__save = resolve; window.__saves.push(resolve); }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.__turns = 0;
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async method => { if (method === 'turn/start') window.__turns++; return { ok: true, result: { data: [] } }; }, onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const paste = type => page.locator('.composer textarea').evaluate((element, type) => {
      const data = new DataTransfer();
      if (type === 'text') data.setData('text/plain', 'plain text');
      else data.items.add(new File(['fixture'], 'clipboard', { type: type === 'image' ? 'image/png' : type }));
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
    assert.equal(await page.locator('.attachment-list button[aria-label^="移除附件："]').count(), 0);
    await page.evaluate(() => { delete window.__save; });
    await paste('image'); await page.waitForFunction(() => !!window.__save);
    await page.evaluate(() => window.__save({ ok: false, error: 'Disk full' }));
    await page.getByText('Disk full', { exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('button[aria-label="发送"]').disabled);
    assert.equal(await page.locator('.attachment-list button[aria-label^="移除附件："]').count(), 0);
    await page.evaluate(() => { window.__saves = []; });
    await paste('image'); await paste('image');
    await page.waitForFunction(() => window.__saves.length === 2);
    await page.evaluate(() => window.__saves[0]({ ok: true, path: 'D:/first.png' }));
    await page.getByRole('button', { name: '移除附件：D:/first.png', exact: true }).waitFor();
    assert.ok(await page.getByRole('button', { name: '发送', exact: true }).isDisabled());
    await page.evaluate(() => window.__saves[1]({ ok: true, path: 'D:/second.png' }));
    await page.getByRole('button', { name: '移除附件：D:/second.png', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('button[aria-label="发送"]').disabled);
    assert.equal(await page.evaluate(() => window.__turns), 0);
    for (const [mime, extension] of [['image/jpeg', 'jpg'], ['image/webp', 'webp'], ['image/gif', 'gif']]) {
      await page.evaluate(() => { delete window.__save; });
      assert.equal(await paste(mime), true);
      await page.waitForFunction(() => !!window.__save);
      assert.ok(await page.getByRole('button', { name: '发送', exact: true }).isDisabled());
      await page.evaluate(extension => window.__save({ ok: true, path: `D:/clipboard.${extension}` }), extension);
      await page.getByRole('button', { name: `移除附件：D:/clipboard.${extension}`, exact: true }).waitFor();
      await page.waitForFunction(() => !document.querySelector('button[aria-label="发送"]').disabled);
    }
    const saves = await page.evaluate(() => window.__saves.length);
    await paste('image/svg+xml');
    await page.getByText('剪贴板图片仅支持 PNG、JPEG、WebP、GIF。', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__saves.length), saves);
    console.log('PASS: supported image MIME types, unsupported format rejection, native text paste and source-draft ownership');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
