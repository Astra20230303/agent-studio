const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', projects: [], threads: [] }));
      const listeners = new Set(); window.__notify = event => listeners.forEach(fn => fn(event));
      window.__calls = []; window.__opened = []; window.__failReload = true;
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }), openExternal: async url => window.__opened.push(url) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'thread/start') return { ok: true, result: { thread: { id: 'resource-chat', turns: [] } } };
        if (method === 'turn/start') return { ok: true, result: { turn: { id: 'resource-turn', status: 'completed' } } };
        if (method === 'mcpServerStatus/list' && params.detail === 'full') return { ok: true, result: { data: [{ name: 'local', authStatus: 'unsupported', resources: [{ uri: 'fixture://readme', name: 'Readme' }], resourceTemplates: [{ uriTemplate: 'fixture://notes/{id}', name: 'Notes' }] }] } };
        if (method === 'mcpServer/resource/read') {
          if (params.uri === 'fixture://slow') return await new Promise(resolve => { window.__resolveResource = () => resolve({ ok: true, result: { contents: [{ uri: params.uri, text: 'Stale resource result' }] } }); });
          if (!window.__resourceRetried) { window.__resourceRetried = true; return { ok: false, error: 'Resource temporarily unavailable' }; }
          return { ok: true, result: { contents: [{ uri: params.uri, text: '<script>unsafe()</script>Resource text' }] } };
        }
        if (method === 'mcpServerStatus/list') return { ok: true, result: params.cursor ? { data: [{ name: 'local', authStatus: 'unsupported', runtimeStatus: 'connected', tools: { read: {} } }] } : { data: [{ name: 'cloud', authStatus: 'notLoggedIn', runtimeStatus: 'authenticationRequired', toolsError: 'Authentication needed', tools: {} }], nextCursor: 'page2' } };
        if (method === 'mcpServer/oauth/login') { if (window.__early) window.__notify({ method: 'mcpServer/oauthLogin/completed', params: { name: 'cloud', success: true, threadId: null } }); return { ok: true, result: { authorizationUrl: 'https://example.com/login?state=test' } }; }
        if (method === 'config/mcpServer/reload' && window.__failReload) return { ok: false, error: 'Reload failed' };
        return { ok: true, result: { data: [], marketplaces: [] } };
      }, onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Existing resource draft');
    await page.getByRole('button', { name: '插件', exact: true }).click();
    await page.getByRole('button', { name: '管理 MCP 服务' }).click();
    await page.getByRole('heading', { name: 'local', exact: true }).waitFor();
    await page.getByRole('button', { name: '登录 cloud', exact: true }).click();
    await page.getByRole('button', { name: '打开 cloud 登录页面' }).click();
    assert.deepEqual(await page.evaluate(() => window.__opened), ['https://example.com/login?state=test']);
    await page.evaluate(() => window.__notify({ method: 'mcpServer/oauthLogin/completed', params: { name: 'cloud', success: true, threadId: null } }));
    await page.getByRole('status').filter({ hasText: 'cloud 登录成功' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '打开 cloud 登录页面' }).count(), 0);
    await page.getByRole('button', { name: '重新加载 MCP 配置' }).click();
    await page.getByRole('alert').filter({ hasText: 'Reload failed' }).waitFor();
    await page.evaluate(() => { window.__failReload = false; });
    await page.getByRole('button', { name: '重新加载 MCP 配置' }).click();
    await page.getByRole('status').filter({ hasText: '已请求重新加载' }).waitFor();
    assert.ok(await page.evaluate(() => window.__calls.some(call => call.params?.cursor === 'page2')));
    await page.evaluate(() => { window.__early = true; });
    await page.getByRole('button', { name: '登录 cloud', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'cloud 登录成功' }).waitFor();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(button => button.textContent === '登录 cloud')?.disabled);
    assert.equal(await page.getByRole('button', { name: '打开 cloud 登录页面' }).count(), 0);
    console.log('PASS: MCP pagination, OAuth link, completion refresh and reload retry');
    await page.getByRole('checkbox', { name: '显示资源目录' }).check();
    await page.getByRole('button', { name: 'Readme', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Resource temporarily unavailable' }).waitFor();
    await page.getByRole('button', { name: '读取资源', exact: true }).click();
    await page.locator('.tool-output').filter({ hasText: '<script>unsafe()</script>Resource text' }).waitFor();
    assert.equal(await page.locator('[aria-label="资源内容"] script').count(), 0);
    await page.getByLabel('local 资源 URI').fill('fixture://notes/42');
    await page.getByRole('button', { name: '读取资源', exact: true }).click();
    await page.getByLabel('资源内容').getByText('fixture://notes/42', { exact: true }).waitFor();
    await page.getByLabel('local 资源 URI').fill('fixture://slow');
    await page.getByRole('button', { name: '读取资源', exact: true }).click();
    await page.waitForFunction(() => typeof window.__resolveResource === 'function');
    await page.getByRole('button', { name: '刷新 MCP 状态', exact: true }).click();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(button => button.textContent === '刷新 MCP 状态')?.disabled);
    await page.evaluate(async () => { window.__resolveResource(); await new Promise(resolve => setTimeout(resolve, 50)); });
    assert.equal(await page.getByLabel('资源内容').count(), 0, 'Refresh must discard a previous inventory read');
    await page.getByRole('button', { name: 'Readme', exact: true }).click();
    await page.getByLabel('资源内容').getByText('fixture://readme', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: '显示资源目录' }).uncheck();
    assert.equal(await page.getByLabel('资源内容').count(), 0);
    console.log('PASS: MCP resource discovery, read failure/retry, literal text, custom URI, stale-read isolation and dismissal');
    await page.getByRole('checkbox', { name: '显示资源目录' }).check();
    await page.getByRole('button', { name: 'Readme', exact: true }).click();
    await page.getByRole('button', { name: '加入聊天草稿', exact: true }).click();
    const draft = await page.getByRole('textbox', { name: '消息', exact: true }).inputValue();
    assert.ok(draft.startsWith('Existing resource draft\n\nMCP resource snapshot:\n'));
    assert.deepEqual(JSON.parse(draft.split('MCP resource snapshot:\n')[1]), { server: 'local', uri: 'fixture://readme', text: '<script>unsafe()</script>Resource text' });
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'turn/start').length), 0);
    await page.getByRole('textbox', { name: '消息', exact: true }).press('Enter');
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'turn/start'));
    const sent = await page.evaluate(() => window.__calls.find(call => call.method === 'turn/start').params.input);
    assert.deepEqual(sent, [{ type: 'text', text: draft }]);
    console.log('PASS: resource snapshot preserves draft and provenance, waits for explicit send and reaches turn input');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
