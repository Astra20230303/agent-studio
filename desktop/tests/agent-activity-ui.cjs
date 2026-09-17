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
      window.codex = { connect: async () => ({ ok: true }), request: async (method, params) => { window.__calls.push({ method, params }); return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, cwd: 'D:/repo', turns: localStorage.getItem('agent-history-fixture') && params.threadId === 'parent' ? [{ id: 'history-turn', status: 'completed', items: [{ id: 'historic-activity', type: 'subAgentActivity', kind: 'completed', agentThreadId: 'history-child', agentPath: '/root/history' }] }] : [] } } : { data: [] } }; }, notify: async () => ({}), onNotification: fn => { window.__notify = fn; return () => {}; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
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
    await page.evaluate(() => window.__notify({ method: 'item/completed', params: { threadId: 'parent', turnId: 'turn', item: { id: 'spawn', type: 'collabAgentToolCall', status: 'completed', agentsStates: { child: { status: 'completed', message: 'Verified child result' } } } } }));
    await page.getByText('Verified child result', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '打开 Agent child', exact: true }).count(), 1);
    for (const kind of ['started', 'interacted', 'interrupted', 'completed']) {
      await page.evaluate(kind => window.__notify({ method: 'item/completed', params: { threadId: 'parent', turnId: 'turn', item: { id: `activity-${kind}`, type: 'subAgentActivity', kind, agentThreadId: 'activity-child', agentPath: '/root/reviewer' } } }), kind);
    }
    for (const label of ['子 Agent 已启动', '子 Agent 有新交互', '子 Agent 已中断', '子 Agent 已完成']) await page.getByText(label, { exact: true }).waitFor();
    await page.getByRole('button', { name: '打开 Agent activity-child', exact: true }).first().click();
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'thread/resume' && call.params.threadId === 'activity-child'));
    await page.getByRole('button', { name: 'Parent', exact: true }).click();
    await page.getByText('子 Agent 已启动', { exact: true }).waitFor();
    await page.getByRole('button', { name: '切换侧栏' }).count().then(async count => { if (count) await page.getByRole('button', { name: '切换侧栏' }).click(); });
    await page.setViewportSize({ width: 960, height: 720 });
    await page.evaluate(() => window.__notify({ method: 'item/completed', params: { threadId: 'parent', turnId: 'turn', item: { id: 'long', type: 'collabAgentToolCall', tool: 'wait', status: 'completed', receiverThreadIds: ['child-' + 'x'.repeat(200)], agentsStates: {} } } }));
    const longButton = page.getByRole('button', { name: /^打开 Agent child-x/ });
    await longButton.waitFor();
    assert.ok(await longButton.evaluate(node => node.scrollWidth <= node.clientWidth + 1));
    await page.evaluate(() => localStorage.setItem('agent-history-fixture', 'true'));
    await page.reload();
    await page.getByText('/root/history', { exact: true }).waitFor();
    assert.equal(await page.getByText('子 Agent 已完成', { exact: true }).count(), 1);
    await page.getByRole('button', { name: '打开 Agent history-child', exact: true }).click();
    await page.waitForFunction(() => window.__calls.some(call => call.method === 'thread/resume' && call.params.threadId === 'history-child'));
    console.log('PASS: live child lifecycle, navigation, parent records and restored historical activity');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
