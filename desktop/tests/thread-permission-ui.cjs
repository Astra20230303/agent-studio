const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', permission: 'on-request', activeThreadId: 'saved', threads: [{ id: 'saved', remoteId: 'remote-saved', title: 'Saved', messages: [], status: 'completed', updatedAt: new Date().toISOString() }] }));
      window.__calls = []; window.__listeners = []; window.__fail = false;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }) };
      window.__emit = message => window.__listeners.forEach(fn => fn(message));
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'thread/settings/update' && window.__fail) return { ok: false, error: 'Policy rejected' };
        return { ok: true, result: method === 'thread/resume' ? { thread: { id: 'remote-saved', turns: [] }, sandbox: { type: 'readOnly' }, approvalPolicy: 'on-request', approvalsReviewer: 'user' } : { data: [] } };
      }, onNotification: fn => { window.__listeners.push(fn); return () => { window.__listeners = window.__listeners.filter(listener => listener !== fn); }; }, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '只读 · 用户审批', exact: true }).click();
    await page.getByRole('button', { name: '当前会话：完全访问权限', exact: true }).click();
    await page.getByRole('button', { name: '权限待确认', exact: true }).waitFor();
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Do not send before settings are confirmed');
    assert.equal(await page.getByRole('button', { name: '发送', exact: true }).isDisabled(), true);
    const request = await page.evaluate(() => window.__calls.find(call => call.method === 'thread/settings/update'));
    assert.deepEqual(request.params, { threadId: 'remote-saved', sandboxPolicy: { type: 'dangerFullAccess' }, approvalPolicy: 'never', approvalsReviewer: 'user' });
    await page.evaluate(() => window.__emit({ method: 'thread/settings/updated', params: { threadId: 'other', threadSettings: { sandboxPolicy: { type: 'workspaceWrite' }, approvalPolicy: 'on-request', approvalsReviewer: 'auto_review' } } }));
    await page.getByRole('button', { name: '权限待确认', exact: true }).waitFor();
    await page.evaluate(() => window.__emit({ method: 'thread/settings/updated', params: { threadId: 'remote-saved', threadSettings: { sandboxPolicy: { type: 'dangerFullAccess' }, approvalPolicy: 'never', approvalsReviewer: 'user' } } }));
    await page.getByRole('button', { name: '完全访问 · 不请求审批', exact: true }).waitFor();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === '发送')?.disabled);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).permission), 'on-request');
    await page.evaluate(() => { window.__fail = true; });
    await page.getByRole('button', { name: '完全访问 · 不请求审批', exact: true }).click();
    await page.getByRole('button', { name: '当前会话：按需审批', exact: true }).click();
    await page.getByText('修改权限失败：Policy rejected', { exact: true }).waitFor();
    await page.getByRole('button', { name: '权限待确认', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__listeners.length), 1);
    await page.evaluate(() => window.__emit({ method: 'turn/started', params: { threadId: 'remote-saved', turn: { id: 'running', status: 'inProgress' } } }));
    await page.getByRole('button', { name: '权限待确认', exact: true }).click();
    for (const name of ['当前会话：按需审批', '当前会话：帮我审批', '当前会话：完全访问权限']) assert.equal(await page.getByRole('button', { name, exact: true }).isDisabled(), true);
    console.log('PASS: current-thread mutation waits for matching notification, blocks send, preserves defaults and handles rejection');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
