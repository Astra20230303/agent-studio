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
      const { CopyText } = await import('/src/CopyText.tsx');
      const host = document.createElement('div'); document.body.replaceChildren(host);
      const root = ReactDOM.createRoot(host);
      window.__writes = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: text => {
        window.__writes.push(text); return new Promise((resolve, reject) => { window.__resolve = resolve; window.__reject = reject; });
      } } });
      window.__renderCopy = source => root.render(React.createElement(CopyText, { source, label: '复制内容' }));
      window.__renderCopy('old');
    });
    const button = page.getByRole('button', { name: '复制内容', exact: true });
    await button.waitFor();
    await button.evaluate(element => { element.click(); element.click(); });
    assert.deepEqual(await page.evaluate(() => window.__writes), ['old']);
    assert.ok(await button.isDisabled());
    assert.equal(await button.getAttribute('aria-busy'), 'true');
    await page.evaluate(() => window.__renderCopy('new'));
    assert.ok(await button.isDisabled());
    await page.evaluate(() => window.__resolve());
    await page.waitForFunction(() => !document.querySelector('button').disabled);
    assert.equal(await button.textContent(), '复制内容');
    await button.click();
    assert.deepEqual(await page.evaluate(() => window.__writes), ['old', 'new']);
    await page.evaluate(() => window.__reject(Error('denied')));
    await page.getByRole('alert').waitFor();
    assert.equal(await button.isDisabled(), false);
    await button.click(); await page.evaluate(() => window.__resolve());
    await page.getByRole('status').getByText('内容已复制', { exact: true }).waitFor();
    assert.equal(await page.getByRole('alert').count(), 0);
    await button.click();
    await page.evaluate(() => window.__renderCopy('latest'));
    await page.getByRole('status').getByText('正在复制…', { exact: true }).waitFor();
    await page.evaluate(() => window.__reject(Error('old failure')));
    await page.waitForFunction(() => !document.querySelector('button').disabled);
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.equal(await button.textContent(), '复制内容');
    await button.click(); await page.evaluate(() => window.__resolve());
    await page.getByRole('status').getByText('内容已复制', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__writes.at(-1)), 'latest');
    console.log('PASS: duplicate writes blocked, source changes retain pending lock, stale completion ignored and failed writes retry');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
