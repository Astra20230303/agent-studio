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
    for (const failure of [null, 'js', 'css']) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      let release;
      const barrier = new Promise(resolve => { release = resolve; });
      await page.route('**/TerminalPanel-*', async route => {
        await barrier;
        if (failure && route.request().url().endsWith('.' + failure)) await route.abort();
        else await route.continue();
      });
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      const editor = page.getByRole('textbox', { name: '消息', exact: true });
      await editor.fill('Draft survives terminal loading');
      assert.equal(requests.some(url => /TerminalPanel-/.test(url)), false);
      await page.getByRole('button', { name: '打开终端', exact: true }).click();
      await page.getByText('正在加载终端…', { exact: true }).waitFor();
      await page.getByRole('button', { name: '隐藏终端', exact: true }).click();
      assert.equal(await page.getByRole('region', { name: '终端', exact: true }).count(), 0);
      release();
      await page.getByRole('button', { name: '打开终端', exact: true }).click();
      if (failure) await page.getByRole('alert').filter({ hasText: '无法加载终端' }).waitFor();
      else await page.getByRole('button', { name: '新建终端', exact: true }).waitFor();
      assert.equal(await editor.inputValue(), 'Draft survives terminal loading');
      await editor.fill('Still editable');
      await page.getByRole('button', { name: '隐藏终端', exact: true }).click();
      await page.getByRole('button', { name: '设置', exact: true }).click();
      await page.getByRole('button', { name: '返回应用', exact: true }).click();
      assert.equal(await editor.inputValue(), 'Still editable');
      await context.close();
    }
    console.log('PASS: terminal deferred loading, JS/CSS failures, hide/reopen and chat draft/navigation isolation');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
