const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'a', title: 'Queue a', messages: [], status: 'completed', updatedAt: new Date().toISOString() }] }));
      window.__order = ['first', 'second', 'third']; window.__reorders = []; window.__reject = true;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => ({ ok: true }), notify: async () => ({ ok: true }),
        request: async (method, params) => {
          if (method === 'thread/resume') return { ok: true, result: { thread: { id: params.threadId, turns: [] } } };
          if (method === 'thread/queue/list') {
            const ids = params.cursor ? window.__order.slice(1) : window.__order.slice(0, 1);
            return { ok: true, result: { data: ids.map(id => ({ id, input: [{ type: 'text', text: 'row-' + id }], clientUserMessageId: 'client-' + id })), nextCursor: params.cursor ? null : 'page-two' } };
          }
          if (method === 'thread/queue/reorder') {
            window.__reorders.push(params);
            if (window.__reject) return { ok: false, error: 'queue changed, refresh' };
            await new Promise(resolve => { window.__release = resolve; });
            window.__order = params.queuedSubmissionIds;
            return { ok: true, result: {} };
          }
          return { ok: true, result: { data: [] } };
        },
        onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const panel = page.getByRole('region', { name: '服务端排队消息', exact: true });
    await panel.getByText('row-third', { exact: true }).waitFor();
    const order = () => panel.locator(':scope > div > span').allTextContents();
    assert.ok(await panel.getByRole('button', { name: '上移服务端消息 first', exact: true }).isDisabled());
    assert.ok(await panel.getByRole('button', { name: '下移服务端消息 third', exact: true }).isDisabled());
    await panel.getByRole('button', { name: '上移服务端消息 second', exact: true }).click();
    await panel.getByText(/queue changed, refresh/).waitFor();
    assert.deepEqual(await order(), ['row-first', 'row-second', 'row-third']);
    await page.evaluate(() => { window.__reject = false; });
    await panel.getByRole('button', { name: '上移服务端消息 second', exact: true }).click();
    await page.waitForFunction(() => !!window.__release);
    assert.ok(await panel.getByRole('button', { name: '下移服务端消息 first', exact: true }).isDisabled());
    assert.deepEqual(await order(), ['row-first', 'row-second', 'row-third']);
    await page.evaluate(() => window.__release());
    await panel.getByText('队列顺序已保存', { exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('.remote-thread-queue > div > span')?.textContent === 'row-second');
    assert.deepEqual(await order(), ['row-second', 'row-first', 'row-third']);
    assert.deepEqual(await page.evaluate(() => window.__reorders), Array(2).fill({ threadId: 'a', queuedSubmissionIds: ['second', 'first', 'third'] }));
    assert.deepEqual(errors, []);
    console.log('PASS: full paginated queue reorder, boundaries, failure and mutation lock');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
