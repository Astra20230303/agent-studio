const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5329');
    await page.evaluate(async () => {
      const React = (await import('/node_modules/.vite/deps/react.js')).default;
      const ReactDOM = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
      const { createThreadMutations } = await import('/src/threadMutations.ts');
      const { unarchiveThread } = await import('/src/codexClient.ts');
      const { ArchivedThreads } = await import('/src/ArchivedThreads.tsx');
      window.__calls = []; window.__restored = []; window.__closed = 0;
      window.codex = { request: async (method, params) => {
        window.__calls.push({ method, params });
        if (method === 'thread/unarchive') return await new Promise(resolve => { window.__release = resolve; });
        return { ok: true, result: { data: [] } };
      } };
      const host = document.createElement('div'); document.body.append(host);
      const root = ReactDOM.createRoot(host);
      window.__renderArchive = connected => root.render(React.createElement(ArchivedThreads, {
        connected, threads: [{ id: 'a', remoteId: 'a', title: 'A', archived: true, messages: [] }],
        onRestore: async thread => { await createThreadMutations({restore:unarchiveThread}, mutate => { const state={threads:[]}; mutate(state); window.__restored.push(state.threads[0].id); }).restore(thread); }, onClose: () => window.__closed++,
      }));
      window.__renderArchive(true);
    });
    const restore = page.getByRole('button', { name: '恢复 A', exact: true });
    const close = page.getByRole('button', { name: '关闭归档会话', exact: true });
    await restore.click();
    await page.waitForFunction(() => !!window.__release);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => window.__closed), 0);
    assert.ok(await close.isDisabled());
    await page.evaluate(() => window.__renderArchive(false));
    await page.getByText('未连接，远端归档暂不可用。').waitFor();
    await page.evaluate(() => window.__renderArchive(true));
    await page.getByText('未连接，远端归档暂不可用。').waitFor({ state: 'hidden' });
    assert.ok(await restore.isDisabled());
    assert.equal(await page.evaluate(() => window.__calls.filter(c => c.method === 'thread/unarchive').length), 1);
    await page.evaluate(() => window.__release({ ok: false, error: 'Restore rejected' }));
    await page.getByRole('alert').filter({ hasText: 'Restore rejected' }).waitFor();
    assert.ok(await close.isEnabled());
    await restore.click();
    await page.waitForFunction(() => window.__calls.filter(c => c.method === 'thread/unarchive').length === 2);
    await page.evaluate(() => window.__release({ ok: true, result: {} }));
    await page.waitForFunction(() => window.__restored.length === 1);
    await close.click();
    assert.equal(await page.evaluate(() => window.__closed), 1);
    console.log('PASS: restore blocks close/Escape across reconnect, failure unlocks retry, successful restore notifies once');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
