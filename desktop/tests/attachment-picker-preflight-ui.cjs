const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__validated = [];
      window.desktop = {
        pickFiles: async () => ['D:/broken.png', 'D:/notes.txt'],
        validateAttachment: async path => { window.__validated.push(path); return path.endsWith('.png') ? { ok: false, error: '图片附件无法读取或解码：broken.png。PNG 格式无效' } : { ok: true }; },
        listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }),
      };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
    await page.getByRole('button', { name: '添加附件', exact: true }).click();
    await page.getByText('图片附件无法读取或解码：broken.png。PNG 格式无效', { exact: true }).waitFor();
    assert.deepEqual(await page.locator('.attachment-chip').allTextContents(), ['📎 notes.txt×']);
    assert.deepEqual(await page.evaluate(() => window.__validated), ['D:/broken.png', 'D:/notes.txt']);
    console.log('PASS: attachment picker preflight rejects corrupt images, retains non-image files, and reports the exact decoder error');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
