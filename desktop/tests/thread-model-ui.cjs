const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('thread-model-seeded')) {
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'model-a', activeThreadId: 'a', threads: ['a', 'b'].map(id => ({ id, remoteId: id, title: 'Chat ' + id, messages: [], status: 'completed', updatedAt: '' })) }));
        sessionStorage.setItem('thread-model-seeded', 'true');
      }
      window.__calls = []; const listeners = new Set();
      window.__notify = event => listeners.forEach(fn => fn(event));
      window.desktop = { listModels: async () => ({ ok: true, models: ['model-a', 'model-b'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        return { ok: true, result: method === 'thread/resume' ? { model: 'model-a', thread: { id: params.threadId, turns: [] } } : method === 'turn/start' ? { turn: { id: 'turn', status: 'inProgress' } } : { data: [] } };
      }, onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const picker = page.getByRole('button', { name: '选择模型', exact: true });
    await picker.getByText('model-a', { exact: true }).waitFor();
    await picker.click(); await page.getByRole('button', { name: 'model-b', exact: true }).click();
    await page.getByRole('button', { name: 'Chat b', exact: true }).click();
    await picker.getByText('model-a', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Chat a', exact: true }).click();
    await picker.getByText('model-b', { exact: true }).waitFor();
    await page.reload();
    await picker.getByText('model-b', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Use my selected model');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'turn/start'));
    assert.equal(await page.evaluate(() => window.__calls.find(call => call.method === 'turn/start').params.model), 'model-b');
    await page.evaluate(() => window.__notify({ method: 'turn/started', params: { threadId: 'a', turn: { id: 'turn' } } }));
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Queued selected model');
    await page.getByRole('button', { name: '本轮完成后发送', exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-turn-queue-v1'))[0].model), 'model-b');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).model), 'model-a');
    await page.evaluate(() => {
      window.desktop.listModels = async () => ({ ok: true, models: ['model-a'] });
      window.dispatchEvent(new Event('provider-changed'));
    });
    await picker.getByText('model-b（不可用）', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(thread => thread.id === 'a').model), 'model-b');
    await page.evaluate(() => window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id: 'turn', status: 'failed' } } }));
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Do not silently switch');
    assert.ok(await page.getByRole('button', { name: '发送', exact: true }).isDisabled());
    console.log('PASS: per-thread model isolation, reload, actual turn request and queued model snapshot');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
