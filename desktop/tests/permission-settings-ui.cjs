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
          return { ok: true, result: method === 'thread/start' ? { thread: { id: 'permissions', turns: [] } } : method === 'turn/start' ? { turn: { id: 'turn', status: 'completed' } } : { data: [] } };
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
      await page.close();
    }
    console.log('PASS: all permission settings persist, match composer and reach thread/start');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
