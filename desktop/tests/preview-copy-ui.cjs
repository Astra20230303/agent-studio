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
      const { PreviewText } = await import('/src/PreviewText.tsx');
      const host = document.createElement('div'); document.body.replaceChildren(host);
      const root = ReactDOM.createRoot(host);
      window.__writes = [];
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (window.__fail) throw Error('denied'); window.__writes.push(text); } } });
      window.__render = (text, truncated = false) => root.render(React.createElement(PreviewText, { text, truncated, ref: React.createRef() }));
      window.__render('First\r\n中文🙂\nlast');
    });
    const pre = page.getByLabel('文件预览文本', { exact: true });
    const copy = page.getByRole('button', { name: '复制预览内容', exact: true });
    await copy.click();
    await page.getByRole('status').getByText('预览内容已复制', { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => window.__writes), ['First\r\n中文🙂\nlast']);
    assert.equal(await pre.textContent(), 'First\r\n中文🙂\nlast');
    await page.getByRole('button', { name: '查找预览内容', exact: true }).click();
    await page.getByRole('textbox', { name: '查找预览内容', exact: true }).fill('中文');
    await page.locator('mark').waitFor();
    assert.equal(await pre.textContent(), 'First\r\n中文🙂\nlast');
    await page.evaluate(() => { window.__fail = true; }); await copy.click();
    await page.getByRole('alert').getByText('复制失败，请检查剪贴板权限后重试。', { exact: true }).waitFor();
    await page.evaluate(() => { window.__fail = false; window.__render('prefix only', true); });
    await page.getByRole('button', { name: '复制已预览部分', exact: true }).click();
    await page.getByRole('status').getByText('已预览部分已复制', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__writes.at(-1)), 'prefix only');
    assert.equal(await pre.textContent(), 'prefix only');
    console.log('PASS: preview rendering and copying preserve exact text, highlighting, failed copy and explicit truncated scope');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
