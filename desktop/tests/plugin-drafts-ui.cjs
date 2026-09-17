const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ mode: 'work', model: 'test', activeThreadId: 'a', threads: ['a', 'b'].map(id => ({ id, remoteId: id, title: 'Chat ' + id, messages: [], status: 'completed', updatedAt: '' })) }));
        localStorage.setItem('felix-plugin-drafts-v1', JSON.stringify({ a: [{ id: 'a@local', name: 'Plugin A' }], b: [{ id: 'b@local', name: 'Plugin B' }] }));
      }
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        if (method === 'turn/start') { window.__input = params.input; return new Promise(resolve => window.__finish = () => resolve({ ok: true, result: { turn: { id: 'turn', status: 'completed' } } })); }
        return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, turns: [] } } : { data: [], marketplaces: [] } };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const chips = page.getByLabel('本次使用的插件');
    await chips.getByText('Plugin A', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Chat b', exact: true }).click();
    await chips.getByText('Plugin B', { exact: true }).waitFor();
    await page.reload(); await chips.getByText('Plugin B', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Chat a', exact: true }).click();
    await chips.getByText('Plugin A', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Use selected plugin');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => !!window.__finish);
    assert.ok(await page.evaluate(() => window.__input.some(item => item.type === 'mention' && item.path === 'plugin://a@local')));
    await page.getByRole('button', { name: 'Chat b', exact: true }).click();
    await page.evaluate(() => window.__finish());
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('felix-plugin-drafts-v1')).a);
    await chips.getByText('Plugin B', { exact: true }).waitFor();
    console.log('PASS: independent persisted plugin drafts and delayed source-only send cleanup');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
