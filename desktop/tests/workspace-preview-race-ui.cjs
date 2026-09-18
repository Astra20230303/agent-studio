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
      const { WorkspaceFiles } = await import('/src/WorkspaceFiles.tsx');
      const host = document.createElement('div'); document.body.replaceChildren(host); const root = ReactDOM.createRoot(host);
      window.desktop = { workspaceFile: async input => input.action === 'list'
        ? { ok: true, result: { entries: [{ name: 'a.txt', path: 'a.txt', directory: false }] } }
        : new Promise((resolve, reject) => { window.__resolveRead = resolve; window.__rejectRead = reject; }) };
      window.__renderPanel = preview => root.render(React.createElement(WorkspaceFiles, {
        root: 'D:/test', onAttach: () => {}, onClose: () => {}, onEdit: () => {}, onPreview: () => {},
        previewUpdate: preview ? { root: 'D:/test', path: 'a.txt', preview } : undefined,
      }));
      window.__renderPanel();
    });
    await page.getByRole('button', { name: '▧ a.txt', exact: true }).click();
    await page.waitForFunction(() => !!window.__resolveRead);
    await page.evaluate(() => window.__renderPanel({ text: 'Saved latest', revision: 'new' }));
    await page.locator('pre').getByText('Saved latest', { exact: true }).waitFor();
    await page.evaluate(() => window.__resolveRead({ ok: true, result: { text: 'Old disk read', revision: 'old' } }));
    assert.equal(await page.locator('pre').textContent(), 'Saved latest');
    await page.getByRole('button', { name: '编辑文件', exact: true }).waitFor();
    for (const extra of [{ truncated: true }, { encodingInvalid: true }, { binary: true }, { image: 'data:image/png;base64,AA==' }]) {
      await page.evaluate(extra => window.__renderPanel({ text: 'Not editable', revision: 'present', ...extra }), extra);
      await page.locator('pre').getByText('Not editable', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '编辑文件', exact: true }).count(), 0);
    }
    console.log('PASS: saved preview supersedes old reads; incomplete or nontext previews never expose editing');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
