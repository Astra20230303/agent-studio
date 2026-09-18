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
    for (const fail of [false, true]) {
      const context = await browser.newContext(); const page = await context.newPage();
      const requests = [];
      page.on('request', request => requests.push(request.url()));
      await page.addInitScript(() => {
        window.desktop = { listTasks: async () => ({ ok: true, tasks: [] }), listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
        window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async () => ({ ok: true, result: { data: [] } }), onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
      });
      let release;
      const barrier = new Promise(resolve => { release = resolve; });
      await page.route('**/ScheduledPage-*.js', async route => { await barrier; if (fail) await route.abort(); else await route.continue(); });
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      const editor = page.getByRole('textbox', { name: '消息', exact: true });
      await editor.fill('Preserve draft across deferred page');
      assert.equal(requests.some(url => /ScheduledPage-/.test(url)), false, 'task JS and CSS must not load with chat');
      await page.getByRole('button', { name: '已安排', exact: true }).click();
      await page.getByText('正在加载已安排页面…', { exact: true }).waitFor();
      release();
      if (fail) {
        await page.getByText('无法加载已安排页面，请重新打开应用后再试。', { exact: true }).waitFor();
        await page.getByRole('button', { name: '返回聊天', exact: true }).click();
      } else {
        await page.getByRole('button', { name: '创建', exact: true }).waitFor();
        assert.ok(requests.some(url => /ScheduledPage-.*\.css$/.test(url)));
        await page.getByRole('button', { name: '新对话', exact: true }).click();
      }
      await editor.waitFor();
      if (fail) assert.equal(await editor.inputValue(), 'Preserve draft across deferred page');
      else assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-thread-drafts-v1')).new), 'Preserve draft across deferred page');
      await context.close();
    }
    console.log('PASS: production task resources load on demand, loading/failure keep navigation usable and drafts retained');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
