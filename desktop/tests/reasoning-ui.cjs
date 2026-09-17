const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__calls = []; const listeners = new Set(); window.__notify = message => listeners.forEach(fn => fn(message));
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'parent', model: 'test', threads: [{ id: 'parent', remoteId: 'parent', title: 'Parent', messages: [], status: 'completed', updatedAt: new Date().toISOString() }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), request: async (method, params) => { window.__calls.push({ method, params }); return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, cwd: 'D:/repo', turns: localStorage.getItem('agent-history-fixture') && params.threadId === 'parent' ? [{ id: 'history-turn', status: 'completed', items: [{ id: 'historic-activity', type: 'subAgentActivity', kind: 'completed', agentThreadId: 'history-child', agentPath: '/root/history' }] }] : [] } } : { data: [] } }; }, notify: async () => ({}), onNotification: fn => { listeners.add(fn); return () => listeners.delete(fn); }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'thread/resume'));

    const send = (method, params) => page.evaluate(({method,params}) => window.__notify({method,params:{threadId:'parent',turnId:'turn',...params}}), {method,params});
    await send('item/started', {item:{id:'r',type:'reasoning',summary:[],content:[]}});
    const panel = page.locator('details[aria-label="推理摘要"]');
    await panel.waitFor();
    assert.equal(await panel.getAttribute('open'), null);
    await panel.locator('summary').click();
    await panel.getByText('等待服务端提供推理摘要…', {exact:true}).waitFor();
    await send('item/reasoning/summaryTextDelta', {itemId:'r',summaryIndex:1,delta:'第二段'});
    await send('item/reasoning/summaryPartAdded', {itemId:'r',summaryIndex:0});
    await send('item/reasoning/summaryTextDelta', {itemId:'r',summaryIndex:0,delta:'第一段'});
    await panel.getByText('第一段', {exact:true}).waitFor();
    assert.deepEqual(await panel.locator('p').allTextContents(), ['第一段','第二段']);
    await send('item/completed', {item:{id:'r',type:'reasoning',summary:['最终摘要'],content:['RAW_CONTENT_SENTINEL']}});
    await panel.getByText('最终摘要', {exact:true}).waitFor();
    await send('item/reasoning/summaryTextDelta', {itemId:'r',summaryIndex:0,delta:'LATE_SENTINEL'});
    assert.equal(await panel.locator('p').textContent(), '最终摘要');
    assert.equal(await page.getByText(/RAW_CONTENT_SENTINEL|LATE_SENTINEL/).count(), 0);
    await panel.locator('summary').click();
    assert.equal(await panel.getByText('最终摘要', {exact:true}).isVisible(), false);
    console.log('PASS: full chat reasoning notifications, collapsed disclosure, ordered streaming and final replacement');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
