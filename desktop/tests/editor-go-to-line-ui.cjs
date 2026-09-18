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
   const { FileEditor } = await import('/src/FileEditor.tsx');
   const host = document.createElement('div'); document.body.appendChild(host);
   const source = Array.from({ length: 100 }, (_, index) => 'line ' + (index + 1)).join('\n') + '\n';
   ReactDOM.createRoot(host).render(React.createElement(FileEditor, { root: 'D:/Project', path: 'test.txt', initial: { text: source, revision: 'r' }, onClose: () => {}, onSaved: () => {} }));
  });
  const dialog = page.getByRole('dialog', { name: '编辑工作区文件' });
  const editor = dialog.getByRole('textbox', { name: '文件内容', exact: true });
  const line = dialog.getByRole('textbox', { name: '编辑行号', exact: true });
  await editor.press('Control+g');
  assert.equal(await line.evaluate(node => node === document.activeElement), true);
  await line.fill('90'); await line.press('Enter');
  assert.equal(await editor.evaluate(node => node.value.slice(node.selectionStart, node.selectionEnd)), 'line 90');
  assert.equal(await editor.evaluate(node => node === document.activeElement && node.scrollTop > 0), true);
  assert.equal(await dialog.getByRole('button', { name: '保存文件', exact: true }).isDisabled(), true);
  assert.equal(await dialog.getByRole('button', { name: '撤销编辑', exact: true }).isDisabled(), true);
  for (const invalid of ['0', '102', '1.5', '1e1', '-1']) {
   await line.fill(invalid); await line.press('Enter');
   await dialog.getByText('请输入 1 至 101 的编辑行号。', { exact: true }).waitFor();
   assert.equal(await editor.evaluate(node => node.value.slice(node.selectionStart, node.selectionEnd)), 'line 90');
  }
  await line.fill('101'); await line.press('Enter');
  assert.equal(await editor.evaluate(node => node.selectionStart === node.value.length && node.selectionEnd === node.value.length), true);
  await editor.fill('中文🙂\n\nlast');
  await line.fill('2'); await line.press('Enter');
  assert.deepEqual(await editor.evaluate(node => [node.selectionStart, node.selectionEnd]), [5, 5]);
  await editor.press('Control+z');
  assert.equal(await editor.inputValue(), Array.from({ length: 100 }, (_, index) => 'line ' + (index + 1)).join('\n') + '\n');
  await editor.press('Control+g');
  await line.fill('1');
  await line.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true, bubbles: true });
  assert.equal(await line.evaluate(node => node === document.activeElement), true);
  await editor.fill('');
  await line.fill('1'); await line.press('Enter');
  assert.deepEqual(await editor.evaluate(node => [node.selectionStart, node.selectionEnd]), [0, 0]);
  assert.equal(await editor.inputValue(), '');
  await line.fill('2'); await line.press('Enter');
  await dialog.getByText('请输入 1 至 1 的编辑行号。', { exact: true }).waitFor();
  const longDraft = Array.from({ length: 80 }, () => 'filler').join('\n') + '\n\t' + '中文🙂long '.repeat(120) + 'TARGET';
  await editor.fill(longDraft);
  await editor.press('Control+f');
  const find = dialog.getByRole('textbox', { name: '查找编辑内容', exact: true });
  await find.fill('TARGET');
  assert.equal(await editor.evaluate(node => node.value.slice(node.selectionStart, node.selectionEnd)), 'TARGET');
  assert.equal(await editor.evaluate(node => node.scrollLeft > 0 && node.scrollTop > 0), true);
  assert.equal(await find.evaluate(node => node === document.activeElement), true);
  await find.fill('filler');
  assert.equal(await editor.evaluate(node => node.scrollLeft), 0);
  assert.equal(await editor.evaluate(node => node.scrollTop), 0);
  console.log('PASS: line navigation and long Unicode/tab search selections scroll into view without stealing focus');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
