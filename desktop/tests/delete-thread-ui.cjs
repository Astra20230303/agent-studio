const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: [{ id: 'a', remoteId: 'remote-a', title: 'Delete target', status: 'completed', updatedAt: '', messages: [{ id: 'm', role: 'assistant', content: 'Preserved until success' }] }] }));
      window.__deletes = 0;
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async method => {
        if (method === 'thread/delete') { window.__deletes++; return new Promise(resolve => { window.__finishDelete = resolve; }); }
        return { ok: true, result: method === 'thread/resume' ? { thread: { turns: [] } } : { data: [] } };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const trigger = page.locator('.global-thread-toolbar').getByRole('button', { name: '删除', exact: true });
    await trigger.click();
    const dialog = page.getByRole('alertdialog');
    assert.equal(await dialog.getByRole('button', { name: '取消', exact: true }).evaluate(el => el === document.activeElement), true);
    await dialog.getByRole('button', { name: '删除', exact: true }).evaluate(el => { el.click(); el.click(); });
    await page.waitForFunction(() => window.__deletes === 1);
    assert.equal(await dialog.getByRole('button', { name: '取消', exact: true }).isDisabled(), true);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 1);
    await page.evaluate(() => window.__finishDelete({ ok: false, error: 'Delete unavailable' }));
    await dialog.getByRole('alert').filter({ hasText: 'Delete unavailable' }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.length), 1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1') || '[]').filter(item => item.action === '删除会话').length), 0);
    await dialog.getByRole('button', { name: '删除', exact: true }).click();
    await page.waitForFunction(() => window.__deletes === 2);
    await page.evaluate(() => window.__finishDelete({ ok: true, result: {} }));
    await dialog.waitFor({ state: 'detached' });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.length === 0);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).filter(item => item.action === '删除会话').length === 1);
    console.log('PASS: delete waits for acknowledgement, blocks duplicates/Escape, retains failures and retries once');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
