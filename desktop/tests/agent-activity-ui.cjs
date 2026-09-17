const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      window.__calls = [];
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'parent', model: 'test', threads: [{ id: 'parent', remoteId: 'parent', title: 'Parent', messages: [], status: 'completed', updatedAt: new Date().toISOString() }] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), request: async (method, params) => { window.__calls.push({ method, params }); return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, cwd: 'D:/repo', turns: [] } } : { data: [] } }; }, notify: async () => ({}), onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'thread/resume'));
    await page.evaluate(() => window.__notify({ method: 'item/completed', params: { threadId: 'parent', turnId: 'turn', item: { id: 'spawn', type: 'collabAgentToolCall', tool: 'spawnAgent', status: 'completed', prompt: 'Review tests', receiverThreadIds: ['child'], agentsStates: { child: { status: 'running' } } } } }));
    await page.getByText('最近状态：运行中', { exact: true }).waitFor();
    await page.getByRole('button', { name: '打开 Agent child', exact: true }).click();
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'thread/resume' && call.params.threadId === 'child'));
    await page.getByRole('button', { name: 'Parent', exact: true }).click();
    await page.getByRole('button', { name: '打开 Agent child', exact: true }).waitFor();
    assert.equal(await page.getByText('Review tests', { exact: true }).count(), 1);
    console.log('PASS: live child status, remote child navigation and preserved parent record');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
