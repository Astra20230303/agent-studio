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
    await fs.mkdir(path.join(root, 'src'));
    await fs.writeFile(path.join(root, 'sample.txt'), 'needle');
    await fs.writeFile(path.join(root, 'src', 'sample.txt'), 'needle');
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

    const panel = page.getByRole('region', { name: '工作区文件', exact: true });
    const input = page.getByRole('textbox', { name: '查找工作区文件' });
    const mode = page.getByRole('combobox', { name: '文件搜索方式' });
    const scope = page.getByRole('combobox', { name: '文件搜索范围' });
    const rows = page.locator('.workspace-file-row');
    await panel.getByRole('button', { name: '▸ src', exact: true }).click();
    await panel.getByText('src', { exact: true }).waitFor();
    for (const searchMode of ['name', 'content']) {
      await mode.selectOption(searchMode);
      await input.fill(searchMode === 'name' ? 'sample' : 'needle');
      await input.press('Enter');
      await page.waitForFunction(() => document.querySelectorAll('.workspace-file-row').length === 2);
      await input.press('ArrowDown');
      await scope.selectOption('directory');
      await page.waitForFunction(() => document.querySelectorAll('.workspace-file-row').length === 1);
      assert.match(await rows.innerText(), /src[\\/]sample.txt/);
      assert.equal(await panel.locator('[aria-current=true]').count(), 0);
      await rows.click();
      await panel.locator('pre').waitFor();
      assert.match(await panel.locator('pre').innerText(), /needle/);
      await panel.getByRole('button', { name: '返回目录', exact: true }).click();
      await rows.waitFor();
      await fs.writeFile(path.join(root, 'src', 'sample-new.txt'), 'needle');
      await input.press('Enter');
      await page.waitForFunction(() => document.querySelectorAll('.workspace-file-row').length === 2);
      await fs.unlink(path.join(root, 'src', 'sample-new.txt'));
      await input.press('Enter');
      await page.waitForFunction(() => document.querySelectorAll('.workspace-file-row').length === 1);
      await scope.selectOption('workspace');
      await page.waitForFunction(() => document.querySelectorAll('.workspace-file-row').length === 2);
    }
    await scope.selectOption('directory');
    await page.waitForFunction(() => document.querySelectorAll('.workspace-file-row').length === 1);
    await panel.getByRole('button', { name: '清除文件查找', exact: true }).click();
    await panel.getByText('src', { exact: true }).waitFor();
    await panel.getByRole('button', { name: '上级目录', exact: true }).click();
    await panel.getByText('.', { exact: true }).waitFor();
    await input.fill('needle');
    await input.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.workspace-file-row').length === 2);
    await panel.getByRole('button', { name: '清除文件查找', exact: true }).click();
    await panel.getByRole('button', { name: '▸ src', exact: true }).click();
    await panel.getByText('src', { exact: true }).waitFor();
    await fs.mkdir(path.join(root, 'src', 'nested'));
    await fs.writeFile(path.join(root, 'src', 'nested', 'child.txt'), 'needle');
    await input.fill('needle');
    await input.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.workspace-file-row').length === 2);
    assert.match((await rows.allTextContents()).join('\n'), /nested[\\/]child.txt/);
    await fs.rename(path.join(root, 'src'), path.join(root, 'moved'));
    await input.press('Enter');
    await panel.getByRole('alert').waitFor();
    assert.equal(await rows.count(), 0);
    await fs.rename(path.join(root, 'moved'), path.join(root, 'src'));
    await input.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.workspace-file-row').length === 2);
    assert.equal(await panel.getByRole('alert').count(), 0);
    console.log('PASS: name/content directory scope, root-relative preview, scope reset, repeated Enter refresh and parent directory anchor');
  } finally {
    await browser.close();
    await fs.rm(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
