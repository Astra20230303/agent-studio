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
   window.__preview = (line, revision, column, matchLength) => root.render(React.createElement(ArtifactPreview, { key: String(line) + revision, target: { root: 'D:/P', path: 'f.txt', line, revision, column, matchLength }, onClose: () => {}, onEdit: session => {
    window.__editLine = session.lineNumber ?? null;
    root.render(React.createElement(FileEditor, { ...session, onClose: () => root.render(null), onSaved: () => {} }));
   } }));
  });
  for (const [line, revision, expected, selected] of [[2,'disk',2,'中文🙂'],[2,'old',null,''],[99,'disk',null,'']]) {
   await page.evaluate(args => window.__preview(...args), [line, revision]);
   await page.getByRole('button', { name: '编辑此文件', exact: true }).click();
   const editor = page.getByRole('textbox', { name: '文件内容', exact: true }); await editor.waitFor();
   assert.equal(await page.evaluate(() => window.__editLine), expected);
   assert.equal(await editor.evaluate(node => node.value.slice(node.selectionStart, node.selectionEnd)), selected);
   assert.equal(await editor.inputValue(), 'first\n中文🙂\n');
   assert.equal(await page.getByRole('button', { name: '保存文件', exact: true }).isDisabled(), true);
   await editor.press('Escape'); await editor.waitFor({ state: 'detached' });
  }
  for (const action of ['jump', 'find']) {
   await page.evaluate(() => window.__preview(1, 'old'));
   const preview = page.getByRole('dialog', { name: '消息文件预览' });
   await preview.getByLabel('文件预览文本', { exact: true }).waitFor();
   if (action === 'jump') {
    await preview.getByRole('textbox', { name: '预览行号', exact: true }).fill('2');
    await preview.getByRole('button', { name: '跳转到行', exact: true }).click();
   } else {
    await preview.getByRole('button', { name: '查找预览内容', exact: true }).click();
    await preview.getByRole('textbox', { name: '查找预览内容', exact: true }).fill('中文');
   }
   await preview.getByRole('button', { name: '编辑此文件', exact: true }).click();
   const editor = page.getByRole('textbox', { name: '文件内容', exact: true }); await editor.waitFor();
   assert.equal(await page.evaluate(() => window.__editLine), 2);
   assert.equal(await editor.evaluate(node => node.value.slice(node.selectionStart, node.selectionEnd)), action === 'find' ? '中文' : '中文🙂');
   await editor.press('Escape'); await editor.waitFor({ state: 'detached' });
  }
  for (const refresh of [false, true]) {
   await page.evaluate(() => window.__preview(1, 'old'));
   const preview = page.getByRole('dialog', { name: '消息文件预览' });
   await preview.getByLabel('文件预览文本', { exact: true }).waitFor();
   await preview.getByRole('textbox', { name: '预览行号', exact: true }).fill('3');
   await preview.getByRole('button', { name: '跳转到行', exact: true }).click();
   await preview.getByRole('button', { name: '查找预览内容', exact: true }).click();
   await preview.getByRole('textbox', { name: '查找预览内容', exact: true }).fill('中文');
   await preview.getByRole('button', { name: '关闭预览查找', exact: true }).click();
   if (refresh) {
    await preview.getByRole('button', { name: '刷新预览', exact: true }).click();
    await preview.getByLabel('文件预览文本', { exact: true }).waitFor();
   }
   await preview.getByRole('button', { name: '编辑此文件', exact: true }).click();
   const editor = page.getByRole('textbox', { name: '文件内容', exact: true }); await editor.waitFor();
   assert.equal(await page.evaluate(() => window.__editLine), refresh ? null : 3);
   if (!refresh) assert.equal(await editor.evaluate(node => node.selectionStart), 'first\n中文🙂\n'.length);
   await editor.press('Escape'); await editor.waitFor({ state: 'detached' });
  }
  for (const [column, length, revision, expected] of [[3,2,'disk','🙂'],[99,2,'disk','中文🙂'],[1,999,'disk','中文🙂'],[3,2,'old','']]) {
   await page.evaluate(args => window.__preview(2, ...args), [revision, column, length]);
   await page.getByRole('button', { name: '编辑此文件', exact: true }).click();
   const editor = page.getByRole('textbox', { name: '文件内容', exact: true }); await editor.waitFor();
   assert.equal(await editor.evaluate(node => node.value.slice(node.selectionStart, node.selectionEnd)), expected);
   await editor.press('Escape'); await editor.waitFor({ state: 'detached' });
  }
  console.log('PASS: precise UTF-16 search selection, stale range exclusion, invalid range line fallback and current preview navigation');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
