const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__calls = [];
      window.desktop = { droppedFilePaths: files => files.map(file => window.__invalid ? '' : `D:/files/${file.name}`), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => { window.__calls.push({ method, params }); return { ok: true, result: { data: [] } }; }, onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const drop = () => page.locator('.composer').evaluate(element => {
      const dataTransfer = new DataTransfer();
      for (const name of ['photo.png', 'notes.txt', 'photo.png']) dataTransfer.items.add(new File(['data'], name));
      const over = new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }); element.dispatchEvent(over);
      const event = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }); element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    assert.equal(await drop(), true);
    await page.getByRole('button', { name: '移除附件：D:/files/photo.png', exact: true }).waitFor();
    assert.equal(await page.locator('.attachment-list button[aria-label^="移除附件："]').count(), 2);
    await drop(); assert.equal(await page.locator('.attachment-list button[aria-label^="移除附件："]').count(), 2);
    assert.equal(await page.evaluate(() => window.__calls.some(call => call.method === 'turn/start')), false);
    await page.getByRole('button', { name: '新对话', exact: true }).click();
    await page.locator('.attachment-list').waitFor({ state: 'hidden' });
    await page.evaluate(() => { window.__invalid = true; });
    await drop();
    await page.getByText('无法读取拖入文件的本地路径，请使用添加附件。', { exact: true }).waitFor();
    assert.equal(await page.locator('.attachment-list button[aria-label^="移除附件："]').count(), 0);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-attachments-v1')).new), ['D:/files/photo.png', 'D:/files/notes.txt']);
    console.log('PASS: file drop prevents navigation, deduplicates, preserves draft ownership and rejects missing local paths');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
