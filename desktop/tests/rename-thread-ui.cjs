const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'remote-a', title: 'Original', status: 'completed', messages: [{ id: 'm', role: 'user', content: 'hello' }], updatedAt: '' }] }));
      window.__names = [];
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        if (method === 'thread/name/set') { window.__names.push(params); if (!window.__allow) return { ok: false, error: { message: 'Rename failed' } }; return new Promise(resolve => window.__finish = () => resolve({ ok: true, result: {} })); }
        return { ok: true, result: method === 'thread/resume' ? { thread: { id: params.threadId, turns: [] } } : { data: [] } };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '重命名', exact: true }).click();
    const input = page.getByRole('textbox', { name: '会话名称', exact: true });
    assert.equal(await input.inputValue(), 'Original');
    await input.fill('  '); assert.ok(await page.getByRole('button', { name: '保存名称', exact: true }).isDisabled());
    await input.fill('  New name  '); await page.getByRole('button', { name: '保存名称', exact: true }).click();
    await page.getByText('Rename failed', { exact: true }).waitFor();
    assert.equal(await input.inputValue(), '  New name  ');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads[0].title), 'Original');
    await page.evaluate(() => window.__allow = true);
    await page.getByRole('button', { name: '保存名称', exact: true }).click();
    await page.waitForFunction(() => !!window.__finish); await page.keyboard.press('Escape');
    assert.ok(await page.getByRole('dialog', { name: '重命名会话', exact: true }).isVisible());
    await page.evaluate(() => window.__finish());
    await page.getByRole('button', { name: 'New name', exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__names), [{ threadId: 'remote-a', name: 'New name' }, { threadId: 'remote-a', name: 'New name' }]);
    console.log('PASS: in-app rename validation, retained failed draft, retry, pending guard and sidebar update');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
