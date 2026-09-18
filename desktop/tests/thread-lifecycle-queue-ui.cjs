const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const operation of ['archive', 'delete']) {
      const page = await browser.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'a', title: 'Queued thread', status: 'running', updatedAt: '', messages: [{ id: 'm', role: 'assistant', content: 'History' }] }] }));
        window.__mutations = 0; window.__sent = 0;
        const write = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) { if (key === 'felix-turn-queue-v1' && window.__quota) throw Error('quota'); return write.call(this, key, value); };
        window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
        window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async method => {
          if (['thread/archive', 'thread/delete'].includes(method)) { window.__mutations++; return new Promise(resolve => { window.__finish = resolve; }); }
          if (method === 'turn/start') window.__sent++;
          return { ok: true, result: method === 'thread/resume' ? { thread: { turns: [{ id: 'live', status: 'inProgress', items: [] }] } } : { data: [] } };
        }, onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
      });
      await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
      const input = page.getByRole('textbox', { name: '消息', exact: true });
      await page.getByRole('button', { name: '本轮完成后发送', exact: true }).waitFor();
      await input.fill('Keep queued content');
      await page.getByRole('button', { name: '本轮完成后发送', exact: true }).click();
      const begin = async () => {
        if (operation === 'archive') await page.locator('.global-thread-toolbar').getByRole('button', { name: '归档', exact: true }).click();
        else {
          if (!await page.getByRole('alertdialog').count()) await page.locator('.global-thread-toolbar').getByRole('button', { name: '删除', exact: true }).click();
          await page.getByRole('alertdialog').getByRole('button', { name: '删除', exact: true }).click();
        }
      };
      await page.evaluate(() => { window.__quota = true; });
      await begin();
      await page.getByRole('button', { name: '重试保存队列', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__mutations), 0);
      await page.evaluate(() => { window.__quota = false; });
      await begin();
      await page.waitForFunction(() => window.__mutations === 1);
      await page.evaluate(() => window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id: 'live', status: 'completed' } } }));
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0].status), 'paused');
      await page.evaluate(() => window.__finish({ ok: false, error: 'Mutation rejected' }));
      await page.getByText(/Mutation rejected/).waitFor();
      assert.equal(await page.evaluate(() => window.__sent), 0);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0].text), 'Keep queued content');
      await begin();
      await page.waitForFunction(() => window.__mutations === 2);
      await page.evaluate(() => window.__finish({ ok: true, result: {} }));
      await page.locator('.global-thread-toolbar').waitFor({ state: 'detached' });
      const queue = await page.evaluate(() => JSON.parse(localStorage.getItem('felix-turn-queue-v1')));
      if (operation === 'delete') assert.deepEqual(queue, []);
      else { assert.equal(queue[0].status, 'paused'); assert.equal(queue[0].text, 'Keep queued content'); }
      assert.equal(await page.evaluate(() => window.__sent), 0);
      await page.close();
    }
    console.log('PASS: archive/delete persist queue pause before RPC, block dispatch, retain failures and clean successful deletion');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
