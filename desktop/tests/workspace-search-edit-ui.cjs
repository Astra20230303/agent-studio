const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { workspaceFile } = require('../electron/workspace-files.cjs');
(async () => {
 const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-search-edit-'));
 const file = path.join(root, 'source.txt');
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 try {
  const source = 'header\r\n前缀🙂 needle 后缀\r\ntail\r\n';
  await fs.writeFile(file, source);
  const page = await browser.newPage();
  const writes = [];
  await page.exposeFunction('nativeFile', async input => {
   assert.equal(input.root, root);
   if (input.action === 'write') writes.push(input.edit);
   try { return { ok: true, result: await workspaceFile(root, input.path, input.action, input.query, input.edit, input.searchOptions) }; }
   catch (error) { return { ok: false, error: error.message }; }
  });
  await page.addInitScript(root => {
   localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ activeProjectId: 'p', projects: [{ id: 'p', name: 'Test', path: root, git: {} }], threads: [] }));
   window.desktop = { workspaceFile: input => window.nativeFile(input) };
  }, root);
  await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
  await page.getByRole('button', { name: '浏览工作区文件', exact: true }).click();
  const panel = page.getByRole('region', { name: '工作区文件', exact: true });
  await panel.getByRole('combobox', { name: '文件搜索方式' }).selectOption('content');
  const query = panel.getByRole('textbox', { name: '查找工作区文件', exact: true });
  await query.fill('needle'); await query.press('Enter');
  const rows = panel.locator('.workspace-file-row');
  await rows.first().click();
  await panel.getByRole('button', { name: '编辑文件', exact: true }).click();
  const editor = page.getByRole('textbox', { name: '文件内容', exact: true });
  assert.equal(await editor.evaluate(node => node.value.slice(node.selectionStart, node.selectionEnd)), 'needle');
  await page.keyboard.insertText('replacement');
  await editor.press('Control+s'); await editor.waitFor({ state: 'detached' });
  assert.equal(await fs.readFile(file, 'utf8'), source.replace('needle', 'replacement'));
  assert.equal(writes.length, 1);
  await panel.getByRole('button', { name: '返回目录', exact: true }).click();
  await query.fill('replacement'); await query.press('Enter');
  await rows.first().waitFor();
  await fs.writeFile(file, 'external\r\nchanged replacement\r\n');
  await rows.first().click();
  await panel.getByText('文件在搜索后已变化，请返回并刷新搜索结果。', { exact: true }).waitFor();
  await panel.getByRole('button', { name: '编辑文件', exact: true }).click();
  assert.equal(await editor.evaluate(node => node.selectionEnd - node.selectionStart), 0);
  assert.equal(await editor.inputValue(), 'external\nchanged replacement\n');
  await editor.fill('my merged draft');
  await fs.writeFile(file, 'even newer disk');
  await editor.press('Control+s');
  await page.getByRole('alert').filter({ hasText: '外部修改' }).waitFor();
  assert.equal(await editor.inputValue(), 'my merged draft');
  assert.equal(await fs.readFile(file, 'utf8'), 'even newer disk');
  console.log('PASS: real content search to selected edit and CRLF save, stale selection suppression and external-write protection');
 } finally { await browser.close(); await fs.rm(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
