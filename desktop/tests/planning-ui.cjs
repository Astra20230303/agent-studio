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
        }, onNotification: fn => { const listeners=window.__listeners ||= []; listeners.push(fn); window.__notify=message=>listeners.forEach(listener=>listener(message)); return () => { const index=listeners.indexOf(fn); if(index>=0)listeners.splice(index,1); }; }, onClosed: () => () => {}, onServerRequest: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button',{name:'会话设置',exact:true}).click();
    const mode = page.getByRole('combobox', { name: '协作模式' });
    await mode.selectOption('plan');
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Plan a feature');
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__sent.length === 1);
    assert.deepEqual(await page.evaluate(() => window.__sent[0].collaborationMode), { mode: 'plan', settings: { model: 'test', reasoning_effort: 'low', developer_instructions: null } });
    await page.getByRole('button',{name:'会话设置',exact:true}).click();
    assert.equal(await mode.isDisabled(), true);
    await page.getByRole('button',{name:'关闭会话设置',exact:true}).click();
    await page.evaluate(() => {
      window.__notify({ method: 'turn/plan/updated', params: { threadId: 'a', turnId: 'turn', explanation: 'Implementation outline', plan: [{ step: 'Inspect', status: 'completed' }, { step: 'Implement', status: 'inProgress' }] } });
      window.__notify({ method: 'item/completed', params: { threadId: 'a', turnId: 'turn', item: { type: 'plan', id: 'proposal', text: 'Proposed feature design' } } });
      window.__notify({ method: 'turn/plan/updated', params: { threadId: 'a', turnId: 'turn', plan: [{ step: 'Unexpected replacement', status: 'completed' }, { step: 'Broken', status: 'unknown' }] } });
      window.__notify({ method: 'item/completed', params: { threadId: 'a', turnId: 'turn', item: { type: 'plan', id: 'proposal', text: {} } } });
      window.__notify({ method: 'item/completed', params: { threadId: 'a', turnId: 'turn', item: { type: 'plan', text: 'Missing identity' } } });
      window.__notify({ method: 'item/completed', params: { threadId: 'a', turnId: 'turn', item: { type: 'plan', id: 'proposal', text: 'Proposed feature design' } } });
      window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id: 'turn', status: 'completed' } } });
    });
    await page.getByText('任务计划 · 1/2', { exact: true }).waitFor();
    await page.getByText('Proposed feature design', { exact: true }).waitFor();
    assert.equal(await page.getByText('Proposed feature design', { exact: true }).count(), 1);
    assert.equal(await page.getByText('Missing identity', { exact: true }).count(), 0);
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Unsent review notes');
    await page.getByRole('button',{name:'会话设置',exact:true}).click();
    assert.equal(await page.getByRole('button', { name: '按计划执行', exact: true }).isDisabled(), true);
    await page.getByRole('button',{name:'关闭会话设置',exact:true}).click();
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('');
    await page.getByRole('button',{name:'会话设置',exact:true}).click();
    await page.getByRole('button', { name: '按计划执行', exact: true }).click();
    assert.equal(await mode.inputValue(), 'default');
    assert.equal(await page.evaluate(() => window.__sent.length), 1);
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await page.waitForFunction(() => window.__sent.length === 2);
    assert.equal(await page.evaluate(() => window.__sent[1].collaborationMode.mode), 'default');
    await page.evaluate(() => {
      window.__notify({ method: 'turn/started', params: { threadId: 'a', turn: { id: 'new-turn' } } });
      window.__notify({ method: 'item/completed', params: { threadId: 'a', turnId: 'turn', item: { type: 'plan', id: 'proposal', text: 'Stale proposal' } } });
      window.__notify({ method: 'turn/plan/updated', params: { threadId: 'a', turnId: 'turn', plan: [{ step: 'Stale plan', status: 'inProgress' }] } });
    });
    await page.locator('.plan-panel').filter({hasText:'任务计划'}).waitFor({ state: 'hidden' });
    await page.getByText('Proposed feature design', { exact: true }).waitFor();
    assert.equal(await page.getByText('Stale proposal', { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: plan mode payload, locked active mode, plan events, reviewed transition to implementation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
