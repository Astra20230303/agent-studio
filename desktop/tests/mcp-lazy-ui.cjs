const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
(async () => {
  const dist = path.resolve(__dirname, '../dist');
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(req.url);
    const file = path.resolve(dist, '.' + (req.url === '/' ? '/index.html' : req.url));
    if (!file.startsWith(dist + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
    fs.createReadStream(file).pipe(res);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    let chunkRequests = 0;
    await page.route('**/assets/McpForm-*.js', route => { chunkRequests++; return route.abort(); });
    await page.addInitScript(() => {
      window.__responses = []; window.__fail = true;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), respond: async (id, result) => { if (window.__fail) return { ok: false, error: 'Retry cancellation' }; window.__responses.push({ id, result }); return { ok: true }; }, onNotification: () => () => {}, onServerRequest: fn => { window.__ask = fn; return () => {}; }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.__ask);
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(chunkRequests, 0);
    assert.equal(requests.some(url => url.includes('McpForm-')), false);
    await page.evaluate(() => window.__ask({ id: 1, method: 'mcpServer/elicitation/request', params: { mode: 'form', requestedSchema: { type: 'object', properties: {} } } }));
    await page.getByRole('dialog', { name: 'MCP 表单加载失败' }).waitFor();
    assert.equal(chunkRequests, 1);
    await page.getByRole('button', { name: '取消请求' }).click();
    await page.getByRole('alert').filter({ hasText: 'Retry cancellation' }).waitFor();
    await page.evaluate(() => { window.__fail = false; });
    await page.getByRole('button', { name: '取消请求' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => window.__responses), [{ id: 1, result: { action: 'cancel', content: null } }]);
    await page.unroute('**/assets/McpForm-*.js');
    await page.reload(); await page.waitForFunction(() => window.__ask);
    await page.evaluate(() => { window.__fail = false; window.__ask({ id: 2, method: 'mcpServer/elicitation/request', params: { mode: 'form', requestedSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } }); });
    await page.getByRole('textbox', { name: 'name', exact: true }).fill('Production form');
    await page.getByRole('button', { name: '提交', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(await page.evaluate(() => window.__responses), [{ id: 2, result: { action: 'accept', content: { name: 'Production form' } } }]);
    assert.equal(requests.some(url => url.includes('McpForm-')), true);
    console.log('PASS: lazy form module failure preserves app and supports cancel retry');
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
