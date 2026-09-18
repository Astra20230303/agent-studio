const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeThreadId: 'a', threads: ['a', 'b'].map(id => ({ id, remoteId: `remote-${id}`, title: `Thread ${id}`, status: 'completed', updatedAt: '', messages: [{ id: `m-${id}`, role: 'assistant', content: `History ${id}` }] })) }));
      window.__archives = []; window.__resolvers = {};
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }) };
      window.codex = { connect: async () => ({ ok: true }), notify: async () => ({}), request: async (method, params) => {
        if (method === 'thread/archive') { window.__archives.push(params.threadId); return new Promise(resolve => { window.__resolvers[params.threadId] = resolve; }); }
        return { ok: true, result: method === 'thread/resume' ? { thread: { turns: [] } } : { data: [] } };
      }, onNotification: () => () => {}, onServerRequest: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {} };
    });
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    const toolbar = page.locator('.global-thread-toolbar');
    await toolbar.getByRole('button', { name: '归档', exact: true }).evaluate(el => { el.click(); el.click(); });
    await page.getByRole('button', { name: 'Thread a', exact: true }).getByRole('button', { name: '归档', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.__archives), ['remote-a']);
    await page.getByRole('button', { name: 'Thread b', exact: true }).click();
    await page.getByRole('textbox', { name: '消息', exact: true }).fill('Draft in b');
    await page.evaluate(() => window.__resolvers['remote-a']({ ok: true, result: {} }));
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t => t.id === 'a').archived);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).activeThreadId), 'b');
    assert.equal(await page.getByRole('textbox', { name: '消息', exact: true }).inputValue(), 'Draft in b');
    await page.getByText('History b', { exact: true }).waitFor();
    await toolbar.getByRole('button', { name: '归档', exact: true }).click();
    await page.waitForFunction(() => window.__resolvers['remote-b']);
    await page.evaluate(() => window.__resolvers['remote-b']({ ok: false, error: 'Archive unavailable' }));
    await page.getByText('归档失败：Archive unavailable', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('codex-desktop-state-v1')).threads.find(t => t.id === 'b').archived), undefined);
    await toolbar.getByRole('button', { name: '归档', exact: true }).click();
    await page.waitForFunction(() => window.__archives.length === 3);
    await page.evaluate(() => window.__resolvers['remote-b']({ ok: true, result: {} }));
    await toolbar.waitFor({ state: 'detached' });
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('codex-desktop-state-v1')).activeThreadId);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('felix-audit-log-v1')).filter(entry => entry.action === '归档会话').length), 2);
    console.log('PASS: shared archive lock prevents duplicates, preserves switched conversation and retries failure');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
