const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__sent = [];
      window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({ ok: true }),
        request: async (method, params) => {
          if (method === 'thread/start') return { ok: true, result: { thread: { id: 'a' } } };
          if (method === 'turn/start') { window.__sent.push(params); return { ok: true, result: { turn: { id: 'turn', status: 'inProgress' } } }; }
          return { ok: true, result: { data: [] } };
        }, onNotification: fn => { window.__notify = fn; return () => {}; }, onClosed: () => () => {}, onServerRequest: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const mode = page.getByRole('combobox', { name: '协作模式' });
    await mode.selectOption('plan');
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Plan a feature');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__sent.length === 1);
    assert.deepEqual(await page.evaluate(() => window.__sent[0].collaborationMode), { mode: 'plan', settings: { model: 'test', reasoning_effort: 'low', developer_instructions: null } });
    assert.equal(await mode.isDisabled(), true);
    await page.evaluate(() => {
      window.__notify({ method: 'turn/plan/updated', params: { threadId: 'a', turnId: 'turn', explanation: 'Implementation outline', plan: [{ step: 'Inspect', status: 'completed' }, { step: 'Implement', status: 'inProgress' }] } });
      window.__notify({ method: 'item/completed', params: { threadId: 'a', turnId: 'turn', item: { type: 'plan', id: 'proposal', text: 'Proposed feature design' } } });
      window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id: 'turn', status: 'completed' } } });
    });
    await page.getByText('任务计划 · 1/2', { exact: true }).waitFor();
    await page.getByText('Proposed feature design', { exact: true }).waitFor();
    await page.getByRole('button', { name: '按计划执行', exact: true }).click();
    assert.equal(await mode.inputValue(), 'default');
    assert.equal(await page.evaluate(() => window.__sent.length), 1);
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__sent.length === 2);
    assert.equal(await page.evaluate(() => window.__sent[1].collaborationMode.mode), 'default');
    assert.deepEqual(errors, []);
    console.log('PASS: plan mode payload, locked active mode, plan events, reviewed transition to implementation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
