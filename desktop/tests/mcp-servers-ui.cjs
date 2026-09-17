const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const listeners = new Set(); window.__notify = event => listeners.forEach(fn => fn(event));
      window.__calls = []; window.__opened = []; window.__failReload = true;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), openExternal: async url => window.__opened.push(url) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'mcpServerStatus/list') return { ok: true, result: params.cursor ? { data: [{ name: 'local', authStatus: 'unsupported', runtimeStatus: 'connected', tools: { read: {} } }] } : { data: [{ name: 'cloud', authStatus: 'notLoggedIn', runtimeStatus: 'authenticationRequired', toolsError: 'Authentication needed', tools: {} }], nextCursor: 'page2' } };
        if (method === 'mcpServer/oauth/login') { if (window.__early) window.__notify({ method: 'mcpServer/oauthLogin/completed', params: { name: 'cloud', success: true, threadId: null } }); return { ok: true, result: { authorizationUrl: 'https://example.com/login?state=test' } }; }
        if (method === 'config/mcpServer/reload' && window.__failReload) return { ok: false, error: 'Reload failed' };
        return { ok: true, result: { data: [], marketplaces: [] } };
      }, onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
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
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
