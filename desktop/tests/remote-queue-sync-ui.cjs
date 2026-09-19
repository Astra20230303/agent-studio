const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: ['a','b'].map(id => ({ id, remoteId: id, title: `Queue ${id}`, messages: [], status: 'completed', updatedAt: new Date().toISOString() })) }));
      window.__listeners = new Set(); window.__closes = new Set(); window.__reads = []; window.__version = 0;
      window.__changed = threadId => window.__listeners.forEach(fn => fn({ method: 'thread/queue/changed', params: { threadId } }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => { if (window.__offline) await new Promise(() => {}); return { ok: true }; }, notify: async () => ({ ok: true }),
        request: async (method, params) => {
          if (method === 'thread/resume') return { ok: true, result: { thread: { id: params.threadId, turns: [] } } };
          if (method === 'thread/queue/list') {
            window.__reads.push(params.threadId);
            const text = `row-${params.threadId}-${window.__version}`;
            if (window.__hold) await new Promise(resolve => { window.__release = resolve; });
            return { ok: true, result: { data: [{ id: 'q', input: [{ type: 'text', text }], clientUserMessageId: 'client' }] } };
          }
          if (method === 'thread/queue/add') {
            await new Promise(resolve => { window.__finishAdd = resolve; });
            return { ok: true, result: {} };
          }
          return { ok: true, result: { data: [] } };
        },
        onNotification: fn => { window.__listeners.add(fn); return () => window.__listeners.delete(fn); },
        onClosed: fn => { window.__closes.add(fn); return () => window.__closes.delete(fn); },
        onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const panel = page.getByRole('region', { name: '服务端排队消息', exact: true });
    await panel.getByText('row-a-0', { exact: true }).waitFor();
    const initial = await page.evaluate(() => window.__reads.length);
    await page.evaluate(() => { window.__changed('b'); window.__changed(undefined); });
    assert.equal(await page.evaluate(() => window.__reads.length), initial);
    await page.evaluate(() => { window.__version = 1; window.__hold = true; window.__changed('a'); });
    await page.waitForFunction(() => !!window.__release);
    await page.evaluate(() => { window.__version = 2; for (let i = 0; i < 10; i++) window.__changed('a'); });
    assert.equal(await page.evaluate(() => window.__reads.length), initial + 1);
    await page.evaluate(() => { window.__hold = false; window.__release(); });
    await panel.getByText('row-a-2', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__reads.length), initial + 2);
    await panel.getByRole('textbox', { name: '服务端排队消息', exact: true }).fill('queued text');
    await panel.getByRole('button', { name: '加入队列', exact: true }).click();
    await page.waitForFunction(() => !!window.__finishAdd);
    await page.evaluate(() => { window.__version = 3; window.__changed('a'); window.__finishAdd(); });
    await panel.getByText('row-a-3', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Queue b', exact: true }).click();
    await panel.getByText('row-b-3', { exact: true }).waitFor();
    const afterSwitch = await page.evaluate(() => window.__reads.length);
    await page.evaluate(() => window.__changed('a'));
    assert.equal(await page.evaluate(() => window.__reads.length), afterSwitch);
    await page.evaluate(() => { window.__version = 4; window.__changed('b'); });
    await panel.getByText('row-b-4', { exact: true }).waitFor();
    await page.evaluate(() => { window.__offline = true; window.__closes.forEach(fn => fn({})); });
    await panel.getByText('row-b-4', { exact: true }).waitFor({ state: 'hidden' });
    const disconnected = await page.evaluate(() => window.__reads.length);
    await page.evaluate(() => window.__changed('b'));
    assert.equal(await page.evaluate(() => window.__reads.length), disconnected);
    assert.deepEqual(errors, []);
    console.log('PASS: remote queue notifications coalesce, refresh after writes and respect thread/connection lifetimes');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
