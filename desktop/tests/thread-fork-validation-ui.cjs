const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const action of ['分叉', '分支到新聊天']) {
      const page = await browser.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'source', threads: [{
          id: 'source', remoteId: 'remote-source', title: 'Source', status: 'completed', updatedAt: '',
          messages: [{ id: 'reply', turnId: 'original-turn', role: 'assistant', content: 'Original answer', createdAt: '2026-09-19T00:00:00Z' }],
        }] }));
        window.__calls = [];
        window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
        window.codex = {
          connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
            window.__calls.push({ method, params });
            if (method === 'thread/fork') {
              await new Promise(resolve => { window.__release = resolve; });
              return { ok: true, result: window.__response };
            }
            return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, turns: [] } } : { data: [] } };
          },
          onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
        };
      });
      await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
      const input = page.getByRole('textbox', { name: '消息', exact: true });
      await input.fill('Keep source draft');
      const source = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0]);
      let attempts = 0;
      for (const id of [123, ' ', 'remote-source', 'valid-branch']) {
        await page.evaluate(id => { window.__response = { thread: { id } }; window.__release = undefined; }, id);
        await page.getByRole('button', { name: action, exact: true }).evaluate(button => { button.click(); button.click(); });
        await page.waitForFunction(() => !!window.__release);
        assert.equal(await page.evaluate(() => window.__calls.filter(c => c.method === 'thread/fork').length), ++attempts);
        assert.ok(await page.getByRole('button', { name: '正在分叉…', exact: true }).isDisabled());
        await page.evaluate(() => window.__release());
        if (id !== 'valid-branch') {
          await page.getByText(/服务端分叉数据无效/).waitFor();
          await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent === '分叉' && !b.disabled));
          const state = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
          assert.equal(state.activeThreadId, 'source');
          assert.equal(state.threads.length, 1);
          assert.deepEqual(state.threads[0].messages, source.messages);
          assert.equal(state.threads[0].remoteId, source.remoteId);
          assert.equal(await input.inputValue(), 'Keep source draft');
        }
      }
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).activeThreadId === 'remote-valid-branch');
      const state = await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')));
      assert.equal(state.threads.length, 2);
      assert.deepEqual(state.threads.find(t => t.id === 'source').messages, source.messages);
      assert.deepEqual(state.threads.find(t => t.remoteId === 'valid-branch').messages, source.messages);
      const calls = await page.evaluate(() => window.__calls.filter(c => c.method === 'thread/fork'));
      assert.ok(calls.every(c => c.params.threadId === 'remote-source'));
      assert.ok(calls.every(c => c.params.lastTurnId === (action === '分叉' ? undefined : 'original-turn')));
      await page.getByRole('button', { name: 'Source', exact: true }).click();
      assert.equal(await input.inputValue(), 'Keep source draft');
      await page.close();
    }
    console.log('PASS: whole and reply forks reject malformed/source identity, preserve history/draft, deduplicate pending requests and retry');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
