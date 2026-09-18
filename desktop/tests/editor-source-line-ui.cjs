const { chromium } = require('playwright'); const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const page = await browser.newPage(); await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  await page.evaluate(async () => {
   const { default: React } = await import('/node_modules/.vite/deps/react.js');
   const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
   const { ArtifactPreview } = await import('/src/ArtifactPreview.tsx');
   const { FileEditor } = await import('/src/FileEditor.tsx');
   const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOM.createRoot(host);
   window.desktop = { workspaceFile: async () => ({ ok: true, result: { text: 'first\r\n中文🙂\r\n', revision: 'disk' } }) };
   window.__preview = (line, revision) => root.render(React.createElement(ArtifactPreview, { key: String(line) + revision, target: { root: 'D:/P', path: 'f.txt', line, revision }, onClose: () => {}, onEdit: session => {
    window.__editLine = session.lineNumber ?? null;
    root.render(React.createElement(FileEditor, { ...session, onClose: () => root.render(null), onSaved: () => {} }));
   } }));
  });
  for (const [line, revision, expected, selected] of [[2,'disk',2,'中文🙂'],[2,'old',null,''],[99,'disk',99,'']]) {
   await page.evaluate(args => window.__preview(...args), [line, revision]);
   await page.getByRole('button', { name: '编辑此文件', exact: true }).click();
   const editor = page.getByRole('textbox', { name: '文件内容', exact: true }); await editor.waitFor();
   assert.equal(await page.evaluate(() => window.__editLine), expected);
   assert.equal(await editor.evaluate(node => node.value.slice(node.selectionStart, node.selectionEnd)), selected);
   assert.equal(await editor.inputValue(), 'first\n中文🙂\n');
   assert.equal(await page.getByRole('button', { name: '保存文件', exact: true }).isDisabled(), true);
   await editor.press('Escape'); await editor.waitFor({ state: 'detached' });
  }
  console.log('PASS: source line survives preview editing, CRLF selection is exact, stale and out-of-range positions do not mis-select');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
