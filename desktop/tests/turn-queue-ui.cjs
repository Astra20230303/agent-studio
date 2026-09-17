const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'a', title: 'A', messages: [], status: 'running', updatedAt: new Date().toISOString() }] }));
      window.__sent = []; window.__live = 'initial';
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => ({ ok: true }), notify: async () => ({ ok: true }),
        request: async (method, params) => {
          if (method === 'thread/resume') return { ok: true, result: { thread: { turns: [{ id: window.__live, status: 'inProgress', items: [] }] } } };
          if (method === 'turn/start') {
            window.__sent.push(params);
            if (window.__reject) return { ok: false, error: 'Rejected' };
            const id = `turn-${window.__sent.length}`; window.__live = id;
            window.__notify({ method: 'turn/started', params: { threadId: 'a', turn: { id, status: 'inProgress' } } });
            return { ok: true, result: { turn: { id, status: 'inProgress' } } };
          }
          return { ok: true, result: { data: [] } };
        },
        onNotification: fn => { window.__notify = fn; return () => {}; }, onClosed: fn => { window.__close = fn; return () => {}; },
        onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const input = page.getByRole('textbox', { name: '消息', exact: true });
    const add = page.getByRole('button', { name: '本轮完成后发送', exact: true });
    await add.waitFor();
    for (const text of ['first', 'second', 'cancel-me']) { await input.fill(text); await add.click(); }
    assert.equal(await page.evaluate(() => window.__sent.length), 0);
    await page.getByRole('button', { name: '取消排队：cancel-me', exact: true }).click();
    const finish = status => page.evaluate(status => window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id: window.__live, status } } }), status);
    await finish('completed');
    await page.waitForFunction(() => window.__sent.length === 1);
    assert.equal(await page.evaluate(() => window.__sent[0].input[0].text), 'first');
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__sent.length), 1);
    await finish('failed');
    await page.getByRole('button', { name: '继续队列', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__sent.length), 1);
    await page.evaluate(() => { window.__reject = true; });
    await page.getByRole('button', { name: '继续队列', exact: true }).click();
    await page.getByText(/发送未确认：Rejected/).waitFor();
    assert.equal(await page.evaluate(() => window.__sent.length), 2);
    await page.evaluate(() => { window.__reject = false; });
    await page.getByRole('button', { name: '继续队列', exact: true }).click();
    await page.waitForFunction(() => window.__sent.length === 3);
    assert.equal(await page.evaluate(() => window.__sent[2].input[0].text), 'second');
    await page.getByRole('region', { name: '待发送消息' }).waitFor({ state: 'hidden' });
    await input.fill('persisted'); await add.click();
    await page.reload();
    await page.getByRole('button', { name: '继续队列', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__sent.length), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: FIFO, cancellation, failed turn pause, rejected send retry, persisted queue without replay');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
