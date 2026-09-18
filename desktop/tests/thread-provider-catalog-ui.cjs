const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__calls = []; window.__checks = [];
      window.desktop = {
        listProviders: async () => [{ id: 'a', name: 'Alpha', enabled: true }, { id: 'b', name: 'Beta' }],
        listModels: async input => ({ ok: true, models: [input?.providerId === 'b' ? 'beta-model' : 'alpha-model'] }),
        providerStatus: async id => { window.__checks.push(id); return { keyConfigured: id === 'b' }; },
        getProjectRoot: async () => '.',
      };
      window.codex = {
        connect: async () => ({ ok: true }), notify: async () => ({}),
        request: async (method, params) => {
          window.__calls.push({ method, params });
          if (method === 'thread/start') return { ok: true, result: { thread: { id: 'remote-b' } } };
          if (method === 'thread/resume') return { ok: true, result: { model: 'beta-model', thread: { id: params.threadId, turns: [] } } };
          if (method === 'turn/start') return { ok: true, result: { turn: { id: 'turn-b', status: 'inProgress' } } };
          return { ok: true, result: { data: [] } };
        },
        onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {},
      };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('combobox', { name: '会话渠道', exact: true }).selectOption('b');
    await page.waitForFunction(() => document.querySelector('.model-button')?.textContent.includes('beta-model'));
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Use Beta');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'turn/start'));
    const calls = await page.evaluate(() => window.__calls);
    assert.equal(calls.find(call => call.method === 'thread/start').params.providerId, 'b');
    assert.equal(calls.find(call => call.method === 'turn/start').params.model, 'beta-model');
    assert.equal(await page.evaluate(() => window.__checks.at(-1)), 'b');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.some(thread => thread.providerId === 'b'));
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.model-button')?.textContent.includes('beta-model'));
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Continue Beta');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'turn/start'));
    const resumed = await page.evaluate(() => window.__calls);
    assert.equal(resumed.some(call => call.method === 'thread/start'), false);
    assert.equal(resumed.find(call => call.method === 'turn/start').params.threadId, 'remote-b');
    assert.equal(resumed.find(call => call.method === 'turn/start').params.model, 'beta-model');
    assert.equal(await page.evaluate(() => window.__checks.at(-1)), 'b');
    console.log('PASS: selected Provider supplies catalog and credentials despite unavailable global credentials');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
