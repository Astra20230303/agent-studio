const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'a', title: 'Recovery', messages: [], status: 'completed', updatedAt: new Date().toISOString() }] }));
      window.__attempts = 0; window.__requests = []; window.__available = false;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => { window.__attempts++; return { ok: window.__available, error: 'Network unavailable' }; },
        request: async (method, params) => {
          window.__requests.push(method);
          return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, turns: [{ id: 'old', status: 'completed', items: [{ id: 'reply', type: 'agentMessage', text: 'Restored conversation' }] }] } } : { data: [] } };
        },
        notify: async () => ({ ok: true }), onNotification: () => () => {},
        onClosed: fn => { window.__close = fn; return () => {}; },
        onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    await input.fill('Keep my unsent draft');
    const reconnect = page.getByRole('button', { name: '重新连接', exact: true });
    await page.waitForFunction(() => window.__attempts === 4);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === '重新连接' && !button.disabled));
    await page.evaluate(() => {
      window.__available = true;
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('online'));
    });
    await reconnect.waitFor({ state: 'detached' });
    await page.getByText('Restored conversation', { exact: true }).waitFor();
    assert.equal(await input.inputValue(), 'Keep my unsent draft');
    assert.equal(await page.evaluate(() => window.__attempts), 5);
    assert.equal(await page.evaluate(() => window.__requests.includes('turn/start')), false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    assert.equal(await page.evaluate(() => window.__attempts), 5);
    // A later transport loss exhausts its own budget, then recovers again.
    await page.evaluate(() => { window.__available = false; window.__close(); });
    await page.waitForFunction(() => window.__attempts === 9);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === '重新连接' && !button.disabled));
    await page.evaluate(() => { window.__available = true; window.dispatchEvent(new Event('online')); });
    await reconnect.waitFor({ state: 'detached' });
    await page.waitForFunction(() => window.__requests.filter(method => method === 'thread/resume').length === 2);
    assert.equal(await page.evaluate(() => window.__attempts), 10);
    assert.equal(await input.inputValue(), 'Keep my unsent draft');
    assert.equal(await page.evaluate(() => window.__requests.includes('turn/start')), false);
    assert.deepEqual(errors, []);
    console.log('PASS: online event reconnects exhausted transport and restores conversation without sending draft');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
