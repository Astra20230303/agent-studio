const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { CodexRpc } = require('../electron/codex-rpc.cjs');
const { findCommand, compatibilityCatalog } = require('../electron/codex-server.cjs');
const { startMiniMaxAdapter } = require('../electron/minimax-adapter.cjs');
const { userInput } = require('../src/attachments.ts');
const { ImageProcessing } = require('../electron/image-processing.cjs');
const { chromium } = require('playwright');
test('real local image attachment reaches the Provider as image pixels', { timeout: 30000 }, async t => {
  const root = path.resolve(__dirname, '../..');
  const cache = path.join(root, '.project-cache/tmp'); fs.mkdirSync(cache, { recursive: true });
  const profile = fs.mkdtempSync(path.join(cache, 'image-live-'));
  const imageProcessing = new ImageProcessing({ dataRoot: profile });
  t.after(() => imageProcessing.close());
  const picture = path.join(profile, 'picture.png');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 128, height: 128 } });
  await page.setContent('<body style="margin:0;background:#ff0000"><div style="width:64px;height:128px;background:#00ff00"></div></body>');
  await page.screenshot({ path: picture });
  const jpeg = path.join(profile, 'second image.jpg');
  await page.screenshot({ path: jpeg, type: 'jpeg', quality: 95 });
  const webp = path.join(profile, 'third.webp'), gif = path.join(profile, 'fourth.gif');
  await require('sharp')(picture).webp({ lossless: true }).toFile(webp);
  await require('sharp')(picture).gif().toFile(gif);
  const requests = [], events = [], authorization = [];
  const model = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    requests.push(JSON.parse(raw));
    authorization.push(req.headers.authorization);
    const content = 'Image request received.';
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end('data: ' + JSON.stringify({ choices: [{ delta: { content }, finish_reason: 'stop' }] }) + '\n\ndata: [DONE]\n\n');
  });
  model.listen(0, '127.0.0.1'); await once(model, 'listening');
  const adapter = startMiniMaxAdapter({ port: 0, apiKey: 'test', upstream: `http://127.0.0.1:${model.address().port}` }); await once(adapter, 'listening');
  const settings = [`model_catalog_json=${JSON.stringify(compatibilityCatalog(root, profile))}`, 'model_providers.minimax.name="MiniMax"', 'model_providers.minimax.wire_api="responses"', `model_providers.minimax.base_url="http://127.0.0.1:${adapter.address().port}/v1"`, 'web_search="disabled"'];
  const child = spawn(findCommand(root).command, [...settings.flatMap(value => ['-c', value]), 'app-server', '--stdio'], { cwd: profile, windowsHide: true, env: { ...process.env, CODEX_HOME: profile } });
  const exited = once(child, 'exit'); const rpc = new CodexRpc(child);
  const timer = setTimeout(() => rpc.close(), 25000);
  rpc.on('notification', event => events.push(event));
  try {
    await rpc.request('initialize', { clientInfo: { name: 'compact_test', version: '1' }, capabilities: { experimentalApi: true } }); rpc.notify('initialized', {});
    const { thread } = await rpc.request('thread/start', { cwd: profile, model: 'MiniMax-M2.1', modelProvider: 'minimax', approvalPolicy: 'never', sandbox: 'read-only' });
    const run = async (method, params) => {
      const done = new Promise((resolve, reject) => {
        const closed = error => { rpc.off('notification', listener); reject(error); };
        const listener = event => {
          if (event.method !== 'turn/completed' || event.params.threadId !== thread.id) return;
          rpc.off('notification', listener); rpc.off('closed', closed);
          event.params.turn.status === 'completed' ? resolve() : reject(Error(JSON.stringify(event.params.turn)));
        };
        rpc.on('notification', listener); rpc.once('closed', closed);
      });
      done.catch(() => {}); await rpc.request(method, { threadId: thread.id, ...params }); await done;
    };
    const input = userInput('Inspect the attached image.', [], [picture, jpeg, webp, gif]);
    await imageProcessing.validate('turn/start', { input });
    await run('turn/start', { input });
    assert.equal(requests.length, 1);
    assert.deepEqual(authorization, ['Bearer test']);
    const parts = requests[0].messages.flatMap(message => Array.isArray(message.content) ? message.content : []);
    assert.ok(JSON.stringify(requests[0].messages).includes('Inspect the attached image.'));
    const images = parts.filter(part => part.type === 'image_url');
    assert.equal(images.length, 4);
    for (const image of images) {
    assert.match(image.image_url.url, /^data:image\/(png|jpeg|webp|gif);base64,/);
    const pixels = Buffer.from(image.image_url.url.split(',')[1], 'base64');
    assert.ok(pixels.length > 30);
    const decoded = await page.evaluate(async url => {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      return { width: image.width, height: image.height, left: [...context.getImageData(10, 10, 1, 1).data], right: [...context.getImageData(100, 10, 1, 1).data] };
    }, image.image_url.url);
    assert.equal(decoded.width, 128); assert.equal(decoded.height, 128);
    assert.ok(decoded.left[1] > 240 && decoded.left[0] < 15);
    assert.ok(decoded.right[0] > 240 && decoded.right[1] < 15);
    }
    assert.ok(events.some(event => event.method === 'item/completed' && event.params.item.type === 'agentMessage' && event.params.item.text.includes('Image request received')));
  } finally {
    clearTimeout(timer); rpc.close(); await exited;
    adapter.closeAllConnections(); await new Promise(resolve => adapter.close(resolve));
    model.closeAllConnections(); await new Promise(resolve => model.close(resolve));
  }
});
