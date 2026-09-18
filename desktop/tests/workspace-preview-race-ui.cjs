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
    await page.evaluate(() => { delete window.__rejectRead; });
    await page.getByRole('button', { name: '刷新文件', exact: true }).click();
    await page.waitForFunction(() => !!window.__rejectRead);
    await page.evaluate(() => window.__renderPanel({ text: 'Saved after refresh', revision: 'newer' }));
    await page.locator('pre').getByText('Saved after refresh', { exact: true }).waitFor();
    await page.evaluate(() => window.__rejectRead(Error('late read failure')));
    assert.equal(await page.getByRole('alert').count(), 0);
    assert.equal(await page.locator('pre').textContent(), 'Saved after refresh');
    for (const extra of [{ truncated: true }, { encodingInvalid: true }, { binary: true }, { image: 'data:image/png;base64,AA==' }]) {
      await page.evaluate(extra => window.__renderPanel({ text: 'Not editable', revision: 'present', ...extra }), extra);
      await page.locator('pre').getByText('Not editable', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: '编辑文件', exact: true }).count(), 0);
      if (extra.encodingInvalid) await page.getByRole('status').getByText('文件包含无法按 UTF-8 解码的字符，预览使用替代字符，不能编辑。', { exact: true }).waitFor();
    }
    await page.getByRole('alert').getByText('图片无法解码，文件可能已损坏。请修复文件后刷新文件。', { exact: true }).waitFor();
    await page.evaluate(() => { delete window.__resolveRead; });
    await page.getByRole('button', { name: '刷新文件', exact: true }).click();
    await page.waitForFunction(() => !!window.__resolveRead);
    await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 8;
      window.__resolveRead({ ok: true, result: { image: canvas.toDataURL() } });
    });
    await page.waitForFunction(() => document.querySelector('.workspace-files img')?.naturalWidth === 8);
    assert.equal(await page.getByRole('alert').count(), 0);
    await page.evaluate(() => window.__renderPanel({ text: 'Valid text', revision: 'valid' }));
    await page.getByRole('button', { name: '编辑文件', exact: true }).waitFor();
    assert.equal(await page.getByRole('status').count(), 0);
    console.log('PASS: saved preview supersedes old reads; incomplete or nontext previews never expose editing');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
