const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');

(async () => {
  const dist = path.resolve(__dirname, '../dist');
  const server = http.createServer((req, res) => {
    const filename = path.resolve(dist, '.' + (req.url === '/' ? '/index.html' : req.url));
    if (!filename.startsWith(dist + path.sep) || !fs.existsSync(filename)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.css') ? 'text/css' : 'text/html');
    res.end(fs.readFileSync(filename));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const mode of ['success', 'failure', 'cancel']) {
      const fail = mode === 'failure';
      const context = await browser.newContext(); const page = await context.newPage();
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      await page.addInitScript(() => {
        localStorage.setItem('felix-attachments-v1', JSON.stringify({ new: ['D:/notes.txt'] }));
        window.desktop = { workspaceFile: async () => ({ ok: true, result: { text: 'Lazy preview loaded', revision: 'hash' } }), listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
        window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
      });
      let release;
      const barrier = new Promise(resolve => { release = resolve; });
      let blocked = fail;
      await page.route('**/ArtifactPreview-*.js', async route => { await barrier; if (blocked) await route.abort(); else await route.continue(); });
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      const editor = page.getByRole('textbox', { name: '消息', exact: true });
      await editor.fill('Preserve draft across deferred page');
      assert.equal(requests.some(url => /ArtifactPreview-/.test(url)), false, 'preview JS and CSS must not load with chat');
      const opener = page.getByRole('button', { name: '预览附件：D:/notes.txt', exact: true });
      await opener.click();
      await page.getByText('正在加载文件预览…', { exact: true }).waitFor();
      if (mode === 'cancel') {
        await page.getByRole('dialog', { name: '文件预览加载', exact: true }).press('Escape');
        assert.ok(await opener.evaluate(element => element === document.activeElement));
      }
      release();
      if (mode === 'cancel') {
        await page.waitForFunction(() => performance.getEntriesByType('resource').some(entry => /ArtifactPreview-.*\.js$/.test(entry.name) && entry.responseEnd > 0));
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.equal(await editor.inputValue(), 'Preserve draft across deferred page');
        await opener.click();
      }
      if (fail) {
        await page.getByText('无法加载文件预览，请重新打开应用后再试。', { exact: true }).waitFor();
        await page.getByRole('button', { name: '关闭预览', exact: true }).click();
        assert.equal(await editor.inputValue(), 'Preserve draft across deferred page');
        assert.ok(await opener.evaluate(element => element === document.activeElement));
        blocked = false;
        await page.reload();
        assert.equal(await editor.inputValue(), 'Preserve draft across deferred page');
        await opener.click();
      }
      const preview = page.getByRole('dialog', { name: '消息文件预览', exact: true });
      await preview.getByText('Lazy preview loaded', { exact: true }).waitFor();
      assert.ok(requests.some(url => /ArtifactPreview-.*\.css$/.test(url)));
      await preview.getByRole('button', { name: '关闭预览', exact: true }).click();
      await editor.waitFor();
      assert.equal(await editor.inputValue(), 'Preserve draft across deferred page');
      assert.ok(await opener.evaluate(element => element === document.activeElement));
      await context.close();
    }
    console.log('PASS: production preview loads on demand, failure remains closable, reload recovers with draft and focus preserved');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
