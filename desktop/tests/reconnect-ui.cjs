const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__offline = true; window.__calls = 0; window.__requests = [];
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'remote-a', title: 'A', status: 'running', messages: [], updatedAt: new Date().toISOString() }] }));
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => { window.__calls++; return window.__offline ? { ok: false, error: 'Server unavailable' } : { ok: true }; },
        notify: async () => ({ ok: true }),
        request: async (method, params) => {
          window.__requests.push({ method, params });
          if (method === 'thread/resume') return { ok: true, result: { thread: { turns: [{ id: 'live', status: 'inProgress', items: [] }] } } };
          return { ok: true, result: { data: [] } };
        },
        onClosed: fn => { window.__close = fn; return () => {}; },
        onNotification: () => () => {}, onServerRequest: () => () => {}, onError: () => () => {}, onStderr: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const retry = page.getByRole('button', { name: '重新连接', exact: true });
    await page.waitForFunction(() => window.__calls >= 4);
    await page.waitForFunction(() => !document.querySelector('.connection-banner button')?.disabled);
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    await input.fill('Draft survives reconnect');
    await page.evaluate(() => { window.__offline = false; });
    await retry.click();
    await page.locator('.connection-banner').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: '停止生成', exact: true }).waitFor();
    const before = await page.evaluate(() => window.__calls);
    await page.evaluate(() => window.__close());
    await page.waitForFunction(count => window.__calls > count, before);
    await page.locator('.connection-banner').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: '停止生成', exact: true }).waitFor();
    assert.equal(await input.inputValue(), 'Draft survives reconnect');
    assert.equal(await page.evaluate(() => window.__requests.some(r => ['turn/start', 'turn/steer'].includes(r.method))), false);
    assert.deepEqual(errors, []);
    console.log('PASS: bounded auto retry, manual recovery, automatic reconnect, restored active turn, retained draft, no message replay');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
