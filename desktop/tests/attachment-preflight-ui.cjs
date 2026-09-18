const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { PNG } = require('pngjs');
const { validateImageInputs } = require('../electron/attachment-validation.cjs');
(async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-image-ui-'));
  const file = path.join(directory, 'broken.png'); await fs.writeFile(file, 'not a PNG');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let dispatches = 0;
  try {
    const page = await browser.newPage();
    await page.exposeFunction('validateRequest', async (method, params) => {
      try { await validateImageInputs(method, params); dispatches++; return { ok: true, result: { turn: { id: 'turn', status: 'inProgress' } } }; }
      catch (error) { return { ok: false, error: { message: error.message } }; }
    });
    await page.addInitScript(file => {
      window.desktop = { pickFiles: async () => [file], listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        if (method === 'thread/start') return { ok: true, result: { thread: { id: 'thread' } } };
        if (method === 'turn/start') return window.validateRequest(method, params);
        return { ok: true, result: { data: [] } };
      }, onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    }, file);
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '添加附件', exact: true }).click();
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Inspect image');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.getByText(/发送失败：图片附件无法读取或解码/).waitFor();
    assert.equal(dispatches, 0);
    assert.equal(await page.getByRole('textbox', { name: '消息', exact: true }).inputValue(), 'Inspect image');
    assert.equal(await page.getByRole('button', { name: `移除附件：${file}`, exact: true }).count(), 1);
    const png = new PNG({ width: 2, height: 2 }); png.data.fill(255); await fs.writeFile(file, PNG.sync.write(png));
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.getByRole('button', { name: '停止生成', exact: true }).waitFor();
    assert.equal(dispatches, 1);
    console.log('PASS: real PNG preflight retains draft/attachment on error and dispatches once after repair');
  } finally { await browser.close(); await fs.rm(directory, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
