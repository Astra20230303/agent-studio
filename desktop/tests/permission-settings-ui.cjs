const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [label, sandbox, approvalPolicy, reviewer] of [['按需审批', 'read-only', 'on-request', undefined], ['帮我审批', 'workspace-write', 'on-request', 'auto_review'], ['完全访问权限', 'danger-full-access', 'never', undefined]]) {
      const page = await browser.newPage();
      await page.addInitScript(() => {
        if (!localStorage.getItem('codex-desktop-state-v1')) localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', projects: [], threads: [] }));
        window.__calls = [];
        window.desktop = { providerStatus: async () => ({ keyConfigured: true }), listModels: async () => ({ ok: true, models: ['test'] }) };
        window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
          window.__calls.push({ method, params });
          if (method === 'thread/start') {
            window.__effective = { thread: { id: 'permissions', turns: [] }, sandbox: { type: params.sandbox === 'danger-full-access' ? 'dangerFullAccess' : 'readOnly' }, approvalPolicy: params.approvalPolicy, approvalsReviewer: params.approvalsReviewer || 'user' };
            return { ok: true, result: window.__effective };
          }
          return { ok: true, result: method === 'thread/resume' ? window.__effective : method === 'turn/start' ? { turn: { id: 'turn', status: 'completed' } } : { data: [] } };
        }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
      });
      await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
      await page.getByRole('button', { name: '设置', exact: true }).click();
      await page.getByRole('radio', { name: label, exact: true }).check();
      await page.getByRole('button', { name: /返回应用/ }).click();
      await page.reload();
      await page.getByRole('button', { name: label, exact: true }).waitFor();
      await page.getByRole('textbox', { name: '消息', exact: true }).fill('Check permissions');
      await page.getByRole('button', { name: '发送', exact: true }).click();
      await page.waitForFunction(() => window.__calls.some(call => call.method === 'thread/start'));
      const params = await page.evaluate(() => window.__calls.find(call => call.method === 'thread/start').params);
      assert.equal(params.sandbox, sandbox); assert.equal(params.approvalPolicy, approvalPolicy); assert.equal(params.approvalsReviewer, reviewer);
      const effectiveLabel = sandbox === 'danger-full-access' ? '完全访问 · 不请求审批' : reviewer ? '只读 · 自动审查' : '只读 · 用户审批';
      await page.getByRole('button', { name: effectiveLabel, exact: true }).waitFor();
      if (reviewer) await page.getByRole('status').filter({ hasText: '当前会话实际为只读' }).waitFor();
      await page.getByRole('button', { name: effectiveLabel, exact: true }).click();
      await page.getByText(/下面的选择仅用于新会话/).waitFor();
      await page.locator('.permission-menu button').filter({ hasText: '完全访问权限' }).click();
      await page.getByRole('button', { name: effectiveLabel, exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__calls.filter(call => call.method === 'thread/start').length), 1);
      await page.close();
    }
    // Restoring a thread must replace stale persisted permissions, even if the
    // response does not include a usable permission profile.
    for (const known of [true, false, 'failure']) {
      const page = await browser.newPage();
      await page.addInitScript(known => {
        localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ permission: 'danger-full-access', activeThreadId: 'saved', threads: [{ id: 'saved', remoteId: 'remote-saved', title: 'Saved', messages: [], status: 'completed', effectivePermissions: { sandbox: 'dangerFullAccess', approvalPolicy: 'never', reviewer: 'user' }, updatedAt: new Date().toISOString() }] }));
        window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
        window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async method => method === 'thread/resume' && known === 'failure' ? { ok: false, error: 'Resume unavailable' } : ({ ok: true, result: method === 'thread/resume' ? { thread: { id: 'remote-saved', turns: [] }, ...(known ? { sandbox: { type: 'workspaceWrite' }, approvalPolicy: 'on-request', approvalsReviewer: 'auto_review' } : {}) } : { data: [] } }), onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
      }, known);
      await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
      await page.getByRole('button', { name: known === true ? '工作区写入 · 自动审查' : '权限待确认', exact: true }).waitFor();
      if (known === 'failure') await page.getByText('恢复线程失败：Resume unavailable', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '完全访问 · 不请求审批', exact: true }).count(), 0);
      await page.close();
    }
    console.log('PASS: defaults, effective permissions, downgrade notice, existing-thread isolation, restored permissions and missing-field fallback');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
