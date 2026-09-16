const { _electron: electron } = require('playwright');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ executablePath: require('electron'), args: [path.resolve(__dirname, '../electron/main.cjs')], env });
  try {
    app.on('console', message => { if (message.text().startsWith('REQUEST:')) console.log(message.text()); });
    await app.evaluate(() => {
      const originalFetch = globalThis.fetch;
      globalThis.remoteTestRequests = [];
      globalThis.fetch = (url, options) => {
        if (String(url).endsWith('/chat/completions')) {
          const body = JSON.parse(options.body);
          globalThis.remoteTestRequests.push({ model: body.model, tools: body.tools?.map(tool => tool.function.name), images: body.messages.flatMap(message => Array.isArray(message.content) ? message.content.filter(part => part.type === 'image_url') : []).length });
          console.log('REQUEST: ' + JSON.stringify(globalThis.remoteTestRequests.at(-1)));
        }
        return originalFetch(url, options);
      };
    });
    const page = await app.firstWindow();
    page.on('console', message => { if (message.text().startsWith('LIVE:')) console.log(message.text()); });
    await page.waitForTimeout(2500);
    const result = await page.evaluate(async model => {
      const events = [];
      let finish;
      const done = new Promise(resolve => finish = resolve);
      let id;
      window.codex.onServerRequest(e => console.log('LIVE: approval/request ' + JSON.stringify(e)));
      const unsub = window.codex.onNotification(e => {
        if (e.params?.threadId !== id) return;
        if (['item/started', 'error'].includes(e.method)) console.log('LIVE: ' + JSON.stringify(e));
        if (e.method === 'item/completed') events.push(e.params.item);
        if (e.method === 'turn/completed') finish(e.params.turn);
      });
      const response = await window.codex.request('thread/start', { model, modelProvider: 'minimax', sandbox: 'danger-full-access', approvalPolicy: 'never', ephemeral: true });
      if (!response.ok) throw new Error(JSON.stringify(response));
      id = response.result.thread.id;
      await window.codex.request('turn/start', { threadId: id, input: [{ type: 'text', text: '请使用 remote_desktop 连接远程桌面并截图，描述你实际看到的内容，然后仅把鼠标移动到截图坐标100,100。不点击、不输入、不修改文件。' }] });
      const timer = setTimeout(() => finish({ status: 'timeout' }), 180000);
      const turn = await done; clearTimeout(timer); unsub();
      if (turn.status === 'timeout') await window.codex.request('turn/interrupt', { threadId: id });
      return { turn, events };
    }, process.env.FELIX_TEST_MODEL || 'gpt-6-astra');
    console.log('Provider request metadata:', await app.evaluate(() => globalThis.remoteTestRequests));
    console.log(JSON.stringify(result, (key, value) => key === 'data' && typeof value === 'string' && value.length > 1000 ? '[image]' : value, 2));
    assert.equal(result.turn.status, 'completed');
    for (const action of ['connect', 'move']) assert.ok(result.events.some(e => e.type === 'mcpToolCall' && e.tool === 'remote_desktop' && e.arguments.type === action && e.status === 'completed' && !e.error && e.result?.content?.some(part => part.type === 'image')), `Missing successful ${action} with image`);
    assert.ok((await app.evaluate(() => globalThis.remoteTestRequests)).some(request => request.images >= 2), 'Model did not receive both observations');
  } finally { await app.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
