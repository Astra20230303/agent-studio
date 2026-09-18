const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeThreadId: 'a', threads: [
        { id: 'a', remoteId: 'a', title: 'Thread A', messages: [], status: 'completed', updatedAt: new Date().toISOString() },
        { id: 'b', title: 'Local B', messages: [], status: 'completed', updatedAt: new Date().toISOString() },
      ] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = {
        connect: async () => ({ ok: true }), notify: async () => ({ ok: true }),
        request: async (method, params) => {
          if (method === 'thread/resume') {
            await new Promise(resolve => { window.__release = resolve; });
            window.__release = undefined;
            return { ok: true, result: { thread: { id: params.threadId, turns: [{ id: 't', status: 'completed', items: [
              { id: 'answer', type: 'agentMessage', text: 'Old answer' },
              { id: 'cmd', type: 'commandExecution', command: 'echo test', aggregatedOutput: 'old output', status: 'completed' },
            ] }] } } };
          }
          return { ok: true, result: { data: [] } };
        },
        onNotification: fn => { window.__notify = fn; return () => {}; },
        onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => !!window.__release);
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('unsent');
    await page.evaluate(() => {
      window.__notify({ method: 'item/completed', params: { threadId: 'a', turnId: 't', item: { id: 'answer', type: 'agentMessage', text: 'Fresh answer' } } });
      window.__notify({ method: 'item/completed', params: { threadId: 'a', turnId: 't', item: { id: 'cmd', type: 'commandExecution', command: 'echo test', aggregatedOutput: 'fresh output', status: 'completed' } } });
      window.__release();
    });
    await page.getByText('Fresh answer', { exact: true }).waitFor();
    await page.waitForFunction(() => !window.__release);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.getAttribute('aria-label') === '发送' && !button.disabled));
    // Read committed persisted state after restoration, rather than only the first render.
    await page.waitForFunction(() => {
      const thread = JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t => t.id === 'a');
      return thread.messages.some(m => m.id === 'tool-cmd' && m.tool.output === 'fresh output') && thread.status === 'completed';
    });
    assert.equal(await page.getByText('Old answer', { exact: true }).count(), 0);
    // A later explicit revisit may use a fresh snapshot when no events intervene.
    await page.getByRole('button', { name: 'Local B', exact: true }).click();
    await page.getByRole('button', { name: 'Thread A', exact: true }).click();
    await page.waitForFunction(() => !!window.__release);
    await page.evaluate(() => window.__release());
    await page.getByText('Old answer', { exact: true }).waitFor();
    assert.equal(await page.getByText('Fresh answer', { exact: true }).count(), 0);
    console.log('PASS: content-only events survive an older pending resume; later uncontested snapshot applies');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
