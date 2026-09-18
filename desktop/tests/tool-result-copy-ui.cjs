const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.evaluate(async () => {
      const react = await import('/node_modules/.vite/deps/react.js');
      const client = await import('/node_modules/.vite/deps/react-dom_client.js');
      const { ToolResult } = await import('/src/ToolResult.tsx');
      const host = document.createElement('div'); host.id = 'copy-fixture'; document.body.append(host);
      const root = (client.default || client).createRoot(host);
      window.__renderResult = result => root.render((react.default || react).createElement(ToolResult, { result }));
      window.__copied = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copied.push(text); if (window.__fail) throw Error('Clipboard denied'); if (window.__delay) await new Promise(resolve => { window.__release = resolve; }); } } });
      window.__result = { content: [{ type: 'text', text: 'long output\n'.repeat(1000) }], structuredContent: { count: 1000, literal: '<script>plain text</script>' } };
      window.__renderResult(window.__result);
    });
    const host = page.locator('#copy-fixture');
    const copy = host.getByRole('button', { name: '复制工具结果', exact: true });
    await copy.click(); await host.getByText('已复制工具结果', { exact: true }).waitFor();
    await host.getByText('结构化结果', { exact: true }).click();
    assert.equal(await host.locator('details pre').innerText(), await page.evaluate(() => window.__copied[0]));
    assert.deepEqual(await page.evaluate(() => JSON.parse(window.__copied[0])), await page.evaluate(() => window.__result));
    await page.evaluate(() => { window.__fail = true; });
    await copy.click(); await host.getByText('复制失败：Clipboard denied', { exact: true }).waitFor();
    await page.evaluate(() => { window.__fail = false; window.__delay = true; });
    await copy.click();
    await host.getByRole('button', { name: '正在复制…', exact: true }).waitFor();
    await page.evaluate(() => window.__renderResult('Updated result'));
    await host.locator('details pre').getByText('Updated result', { exact: true }).waitFor();
    await page.evaluate(() => { window.__release(); window.__delay = false; });
    await copy.waitFor();
    assert.equal(await host.getByText('已复制工具结果', { exact: true }).count(), 0);
    await copy.click(); await host.getByText('已复制工具结果', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__copied.at(-1)), 'Updated result');
    for (const value of [null, false, 0, { content: [] }]) {
      await page.evaluate(value => window.__renderResult(value), value);
      await host.locator('details pre').filter({ hasText: JSON.stringify(value, null, 2) }).waitFor();
      await copy.click(); await host.getByText('已复制工具结果', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.__copied.at(-1)), JSON.stringify(value, null, 2));
    }
    console.log('PASS: full structured tool copy matches view, failure retries and delayed completion cannot label newer result copied');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
