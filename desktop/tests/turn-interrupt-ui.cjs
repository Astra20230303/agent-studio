const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
   localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: ['a','b'].map(id => ({ id, remoteId: id, title: `Thread ${id}`, status: 'running', messages: [], updatedAt: '' })) }));
   window.__calls = []; window.__finish = {};
   window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
   window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
    if (method === 'turn/interrupt') { window.__calls.push(params); return new Promise(resolve => { window.__finish[params.threadId] = resolve; }); }
    return { ok: true, result: method === 'thread/resume' ? { thread: { turns: [{ id: `turn-${params.threadId}`, status: 'inProgress', items: [] }] } } : { data: [] } };
   }, onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
  });
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  const stop = page.getByRole('button', { name: '停止生成', exact: true });
  await stop.waitFor();
  await stop.evaluate(el => { el.click(); el.click(); });
  await page.waitForFunction(() => window.__calls.length === 1);
  assert.equal(await stop.isDisabled(), true);
  await page.getByRole('button', { name: 'Thread b', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="停止生成"]')?.disabled === false);
  await stop.click();
  await page.waitForFunction(() => window.__calls.length === 2);
  await page.evaluate(() => window.__finish.a({ ok: false, error: 'A unavailable' }));
  assert.equal(await page.getByText(/A unavailable/).count(), 0);
  await page.evaluate(() => window.__finish.b({ ok: true, result: {} }));
  await page.getByRole('button', { name: 'Thread a', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'A unavailable' }).waitFor();
  await stop.click();
  await page.waitForFunction(() => window.__calls.length === 3);
  await page.evaluate(() => window.__finish.a({ ok: true, result: {} }));
  await page.getByText(/A unavailable/).waitFor({ state: 'detached' });
  assert.deepEqual(await page.evaluate(() => window.__calls), [{ threadId: 'a', turnId: 'turn-a' }, { threadId: 'b', turnId: 'turn-b' }, { threadId: 'a', turnId: 'turn-a' }]);
  await page.evaluate(() => window.__notify({ method: 'turn/completed', params: { threadId: 'a', turn: { id: 'turn-a', status: 'interrupted' } } }));
  await stop.waitFor({ state: 'detached' });
  console.log('PASS: interrupt locks are per turn, late errors stay with source conversation and retry waits for completion');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
