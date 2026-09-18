const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.evaluate(async () => {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { TurnQueue } = await import('/src/TurnQueuePanel.tsx');
      const host = document.createElement('div'); document.body.replaceChildren(host);
      const root = ReactDOM.createRoot(host);
      window.__a = { id: 'a', localId: 'thread-a', threadId: 'remote-a', text: 'A', model: 'test', effort: 'low', plugins: [], status: 'paused' };
      window.__b = { ...window.__a, id: 'b', localId: 'thread-b', threadId: 'remote-b', text: 'B' };
      window.__saved = []; window.__resumed = 0;
      window.__renderQueue = items => root.render(React.createElement(TurnQueue, {
        items, disabled: false, onRemove: () => {}, onPause: () => {},
        onResume: () => window.__resumed++, onBeginEdit: () => true,
        onEdit: (...args) => { window.__saved.push(args); return true; },
      }));
      window.__renderQueue([window.__a]);
    });
    const editor = page.getByRole('dialog', { name: '编辑排队消息', exact: true });
    const resume = page.getByRole('button', { name: '继续队列', exact: true });
    await page.getByRole('button', { name: '编辑排队消息：A', exact: true }).click();
    await editor.getByRole('textbox').fill('unsaved A');
    assert.ok(await resume.isDisabled());
    await page.evaluate(() => window.__renderQueue([window.__b]));
    await editor.waitFor({ state: 'detached' });
    assert.equal(await resume.isDisabled(), false);
    await resume.click();
    assert.equal(await page.evaluate(() => window.__resumed), 1);
    await page.evaluate(() => window.__renderQueue([window.__a]));
    assert.equal(await editor.count(), 0, 'returning to a queue must not reopen a discarded editor');
    await page.getByRole('button', { name: '编辑排队消息：A', exact: true }).click();
    assert.equal(await editor.getByRole('textbox').inputValue(), 'A');
    await page.evaluate(() => window.__renderQueue([{ ...window.__a, status: 'sending' }, window.__b]));
    await editor.waitFor({ state: 'detached' });
    assert.equal(await resume.isDisabled(), false);
    assert.ok(await page.getByRole('button', { name: '编辑排队消息：A', exact: true }).isDisabled());
    assert.deepEqual(await page.evaluate(() => window.__saved), []);
    console.log('PASS: queue scope changes and sending transitions discard stale editors without saving or blocking another queue');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
