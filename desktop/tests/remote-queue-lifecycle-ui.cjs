const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: ['a','b'].map(id => ({ id, remoteId: id, title: `Queue ${id}`, messages: [], status: 'completed', updatedAt: new Date().toISOString() })) }));
      window.__calls = []; window.__reads = []; window.__closes = new Set(); window.__hold = true;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => { if (window.__offline) await new Promise(() => {}); return { ok: true }; }, notify: async () => ({ ok: true }),
        request: async (method, params) => {
          window.__calls.push({ method, params });
          if (method === 'thread/resume') return { ok: true, result: { thread: { id: params.threadId, turns: [] } } };
          if (method === 'thread/queue/list') {
            if (window.__hold) return new Promise(resolve => window.__reads.push({ threadId: params.threadId, resolve }));
            if (window.__failRead) return { ok: false, error: 'read unavailable' };
            return { ok: true, result: { data: [{ id: 'q-' + params.threadId, input: [{ type: 'text', text: 'row-' + params.threadId }], clientUserMessageId: 'client' }] } };
          }
          if (method === 'thread/queue/add') return new Promise(resolve => { window.__finishAdd = () => resolve({ ok: true, result: {} }); });
          return { ok: true, result: { data: [] } };
        },
        onNotification: () => () => {}, onClosed: fn => { window.__closes.add(fn); return () => window.__closes.delete(fn); },
        onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
      window.__resolveReads = id => window.__reads.filter(read => read.threadId === id).forEach(read => read.resolve({ ok: true, result: { data: [{ id: 'q-' + id, input: [{ type: 'text', text: 'row-' + id }], clientUserMessageId: 'client' }] } }));
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const panel = page.getByRole('region', { name: '服务端排队消息', exact: true });
    await page.waitForFunction(() => window.__reads.some(read => read.threadId === 'a'));
    await page.getByRole('button', { name: 'Queue b', exact: true }).click();
    await page.waitForFunction(() => window.__reads.some(read => read.threadId === 'b'));
    await page.evaluate(() => window.__resolveReads('b'));
    await panel.getByText('row-b', { exact: true }).waitFor();
    await page.evaluate(() => window.__resolveReads('a'));
    assert.equal(await panel.getByText('row-a', { exact: true }).count(), 0);
    await page.evaluate(() => { window.__hold = false; });
    const input = panel.getByRole('textbox', { name: '服务端排队消息', exact: true });
    await input.fill('first draft');
    await panel.getByRole('button', { name: '加入队列', exact: true }).click();
    await page.waitForFunction(() => !!window.__finishAdd);
    await input.fill('next draft');
    await input.press('Enter'); // Form submission must honor the same in-flight lock as the button.
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'thread/queue/add').length), 1);
    await page.evaluate(() => { window.__failRead = true; window.__finishAdd(); });
    await panel.getByText(/消息已加入服务端队列；刷新失败/).waitFor();
    assert.equal(await input.inputValue(), 'next draft');
    assert.equal(await panel.getByRole('button', { name: '删除', exact: true }).count(), 0);
    await page.evaluate(() => { window.__failRead = false; });
    await panel.getByRole('button', { name: '刷新', exact: true }).click();
    await panel.getByText('row-b', { exact: true }).waitFor();
    await page.evaluate(() => { window.__finishAdd = undefined; });
    await panel.getByRole('button', { name: '加入队列', exact: true }).click();
    await page.waitForFunction(() => !!window.__finishAdd);
    await page.getByRole('button', { name: 'Queue a', exact: true }).click();
    await panel.getByText('row-a', { exact: true }).waitFor();
    await input.fill('draft for a');
    const readsBefore = await page.evaluate(() => window.__calls.filter(call => call.method === 'thread/queue/list').length);
    await page.evaluate(() => window.__finishAdd());
    assert.equal(await input.inputValue(), 'draft for a');
    assert.equal(await panel.getByText('row-b', { exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'thread/queue/list').length), readsBefore);
    await page.evaluate(() => { window.__offline = true; window.__closes.forEach(fn => fn({})); });
    await panel.getByText('row-a', { exact: true }).waitFor({ state: 'hidden' });
    assert.ok(await panel.getByRole('button', { name: '加入队列', exact: true }).isDisabled());
    await input.press('Enter');
    assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'thread/queue/add').length), 2);
    assert.deepEqual(errors, []);
    console.log('PASS: thread isolation, delayed reads, draft preservation, operation lock, refresh failure and disconnect');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
