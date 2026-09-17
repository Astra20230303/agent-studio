const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__calls = [];
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'parent', model: 'test', threads: [{ id: 'parent', remoteId: 'parent', title: 'Parent', messages: [], status: 'completed', updatedAt: new Date().toISOString() }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), request: async (method, params) => { window.__calls.push({ method, params }); return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, cwd: 'D:/repo', turns: [] } } : { data: [] } }; }, notify: async () => ({}), onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'thread/resume'));
    await page.evaluate(() => window.__notify({ method: 'item/started', params: { threadId: 'parent', turnId: 't', item: { id: 'm', type: 'mcpToolCall', server: 'search', tool: 'query', status: 'inProgress', arguments: { q: 'example' } } } }));
    await page.getByText('search · query · 运行中', { exact: true }).click();
    await page.getByText(/"q": "example"/).waitFor();
    await page.evaluate(() => window.__notify({ method: 'item/completed', params: { threadId: 'parent', turnId: 't', item: { id: 'm', type: 'mcpToolCall', status: 'completed', result: { content: [{ type: 'text', text: 'Search result' }] } } } }));
    await page.getByText('search · query · 已完成', { exact: true }).waitFor();
    await page.getByText('Search result', { exact: true }).waitFor();
    await page.evaluate(() => window.__notify({ method: 'item/completed', params: { threadId: 'parent', turnId: 't', item: { id: 'd', type: 'dynamicToolCall', tool: 'dynamic', status: 'completed', success: false, contentItems: [{ type: 'inputText', text: 'Failure detail' }] } } }));
    await page.getByText('dynamic · 失败', { exact: true }).click();
    await page.getByText('Failure detail', { exact: true }).waitFor();
    assert.equal(await page.locator('.tool-row').count(), 2);
    await page.evaluate(() => window.__notify({ method: 'item/completed', params: { threadId: 'parent', turnId: 't', item: { id: 'image', type: 'mcpToolCall', tool: 'screenshot', status: 'completed', result: { content: [{ type: 'image', mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1f8AAAAASUVORK5CYII=' }, { type: 'image', mimeType: 'image/svg+xml', data: 'YQ==' }] } } } }));
    await page.getByText('screenshot · 已完成', { exact: true }).click();
    await page.waitForFunction(() => document.querySelector('img[alt="工具返回的图片"]')?.naturalWidth === 1);
    await page.getByText('媒体无法预览，请查看结构化结果。', { exact: true }).waitFor();
    await page.evaluate(() => window.__notify({ method: 'item/completed', params: { threadId: 'parent', turnId: 't', item: { id: 'image', type: 'mcpToolCall', status: 'completed', result: { content: [{ type: 'image', mimeType: 'image/png', data: 'YQ==' }] } } } }));
    await page.getByText('媒体无法预览，请查看结构化结果。', { exact: true }).waitFor();
    await page.evaluate(() => window.__notify({ method: 'item/completed', params: { threadId: 'parent', turnId: 't', item: { id: 'image', type: 'mcpToolCall', status: 'completed', result: { content: [{ type: 'image', mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1f8AAAAASUVORK5CYII=' }] } } } }));
    await page.waitForFunction(() => document.querySelector('img[alt="工具返回的图片"]')?.naturalWidth === 1);
    assert.equal(await page.getByText('媒体无法预览，请查看结构化结果。', { exact: true }).count(), 0);
    console.log('PASS: MCP running/completed details and dynamic failure display');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
