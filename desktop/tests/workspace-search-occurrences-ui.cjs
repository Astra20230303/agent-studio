const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { workspaceFile } = require('../electron/workspace-files.cjs');

(async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'felix-options-ui-'));
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    await fs.writeFile(path.join(root, 'sample.txt'), '😀 Needle needle\r\nneedle needle\r\n');
    const page = await browser.newPage();
    await page.exposeFunction('readWorkspace', async input => {
      try { return { ok: true, result: await workspaceFile(input.root, input.path, input.action, input.query, input.edit, input.searchOptions) }; }
      catch (error) { return { ok: false, error: error.message }; }
    });
    await page.addInitScript(root => {
      localStorage.setItem('codex-desktop-state-v1', JSON.stringify({ model: 'test', activeProjectId: 'p', projects: [{ id: 'p', path: root, name: 'Project', git: {} }], threads: [] }));
      window.desktop = { listModels: async () => ({ ok: true, models: ['test'] }), providerStatus: async () => ({ keyConfigured: true }), workspaceFile: input => window.readWorkspace(input) };
      window.codex = { connect: async () => ({ ok: true }), request: async () => ({ ok: true, result: { data: [] } }), notify: async () => ({}), onNotification: () => () => {}, onClosed: () => () => {}, onError: () => () => {}, onStderr: () => () => {}, onServerRequest: () => () => {} };
    }, root);
    await page.goto(process.env.FELIX_TEST_URL || 'http://127.0.0.1:5318');
    await page.getByRole('button', { name: '浏览工作区文件', exact: true }).click();

    await page.getByRole('combobox', { name: '文件搜索方式' }).selectOption('content');
    const input = page.getByRole('textbox', { name: '查找工作区文件' });
    await input.fill('needle');
    await input.press('Enter');
    const rows = page.locator('.workspace-file-row');
    await rows.nth(3).waitFor();
    assert.deepEqual(await rows.allTextContents(), [
      '▧ sample.txt:1:4 · 😀 Needle needle', '▧ sample.txt:1:11 · 😀 Needle needle',
      '▧ sample.txt:2:1 · needle needle', '▧ sample.txt:2:8 · needle needle',
    ]);
    await input.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    const inline = page.locator('.workspace-files pre mark[data-search-match]');
    await inline.waitFor();
    assert.equal(await inline.innerText(), 'needle');
    assert.equal(await inline.evaluate(el => el.previousSibling.textContent), '😀 Needle ');
    await page.getByRole('button', { name: '展开文件预览', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '消息文件预览' });
    const expanded = dialog.locator('mark[data-search-match]');
    await expanded.waitFor();
    assert.equal(await expanded.innerText(), 'needle');
    assert.equal(await expanded.evaluate(el => el.previousSibling.textContent), '😀 Needle ');
    await dialog.getByRole('button', { name: '查找预览内容', exact: true }).click();
    await dialog.getByRole('textbox', { name: '查找预览内容', exact: true }).fill('Needle');
    assert.equal(await expanded.count(), 0);
    await dialog.getByRole('button', { name: '关闭预览查找' }).click();
    await expanded.waitFor();
    await dialog.getByRole('textbox', { name: '预览行号' }).fill('2');
    await dialog.getByRole('button', { name: '跳转到行', exact: true }).click();
    assert.equal(await expanded.count(), 0);
    assert.equal(await dialog.locator('[aria-current=location]').getAttribute('data-line'), '2');
    await fs.writeFile(path.join(root, 'sample.txt'), 'changed needle');
    await dialog.getByRole('button', { name: '刷新预览', exact: true }).click();
    await dialog.getByText('文件在搜索后已变化，未定位旧搜索行；请重新搜索或手动跳转。', { exact: true }).waitFor();
    assert.equal(await expanded.count(), 0);
    assert.equal(await dialog.locator('[aria-current=location]').count(), 0);
    await dialog.getByRole('button', { name: '关闭预览', exact: true }).click();
    await page.getByRole('button', { name: '刷新文件', exact: true }).click();
    await page.getByText('文件在搜索后已变化，请返回并刷新搜索结果。', { exact: true }).waitFor();
    assert.equal(await inline.count(), 0);
    console.log('PASS: every occurrence, UTF-16 column, keyboard target, shared inline/modal range, manual navigation and stale revision clearing');
  } finally {
    await browser.close();
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
